import { Controller, Get, Param, Query } from '@nestjs/common';
import { TwitterAnalyticsService } from './twitter-analytics.service';
import { AnalysisResult } from './types';

@Controller('twitter-analytics')
export class TwitterAnalyticsController {
  constructor(private readonly twitterAnalyticsService: TwitterAnalyticsService) {}

  @Get('contract/:contractAddress')
  async analyzeContractTweets(
    @Param('contractAddress') contractAddress: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ): Promise<AnalysisResult> {
    return this.twitterAnalyticsService.analyzeContractTweets(
      contractAddress,
      startDate,
      endDate,
    );
  }
} 