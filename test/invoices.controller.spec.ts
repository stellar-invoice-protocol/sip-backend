import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { InvoicesController } from '../src/invoices/invoices.controller';
import { InvoicesService } from '../src/invoices/invoices.service';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { SorobanService } from '../src/common/soroban/soroban.service';

describe('Invoices API', () => {
  let app: INestApplication;

  const mockPrismaService = {
    invoice: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      upsert: jest.fn(),
    },
    payment: {
      create: jest.fn(),
    },
    syncLog: {
      create: jest.fn(),
    },
  };

  const mockSorobanService = {
    fetchInvoiceState: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [InvoicesController],
      providers: [
        InvoicesService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SorobanService,
          useValue: mockSorobanService,
        },
      ],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /invoices', () => {
    it('should list invoices for an address', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          issuerAddress: 'GADDR1',
          payerAddress: 'GADDR2',
          amount: '1000',
          status: 'issued',
          payments: [],
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const response = await request(app.getHttpServer()).get('/invoices?address=GADDR1').expect(200);

      expect(response.body.count).toBe(1);
      expect(response.body.invoices).toEqual(mockInvoices);
    });

    it('should require address parameter', async () => {
      await request(app.getHttpServer()).get('/invoices').expect(400);
    });

    it('should filter by role (issuer)', async () => {
      const mockInvoices = [
        {
          id: 'inv-1',
          issuerAddress: 'GADDR1',
          payerAddress: 'GADDR2',
          status: 'issued',
        },
      ];

      mockPrismaService.invoice.findMany.mockResolvedValue(mockInvoices);

      const response = await request(app.getHttpServer()).get('/invoices?address=GADDR1&role=issuer').expect(200);

      expect(response.body.count).toBe(1);
    });
  });

  describe('GET /invoices/:id', () => {
    it('should return invoice detail', async () => {
      const mockInvoice = {
        id: 'inv-1',
        issuerAddress: 'GADDR1',
        payerAddress: 'GADDR2',
        amount: '1000',
        status: 'issued',
        payments: [],
        syncLogs: [],
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const response = await request(app.getHttpServer()).get('/invoices/inv-1').expect(200);

      expect(response.body).toEqual(mockInvoice);
    });

    it('should return 404 for non-existent invoice', async () => {
      mockPrismaService.invoice.findUnique.mockResolvedValue(null);

      await request(app.getHttpServer()).get('/invoices/nonexistent').expect(404);
    });
  });

  describe('GET /invoices/:id/public', () => {
    it('should return public invoice data', async () => {
      const mockInvoice = {
        id: 'inv-1',
        issuerAddress: 'GADDR1',
        amount: '1000',
        amountScaled: '100.00',
        currency: 'native',
        status: 'issued',
        payments: [],
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);

      const response = await request(app.getHttpServer()).get('/invoices/inv-1/public').expect(200);

      expect(response.body.id).toBe('inv-1');
      expect(response.body.amountScaled).toBe('100.00');
    });
  });

  describe('POST /invoices/:id/verify', () => {
    it('should verify invoice against chain', async () => {
      const mockInvoice = {
        id: 'inv-1',
        contractId: 'CADDR1',
        onChainId: 'on-chain-id-1',
        status: 'issued',
        paidAmount: '0',
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockSorobanService.fetchInvoiceState.mockResolvedValue({
        status: 'issued',
        paidAmount: '0',
      });
      mockPrismaService.syncLog.create.mockResolvedValue({
        id: 'log-1',
      });

      const response = await request(app.getHttpServer()).post('/invoices/inv-1/verify').expect(201);

      expect(response.body.verified).toBe(true);
    });

    it('should detect mismatches between indexed and chain', async () => {
      const mockInvoice = {
        id: 'inv-1',
        contractId: 'CADDR1',
        onChainId: 'on-chain-id-1',
        status: 'issued',
        paidAmount: '0',
      };

      mockPrismaService.invoice.findUnique.mockResolvedValue(mockInvoice);
      mockSorobanService.fetchInvoiceState.mockResolvedValue({
        status: 'paid',
        paidAmount: '1000',
      });
      mockPrismaService.syncLog.create.mockResolvedValue({
        id: 'log-1',
      });

      const response = await request(app.getHttpServer()).post('/invoices/inv-1/verify').expect(201);

      expect(response.body.verified).toBe(false);
      expect(response.body.indexedStatus).toBe('issued');
      expect(response.body.chainStatus).toBe('paid');
    });
  });
});
