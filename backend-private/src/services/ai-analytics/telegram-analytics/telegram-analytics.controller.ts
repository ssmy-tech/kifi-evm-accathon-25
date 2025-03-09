import { Controller, Get, Param, Query } from '@nestjs/common';
import { TelegramAnalyticsService } from './telegram-analytics.service';
import { AnalysisResult } from './types';

@Controller('telegram-analytics')
export class TelegramAnalyticsController {
  constructor(private readonly telegramAnalyticsService: TelegramAnalyticsService) {}

  @Get('contract/:contractAddress')
  async analyzeContractMessages(
    @Param('contractAddress') contractAddress: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('limit') limit?: number,
  ): Promise<AnalysisResult> {
    return this.telegramAnalyticsService.analyzeContractMessages(
      contractAddress,
      startDate,
      endDate,
      limit,
    );
  }
} 