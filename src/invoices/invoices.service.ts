import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SorobanService } from '../common/soroban/soroban.service';

@Injectable()
export class InvoicesService {
  constructor(
    private prisma: PrismaService,
    private soroban: SorobanService,
  ) {}

  async listInvoices(address?: string, role?: string) {
    if (!address) {
      throw new BadRequestException('Address parameter is required');
    }

    const where = {};
    if (role === 'issuer') {
      Object.assign(where, { issuerAddress: address });
    } else if (role === 'payer') {
      Object.assign(where, { payerAddress: address });
    } else {
      // Default: show invoices where user is either issuer or payer
      Object.assign(where, {
        OR: [{ issuerAddress: address }, { payerAddress: address }],
      });
    }

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        payments: true,
      },
      orderBy: { dueDate: 'asc' },
    });

    return {
      count: invoices.length,
      invoices,
    };
  }

  async getInvoiceDetail(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      include: {
        payments: true,
        syncLogs: { take: 10, orderBy: { createdAt: 'desc' } },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  async getPublicInvoiceData(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
      select: {
        id: true,
        issuerAddress: true,
        amount: true,
        amountScaled: true,
        currency: true,
        description: true,
        issuedAt: true,
        dueDate: true,
        status: true,
        paidAmount: true,
        payments: {
          select: {
            amount: true,
            paymentDate: true,
          },
        },
      },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    return invoice;
  }

  async verifyInvoiceAgainstChain(id: string) {
    const invoice = await this.prisma.invoice.findUnique({
      where: { id },
    });

    if (!invoice) {
      throw new NotFoundException(`Invoice ${id} not found`);
    }

    try {
      // TODO: Implement actual Soroban RPC call to fetch on-chain state
      // This is stubbed pending full Soroban RPC integration
      const chainState = await this.soroban.fetchInvoiceState(
        invoice.contractId,
        invoice.onChainId,
      );

      const matches = this.compareWithIndexed(invoice, chainState);

      await this.prisma.syncLog.create({
        data: {
          invoiceId: id,
          action: 'verified',
          previousState: JSON.stringify(invoice),
          newState: JSON.stringify(chainState),
        },
      });

      return {
        verified: matches,
        indexedStatus: invoice.status,
        chainStatus: chainState?.status || 'unknown',
        message: matches
          ? 'Indexed state matches chain'
          : 'Mismatch detected between indexed state and chain',
      };
    } catch (error) {
      await this.prisma.syncLog.create({
        data: {
          invoiceId: id,
          action: 'verified',
          error: error.message,
        },
      });

      throw error;
    }
  }

  private compareWithIndexed(invoiceRecord: any, chainState: any): boolean {
    if (!chainState) return false;
    // Simple comparison: check status and key fields
    return (
      invoiceRecord.status === chainState.status &&
      invoiceRecord.paidAmount === chainState.paidAmount
    );
  }

  async createInvoiceFromChain(contractId: string, onChainData: any) {
    return this.prisma.invoice.upsert({
      where: {
        contractId_onChainId: {
          contractId,
          onChainId: onChainData.id,
        },
      },
      update: {
        status: onChainData.status,
        paidAmount: onChainData.paidAmount,
        lastSyncedAt: new Date(),
      },
      create: {
        contractId,
        onChainId: onChainData.id,
        issuerAddress: onChainData.issuer,
        payerAddress: onChainData.payer,
        amount: onChainData.amount,
        amountScaled: onChainData.amountScaled,
        currency: onChainData.currency || 'native',
        description: onChainData.description,
        issuedAt: new Date(onChainData.issuedAt),
        dueDate: new Date(onChainData.dueDate),
        status: onChainData.status,
        paidAmount: onChainData.paidAmount || '0',
        syncedFromChain: true,
      },
    });
  }
}
