import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradesResponse, GetTradesInput } from './dto/trades.types';
import { PrivyAuthGuard } from '../auth/privy-auth/privy-auth.guard';

@Resolver()
export class TradesResolver {
  constructor(private readonly tradesService: TradesService) {}

  @Query(() => TradesResponse)
  @UseGuards(PrivyAuthGuard)
  async getUserTrades(
    @Context() context: any,
    @Args('input', { nullable: true }) input?: GetTradesInput,
  ): Promise<TradesResponse> {
    const privyId = context.req?.user?.claims?.userId;
    console.log('privyUserId (get trades):', privyId);
    return this.tradesService.getUserTrades(privyId, input?.chain);
  }
} 