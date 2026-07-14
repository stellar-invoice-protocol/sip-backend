import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsController } from '../src/analytics/analytics.controller';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { PrismaService } from '../src/common/prisma/prisma.service';

describe('Analytics API', () => {
  let analyticsService: AnalyticsService;

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsController],
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    analyticsService = module.get<AnalyticsService>(AnalyticsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getSummary', () => {
    it('should return analytics summary', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          amount: '1000',
          paidAmount: '1000',
          status: 'paid',
          payments: [],
        },
        {
          id: 'inv-2',
          amount: '2000',
          paidAmount: '0',
          status: 'issued',
          payments: [],
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await analyticsService.getSummary();

      expect(result.totalInvoices).toBe(2);
      expect(result.paidInvoices).toBe(1);
      expect(result.pendingInvoices).toBe(1);
      expect(result.paymentRate).toBe(50);
      expect(result.totalAmount).toBe('3000');
      expect(result.totalAmountPaid).toBe('1000');
    });

    it('should filter by issuer address', async () => {
      const mockInvoices = [
        {
          amount: '1000',
          paidAmount: '1000',
          status: 'paid',
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await analyticsService.getSummary('GADDR1');

      expect(result.issuerAddress).toBe('GADDR1');
      expect(mockPrismaService.invoice.findMany).toHaveBeenCalledWith({
        where: { issuerAddress: 'GADDR1' },
        include: {
          payments: true,
        },
      });
    });

    it('should handle empty invoice list', async () => {
      mockPrismaService.invoice.findMany.mockResolvedValue([]);

      const result = await analyticsService.getSummary();

      expect(result.totalInvoices).toBe(0);
      expect(result.paymentRate).toBe(0);
      expect(result.averageAmount).toBe('0');
    });
  });

  describe('getStatusBreakdown', () => {
    it('should return status breakdown', async () => {
      const mockInvoices = [{ status: 'issued' }, { status: 'issued' }, { status: 'paid' }, { status: 'partial' }];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const result = await analyticsService.getStatusBreakdown();

      expect(result.breakdown.issued).toBe(2);
      expect(result.breakdown.paid).toBe(1);
      expect(result.breakdown.partial).toBe(1);
      expect(result.total).toBe(4);
    });
  });
});
