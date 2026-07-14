import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { EmailService } from './email.service';
import { addDays } from 'date-fns';

@Injectable()
export class NotificationsService implements OnModuleInit {
  private readonly logger = new Logger(NotificationsService.name);
  private checkInterval = 300000; // 5 minutes

  constructor(
    private prisma: PrismaService,
    private emailService: EmailService,
  ) {}

  async onModuleInit() {
    if (process.env.DISABLE_NOTIFICATIONS === 'true') {
      this.logger.warn('Notifications disabled via DISABLE_NOTIFICATIONS env var');
      return;
    }

    this.startNotificationChecker();
  }

  private startNotificationChecker() {
    this.logger.log('✓ Starting notification checker...');

    setInterval(async () => {
      try {
        await this.checkAndSendNotifications();
      } catch (error) {
        this.logger.error('Error in notification checker:', error);
      }
    }, this.checkInterval);
  }

  private async checkAndSendNotifications() {
    // Check for invoices approaching due date (7 days)
    const now = new Date();
    const upcomingDueDate = addDays(now, 7);

    const upcomingInvoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          gte: now,
          lte: upcomingDueDate,
        },
        status: {
          in: ['issued', 'partial'],
        },
      },
    });

    for (const invoice of upcomingInvoices) {
      await this.sendReminderNotification(invoice);
    }

    // Check for overdue invoices
    const overdueInvoices = await this.prisma.invoice.findMany({
      where: {
        dueDate: {
          lt: now,
        },
        status: {
          in: ['issued', 'partial'],
        },
      },
    });

    for (const invoice of overdueInvoices) {
      await this.sendOverdueNotification(invoice);
    }
  }

  private async sendReminderNotification(invoice: any) {
    try {
      // TODO: Fetch issuer email from on-chain data or external service
      const issuerEmail = 'issuer@example.com'; // Stub

      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          invoiceId: invoice.id,
          type: 'reminder',
          sentAt: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Avoid duplicate sends within 24h
          },
        },
      });

      if (existingNotification) {
        this.logger.debug(`Reminder already sent for invoice ${invoice.id}`);
        return;
      }

      const subject = `Invoice Reminder: ${invoice.onChainId}`;
      const body = `
        Invoice ${invoice.onChainId} is due in ${Math.ceil(
        (invoice.dueDate - new Date()) / (1000 * 60 * 60 * 24),
      )} days.
        Amount: ${invoice.amountScaled} ${invoice.currency}
        Due: ${invoice.dueDate.toLocaleDateString()}
      `;

      await this.emailService.send({
        to: issuerEmail,
        subject,
        body,
      });

      await this.prisma.notification.create({
        data: {
          invoiceId: invoice.id,
          type: 'reminder',
          recipientEmail: issuerEmail,
          sentAt: new Date(),
        },
      });

      this.logger.log(`Reminder sent for invoice ${invoice.id}`);
    } catch (error) {
      this.logger.error(`Failed to send reminder for invoice ${invoice.id}:`, error);

      await this.prisma.notification.create({
        data: {
          invoiceId: invoice.id,
          type: 'reminder',
          recipientEmail: 'unknown',
          failureReason: error.message,
        },
      });
    }
  }

  private async sendOverdueNotification(invoice: any) {
    try {
      const issuerEmail = 'issuer@example.com'; // Stub

      const existingNotification = await this.prisma.notification.findFirst({
        where: {
          invoiceId: invoice.id,
          type: 'overdue',
          sentAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Avoid duplicate sends within 7 days
          },
        },
      });

      if (existingNotification) {
        this.logger.debug(`Overdue notification already sent for invoice ${invoice.id}`);
        return;
      }

      const subject = `Invoice Overdue: ${invoice.onChainId}`;
      const body = `
        Invoice ${invoice.onChainId} is now overdue.
        Amount: ${invoice.amountScaled} ${invoice.currency}
        Due: ${invoice.dueDate.toLocaleDateString()}
        Paid: ${invoice.paidAmount} / ${invoice.amount}
      `;

      await this.emailService.send({
        to: issuerEmail,
        subject,
        body,
      });

      await this.prisma.notification.create({
        data: {
          invoiceId: invoice.id,
          type: 'overdue',
          recipientEmail: issuerEmail,
          sentAt: new Date(),
        },
      });

      this.logger.log(`Overdue notification sent for invoice ${invoice.id}`);
    } catch (error) {
      this.logger.error(
        `Failed to send overdue notification for invoice ${invoice.id}:`,
        error,
      );

      await this.prisma.notification.create({
        data: {
          invoiceId: invoice.id,
          type: 'overdue',
          recipientEmail: 'unknown',
          failureReason: error.message,
        },
      });
    }
  }
}
