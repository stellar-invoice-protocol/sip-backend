import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { WebhooksService } from './webhooks.service';
import { PrismaModule } from '../common/prisma/prisma.module';

@Module({
  imports: [HttpModule, PrismaModule],
  providers: [WebhooksService],
  exports: [WebhooksService],
})
export class WebhooksModule {}