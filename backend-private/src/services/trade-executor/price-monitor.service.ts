import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ZeroExService } from './zerox.service';

@Injectable()
export class PriceMonitorService {
  private readonly logger = new Logger(PriceMonitorService.name);

  constructor(
    private prisma: PrismaService,
    private zeroEx: ZeroExService,
  ) {}

  @Cron(CronExpression.EVERY_MINUTE)
  async monitorPrices() {
    try {
      // Get all active trades that need monitoring
      const activeTrades = await this.prisma.tokenTrade.findMany({
        where: {
          status: 'ACTIVE',
          isMonitoring: true,
        },
        include: {
          user: true,
        },
      });

      for (const trade of activeTrades) {
        try {
          const currentPrice = await this.zeroEx.getPrice(trade.tokenAddress);
          
          // Check stop loss
          if (trade.stopLossPrice !== null && currentPrice <= trade.stopLossPrice) {
            await this.executeSell(trade, 'STOP_LOSS', currentPrice);
            continue;
          }

          // Check take profit
          if (trade.takeProfitPrice !== null && currentPrice >= trade.takeProfitPrice) {
            await this.executeSell(trade, 'TAKE_PROFIT', currentPrice);
            continue;
          }

          // Update last checked timestamp
          await this.prisma.tokenTrade.update({
            where: { id: trade.id },
            data: { lastChecked: new Date() },
          });
        } catch (error) {
          this.logger.error(`Error monitoring trade ${trade.id}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error in price monitoring:', error);
    }
  }

  private async executeSell(trade: any, exitReason: 'STOP_LOSS' | 'TAKE_PROFIT', currentPrice: number) {
    try {
      // Get quote for selling
      const quote = await this.zeroEx.getQuote({
        sellToken: trade.tokenAddress,
        buyToken: 'NATIVE',
        sellAmount: trade.amount,
        takerAddress: trade.user.privyId,
      });

      // Update trade status
      await this.prisma.tokenTrade.update({
        where: { id: trade.id },
        data: {
          status: 'COMPLETED',
          exitPrice: currentPrice,
          exitReason,
          isMonitoring: false,
        },
      });

      // TODO: Implement actual trade execution using Privy
      // This will need to be implemented based on your Privy setup

    } catch (error) {
      this.logger.error(`Failed to execute sell for trade ${trade.id}:`, error);
    }
  }
} 