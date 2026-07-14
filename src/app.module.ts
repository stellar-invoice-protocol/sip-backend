import { Module } from '@nestjs/common';
import { PrismaModule } from './common/prisma/prisma.module';
import { InvoicesModule } from './invoices/invoices.module';
import { IndexerModule } from './indexer/indexer.module';
import { NotificationsModule } from './notifications/notifications.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    PrismaModule,
    InvoicesModule,
    IndexerModule,
    NotificationsModule,
    AnalyticsModule,
  ],
})
export class AppModule {}
