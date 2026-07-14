import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('summary')
  async getSummary(@Query('issuerAddress') issuerAddress?: string) {
    return this.analyticsService.getSummary(issuerAddress);
  }

  @Get('status-breakdown')
  async getStatusBreakdown(@Query('issuerAddress') issuerAddress?: string) {
    return this.analyticsService.getStatusBreakdown(issuerAddress);
  }
}
