import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AnalyticsService {
  constructor(private prisma: PrismaService) {}

  async getSummary(issuerAddress?: string) {
    const where = issuerAddress ? { issuerAddress } : {};

    const invoices = await this.prisma.invoice.findMany({
      where,
      include: {
        payments: true,
      },
    });

    // Calculate totals
    const totalInvoices = invoices.length;
    const totalAmount = invoices.reduce(
      (sum, inv) => sum + BigInt(inv.amount),
      BigInt(0),
    );
    const totalPaid = invoices.reduce(
      (sum, inv) => sum + BigInt(inv.paidAmount),
      BigInt(0),
    );
    const paidInvoices = invoices.filter((inv) => inv.status === 'paid').length;

    // Calculate payment rate
    let paymentRate = 0;
    if (totalInvoices > 0) {
      paymentRate = (paidInvoices / totalInvoices) * 100;
    }

    // Average amount
    const averageAmount =
      totalInvoices > 0 ? totalAmount / BigInt(totalInvoices) : BigInt(0);

    return {
      issuerAddress: issuerAddress || 'all',
      totalInvoices,
      totalAmount: totalAmount.toString(),
      totalAmountPaid: totalPaid.toString(),
      totalAmountOutstanding: (totalAmount - totalPaid).toString(),
      paidInvoices,
      pendingInvoices: totalInvoices - paidInvoices,
      paymentRate: parseFloat(paymentRate.toFixed(2)),
      averageAmount: averageAmount.toString(),
      timestamp: new Date(),
    };
  }

  async getStatusBreakdown(issuerAddress?: string) {
    const where = issuerAddress ? { issuerAddress } : {};

    const invoices = await this.prisma.invoice.findMany({
      where,
    });

    const breakdown = {
      issued: 0,
      partial: 0,
      paid: 0,
      overdue: 0,
      cancelled: 0,
    };

    for (const invoice of invoices) {
      breakdown[invoice.status]++;
    }

    return {
      issuerAddress: issuerAddress || 'all',
      breakdown,
      total: invoices.length,
      timestamp: new Date(),
    };
  }
}
