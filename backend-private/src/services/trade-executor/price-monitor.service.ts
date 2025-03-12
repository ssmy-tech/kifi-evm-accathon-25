import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { ZeroExService } from './zerox.service';
import { PrivyService } from './privy.service';

@Injectable()
export class PriceMonitorService {
  private readonly logger = new Logger(PriceMonitorService.name);

  constructor(
    private prisma: PrismaService,
    private zeroEx: ZeroExService,
    private privy: PrivyService,
  ) {}

  @Cron(CronExpression.EVERY_10_SECONDS)
  async monitorPrices() {
    this.logger.log('Monitoring prices');
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
      // console.log(activeTrades);

      for (const trade of activeTrades) {
        try {
          const currentPrice = await this.zeroEx.getPrice(trade.tokenAddress, trade.amount);
          if (currentPrice == 0) {
            this.logger.error(`pricing failed for ${trade.id}`);
            continue;
          }
          console.log(currentPrice, trade.tokenAddress);
          // console.log(currentPrice, trade.tokenAddress);
          
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
    console.log('Executing sell for trade', trade.id, exitReason);
    try {
      // Get delegated wallet first
      const delegatedWallet = await this.privy.getDelegatedWallet(trade.user.privyId);
      if (!delegatedWallet) {
        this.logger.error(`No delegated wallet found for user ${trade.user.privyId}`);
        return;
      }

      // Get quote for selling
      const quote = await this.zeroEx.getQuote({
        sellToken: trade.tokenAddress,
        buyToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        sellAmount: trade.amount,
        taker: delegatedWallet,
        isBuyingToken: false,
      });

      // Execute the swap
      const txHash = await this.privy.executeSwap({
        privyId: trade.user.privyId,
        walletAddress: delegatedWallet,
        swapData: quote.transaction,
        tokenAddress: trade.tokenAddress,
        trade: "SELL",
      });

      // Update trade status to COMPLETED
      await this.prisma.tokenTrade.update({
        where: { id: trade.id },
        data: {
          status: 'COMPLETED',
          exitPrice: currentPrice,
          exitReason,
          exitTxHash: txHash,
          isMonitoring: false,
        },
      });

      this.logger.log(`Successfully executed sell for trade ${trade.id}:
        Exit Price: ${currentPrice}
        Reason: ${exitReason}
        TX Hash: ${txHash}
      `);

    } catch (error) {
      this.logger.error(`Failed to execute sell for trade ${trade.id}:`, error);
    }
  }
} 