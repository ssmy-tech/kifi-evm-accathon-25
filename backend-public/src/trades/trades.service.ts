import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { Chain } from '@prisma/client';
import { TradesResponse } from './dto/trades.types';

@Injectable()
export class TradesService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserTrades(privyId: string, chain?: Chain): Promise<TradesResponse> {
    try {
      // Build where clause based on optional chain filter
      const whereClause: any = {
        userId: privyId,
      };

      if (chain) {
        whereClause.chain = chain;
      }

      const trades = await this.prisma.tokenTrade.findMany({
        where: whereClause,
        select: {
          tokenAddress: true,
          entryTxHash: true,
          amount: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      return {
        trades: trades.map(trade => ({
          tokenAddress: trade.tokenAddress,
          entryTxHash: trade.entryTxHash || undefined,
          amount: trade.amount,
        })),
      };
    } catch (error) {
      console.error('Error getting user trades:', error);
      throw new Error(`Failed to get user trades: ${error.message}`);
    }
  }
} 