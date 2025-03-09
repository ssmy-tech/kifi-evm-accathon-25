import { Controller, Get, Param, Query } from '@nestjs/common';
import { TelegramAnalyticsService } from './telegram-analytics.service';
import { AnalysisResult } from './types';

@Controller('telegram-analytics')
export class TelegramAnalyticsController {
  constructor(private readonly telegramAnalyticsService: TelegramAnalyticsService) {}

  @Get('contract/:contractAddress/privy/:privyId')
  async analyzeContractMessages(
    @Param('contractAddress') contractAddress: string,
    @Param('privyId') privyId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AnalysisResult> {
    return this.telegramAnalyticsService.analyzeContractMessages(
      contractAddress,
      privyId,
      startDate,
      endDate,
    );
  }
} 