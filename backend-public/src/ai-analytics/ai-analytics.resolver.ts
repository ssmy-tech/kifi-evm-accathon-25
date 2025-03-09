import { Args, Query, Resolver, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { PrivyAuthGuard } from '../auth/privy-auth/privy-auth.guard';
import { AiAnalyticsService } from './ai-analytics.service';
import { TelegramAnalyticsResponse, TelegramContractAnalyticsInput, TwitterAnalyticsResponse, TwitterContractAnalyticsInput } from './dto/ai-analytics.types';

@Resolver()
export class AiAnalyticsResolver {
  constructor(private readonly aiAnalyticsService: AiAnalyticsService) {}

  @Query(() => TwitterAnalyticsResponse)
  async getTwitterContractAnalytics(
    @Args('input') input: TwitterContractAnalyticsInput,
  ): Promise<TwitterAnalyticsResponse> {
    return this.aiAnalyticsService.getTwitterContractAnalytics(input);
  }

  @Query(() => TelegramAnalyticsResponse)
  @UseGuards(PrivyAuthGuard)
  async getTelegramContractAnalytics(
    @Context() context: any,
    @Args('input') input: TelegramContractAnalyticsInput,
  ): Promise<TelegramAnalyticsResponse> {
    const privyId = context.req?.user?.claims?.userId;
    return this.aiAnalyticsService.getTelegramContractAnalytics(
      input.contractAddress,
      privyId,
    );
  }
} 