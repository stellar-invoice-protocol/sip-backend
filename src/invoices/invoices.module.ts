import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SorobanModule } from '../common/soroban/soroban.module';
import { WebhooksModule } from '../webhooks/webhooks.module';   // ← new

@Module({
  imports: [PrismaModule, SorobanModule, WebhooksModule],   // ← added
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}