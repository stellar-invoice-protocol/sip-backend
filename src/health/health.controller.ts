import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { SorobanService } from '../common/soroban/soroban.service';

@Controller('health')
export class HealthController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly soroban: SorobanService,
  ) {}

  @Get()
  async check() {
    let dbStatus = 'connected';
    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (e) {
      dbStatus = 'disconnected';
    }

    // Call checkConnection on SorobanService if it exists
    const sorobanStatus =
      typeof (this.soroban as any).checkConnection === 'function'
        ? await (this.soroban as any).checkConnection()
        : 'stub';

    return {
      status: dbStatus === 'connected' ? 'healthy' : 'unhealthy',
      database: dbStatus,
      soroban: sorobanStatus,
      timestamp: new Date().toISOString(),
    };
  }
}
