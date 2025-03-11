import { Controller, Get, Post, Param, Query, Body } from '@nestjs/common';
import { TelegramAnalyticsService } from './telegram-analytics.service';
import { AnalysisResult, ContextCall, AnalyzeContextResponse } from './types';

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

  @Post('analyze-context')
  async analyzeContext(
    @Body() contextCall: ContextCall
  ): Promise<AnalyzeContextResponse> {
    return this.telegramAnalyticsService.analyzeContext(contextCall);
  }
} 