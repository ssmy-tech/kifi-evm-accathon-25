import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ZeroExService } from './zerox.service';
import { ethers } from 'ethers';
import { Chain } from '@prisma/client';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TradeExecutorService {
  private readonly logger = new Logger(TradeExecutorService.name);
  private lastProcessedCallTime: Date = new Date(0); // Initialize to epoch

  constructor(
    private prisma: PrismaService,
    private zeroEx: ZeroExService,
  ) {}

  @Cron(CronExpression.EVERY_5_SECONDS)
  async checkNewCalls() {
    try {
      // Find new calls since last check
      const newCalls = await this.prisma.calls.findMany({
        where: {
          chain: Chain.MONAD,
          createdAt: {
            gt: this.lastProcessedCallTime
          }
        },
        orderBy: {
          createdAt: 'asc'
        }
      });

      if (newCalls.length > 0) {
        this.logger.log(`Found ${newCalls.length} new Monad calls to process`);
        
        // Update last processed time to the most recent call
        this.lastProcessedCallTime = newCalls[newCalls.length - 1].createdAt;

        // Process each call
        for (const call of newCalls) {
          await this.handleNewCall(call);
        }
      }
    } catch (error) {
      this.logger.error('Error checking for new calls:', error);
    }
  }

  @Cron(CronExpression.EVERY_10_SECONDS)
  async checkPendingTrades() {
    try {
      // Get all pending trades
      const pendingTrades = await this.prisma.tokenTrade.findMany({
        where: {
          status: 'PENDING',
          chain: Chain.MONAD,
        },
        include: {
          user: true,
        },
      });

      this.logger.log(`Found ${pendingTrades.length} pending Monad trades to process`);

      for (const trade of pendingTrades) {
        try {
          // Get current price
          const currentPrice = await this.zeroEx.getPrice(trade.tokenAddress);
          
          // Get quote for buying
          const quote = await this.zeroEx.getQuote({
            sellToken: 'NATIVE',
            buyToken: trade.tokenAddress,
            sellAmount: trade.amount,
            takerAddress: trade.user.privyId,
          });

          const entryPrice = parseFloat(quote.price);
          this.logger.log(`Trade ${trade.id}: Current price ${currentPrice}, Quote price ${entryPrice}`);

          // TODO: Implement actual trade execution using Privy
          // For now, we'll just update the status and set monitoring
          await this.prisma.tokenTrade.update({
            where: { id: trade.id },
            data: {
              status: 'ACTIVE',
              entryPrice,
              isMonitoring: true,
              stopLossPrice: entryPrice * 0.75, // 25% down
              takeProfitPrice: entryPrice * 2, // 100% up
            },
          });

          this.logger.log(`Trade ${trade.id} activated with stop loss at ${entryPrice * 0.75} (25% down) and take profit at ${entryPrice * 2} (100% up)`);

        } catch (error) {
          this.logger.error(`Error processing pending trade ${trade.id}:`, error);
          
          // Update trade status to FAILED if there's an error
          await this.prisma.tokenTrade.update({
            where: { id: trade.id },
            data: {
              status: 'FAILED',
            },
          });
        }
      }
    } catch (error) {
      this.logger.error('Error checking pending trades:', error);
    }
  }

  async handleNewCall(call: any) {
    try {
      // Only process Monad calls
      if (call.chain !== Chain.MONAD) {
        this.logger.debug(`Skipping non-Monad call for chain: ${call.chain}`);
        return;
      }

      this.logger.log(`Processing new Monad call for token: ${call.address}`);

      // Get users with auto-alpha enabled
      const users = await this.prisma.user.findMany({
        where: {
          enableAutoAlpha: true,
          selectedChatsIds: {
            has: call.tgChatId,
          },
        },
      });

      this.logger.log(`Found ${users.length} users with auto-alpha enabled for chat ${call.tgChatId}`);

      for (const user of users) {
        // Count unique chats that mentioned this token
        const uniqueChatsCount = await this.prisma.calls.groupBy({
          by: ['tgChatId'],
          where: {
            chain: Chain.MONAD,
            address: call.address,
            tgChatId: {
              in: user.selectedChatsIds,
            },
            createdAt: {
              gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
            },
          },
        }).then(groups => groups.length);

        this.logger.log(`User ${user.privyId}: Found ${uniqueChatsCount} unique Monad mentions for token ${call.address} (threshold: ${user.groupCallThreshold})`);

        // Check if threshold met
        if (uniqueChatsCount >= user.groupCallThreshold) {
          await this.executeTrade(user, call);
        } else {
          this.logger.debug(`Threshold not met for user ${user.privyId}: ${uniqueChatsCount}/${user.groupCallThreshold}`);
        }
      }
    } catch (error) {
      this.logger.error('Error handling new call:', error);
    }
  }

  private async executeTrade(user: any, call: any) {
    try {
      this.logger.log(`Executing Monad trade for user ${user.privyId} - Token: ${call.address}`);

      // Get initial quote to check price
      const initialQuote = await this.zeroEx.getQuote({
        sellToken: 'NATIVE',
        buyToken: call.address,
        sellAmount: (user.buyAmount * 1e18).toString(),
        takerAddress: user.privyId,
      });

      const entryPrice = parseFloat(initialQuote.price);
      this.logger.log(`Initial quote received - Price: ${entryPrice}`);

      // Fixed stop loss at 0.75x entry (25% down) and take profit at 2x entry (100% up)
      const stopLossPrice = entryPrice * 0.75;
      const takeProfitPrice = entryPrice * 2;

      // Create trade record with initial price data
      const trade = await this.prisma.tokenTrade.create({
        data: {
          userId: user.privyId,
          tokenAddress: call.address,
          chain: Chain.MONAD,
          status: 'PENDING',
          amount: ethers.parseEther(user.buyAmount.toString()).toString(), // Convert to wei string
          entryPrice,
          stopLossPrice,
          takeProfitPrice,
        },
      });

      this.logger.log(`Created trade record ${trade.id}:
        Amount: ${user.buyAmount} MONAD
        Entry: ${entryPrice}
        Stop Loss: ${stopLossPrice} (25% down)
        Take Profit: ${takeProfitPrice} (100% up)
      `);

      // TODO: Implement actual trade execution using Privy
      // This will need to be implemented based on your Privy setup
      // For now, the checkPendingTrades cron job will handle the execution

    } catch (error) {
      this.logger.error(`Error executing trade for user ${user.privyId}:`, error);
    }
  }
} 