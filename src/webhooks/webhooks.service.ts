import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import * as crypto from 'crypto';

@Injectable()
export class WebhooksService {
  private readonly logger = new Logger(WebhooksService.name);
  private readonly MAX_RETRIES = 2; // 1 initial + 1 retry (meets AC)

  constructor(
    private prisma: PrismaService,
    private httpService: HttpService,
  ) {}

  async registerWebhook(data: {
    issuerAddress: string;
    url: string;
    secret?: string;
    events?: string[];
  }) {
    return this.prisma.webhook.create({
      data: {
        issuerAddress: data.issuerAddress,
        url: data.url,
        secret: data.secret,
        events: data.events || ['paid', 'overdue', 'cancelled'],
      },
    });
  }

  async notifyStatusChange(invoice: any, newStatus: string) {
    const event = this.mapStatusToEvent(newStatus);
    if (!event) return;

    const webhooks = await this.prisma.webhook.findMany({
      where: {
        issuerAddress: invoice.issuerAddress,
        active: true,
        events: { has: event },
      },
    });

    for (const webhook of webhooks) {
      await this.deliverWebhook(webhook, invoice, event);
    }
  }

  private mapStatusToEvent(status: string): string | null {
    const mapping: Record<string, string> = {
      paid: 'paid',
      overdue: 'overdue',
      cancelled: 'cancelled',
    };
    return mapping[status.toLowerCase()] || null;
  }

  private async deliverWebhook(
    webhook: any,
    invoice: any,
    event: string,
    attempt = 1,
  ) {
    const payload = {
      event,
      timestamp: new Date().toISOString(),
      invoice: {
        id: invoice.id,
        onChainId: invoice.onChainId,
        issuerAddress: invoice.issuerAddress,
        payerAddress: invoice.payerAddress,
        amount: invoice.amountScaled,
        status: invoice.status,
        dueDate: invoice.dueDate,
        paidAmount: invoice.paidAmount,
      },
    };

    try {
      const signature = webhook.secret
        ? this.generateSignature(payload, webhook.secret)
        : undefined;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        'X-Webhook-Event': event,
      };

      if (signature) {
        headers['X-Webhook-Signature'] = signature;
      }

      await firstValueFrom(
        this.httpService.post(webhook.url, payload, { headers, timeout: 10000 }),
      );

      this.logger.log(`✅ Webhook delivered to ${webhook.url} for event ${event}`);
    } catch (error: any) {
      this.logger.warn(`Webhook attempt ${attempt} failed for ${webhook.url}: ${error.message}`);

      if (attempt < this.MAX_RETRIES) {
        // Simple backoff: 2s, 5s, etc.
        const delay = attempt * 2000;
        await new Promise((r) => setTimeout(r, delay));
        await this.deliverWebhook(webhook, invoice, event, attempt + 1);
      } else {
        this.logger.error(`❌ Webhook failed after ${this.MAX_RETRIES} attempts: ${webhook.url}`);
        // TODO: Could store failed deliveries in DB later
      }
    }
  }

  private generateSignature(payload: any, secret: string): string {
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(JSON.stringify(payload));
    return hmac.digest('hex');
  }
}