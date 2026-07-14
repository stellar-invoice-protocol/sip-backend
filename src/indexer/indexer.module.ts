import { Module } from '@nestjs/common';
import { IndexerService } from './indexer.service';
import { PrismaModule } from '../common/prisma/prisma.module';
import { SorobanModule } from '../common/soroban/soroban.module';

@Module({
  imports: [PrismaModule, SorobanModule],
  providers: [IndexerService],
  exports: [IndexerService],
})
export class IndexerModule {}
