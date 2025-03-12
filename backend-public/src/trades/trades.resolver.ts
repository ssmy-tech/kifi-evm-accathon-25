import { Resolver, Query, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradesResponse } from './dto/trades.types';
import { PrivyAuthGuard } from '../auth/privy-auth/privy-auth.guard';
import { Chain } from '@prisma/client';

@Resolver()
export class TradesResolver {
  constructor(private readonly tradesService: TradesService) {}

  @Query(() => TradesResponse)
  @UseGuards(PrivyAuthGuard)
  async getUserTrades(
    @Context() context: any,
    @Args('chain', { nullable: true }) chain?: Chain,
  ): Promise<TradesResponse> {
    const privyId = context.req?.user?.claims?.userId;
    console.log('privyUserId (get trades):', privyId);
    return this.tradesService.getUserTrades(privyId, chain);
  }
} 