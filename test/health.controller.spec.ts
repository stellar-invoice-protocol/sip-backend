import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { HealthController } from '../src/health/health.controller';
import { PrismaService } from '../src/common/prisma/prisma.service';
import { SorobanService } from '../src/common/soroban/soroban.service';

describe('HealthController', () => {
  let app: INestApplication;

  const mockPrismaService = {
    $queryRaw: jest.fn(),
  };

  const mockSorobanService = {
    checkConnection: jest.fn(),
  };

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      controllers: [HealthController],
      providers: [
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

  it('GET /health - healthy state', async () => {
    mockPrismaService.$queryRaw.mockResolvedValue([1]);
    mockSorobanService.checkConnection.mockResolvedValue('connected');

    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('healthy');
    expect(response.body.database).toBe('connected');
    expect(response.body.soroban).toBe('connected');
    expect(response.body.timestamp).toBeDefined();
  });

  it('GET /health - unhealthy state due to database disconnect', async () => {
    mockPrismaService.$queryRaw.mockRejectedValue(new Error('Db error'));
    mockSorobanService.checkConnection.mockResolvedValue('connected');

    const response = await request(app.getHttpServer())
      .get('/health')
      .expect(200);

    expect(response.body.status).toBe('unhealthy');
    expect(response.body.database).toBe('disconnected');
    expect(response.body.soroban).toBe('connected');
  });
});
