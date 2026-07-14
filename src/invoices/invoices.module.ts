import { Module } from '@nestjs/common';
import { InvoicesController } from './invoices.controller';
import { InvoicesService } from './invoices.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SorobanModule } from '../common/soroban/soroban.module';

@Module({
  imports: [PrismaModule, SorobanModule],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService],
})
export class InvoicesModule {}
