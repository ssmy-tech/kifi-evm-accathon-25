import { Injectable, Logger, OnModuleInit, Controller, Get } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ZeroExService } from './zerox.service';
import { PrivyService } from './privy.service';
import { ethers } from 'ethers';
import { Chain } from '@prisma/client';
import { Cron } from '@nestjs/schedule';

@Injectable()
@Controller('health')
export class TradeExecutorService implements OnModuleInit {
  private readonly logger = new Logger(TradeExecutorService.name);
  private lastProcessedCallTime: Date = new Date(); // Initialize to current time
  private activeTrades: Set<string> = new Set(); // Format: `${userId}-${tokenAddress}`

  constructor(
    private prisma: PrismaService,
    private zeroEx: ZeroExService,
    private privy: PrivyService,
  ) {
    console.log('TradeExecutorService constructor called');
  }

  async onModuleInit() {
    try {
      console.log('TradeExecutorService initializing...');
      await this.checkNewCalls(); // Run immediately on startup
      console.log('TradeExecutorService initialized');
      this.logger.log('TradeExecutorService initialized - Cron jobs active');
    } catch (error) {
      this.logger.error('Failed to initialize service:', error);
      throw error;
    }
  }

  @Get()
  healthCheck() {
    console.log('Health check called');
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Cron('*/5 * * * * *') // Run every 5 seconds
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
        },
        include: {
          chat: true
        }
      });

      this.logger.log(`[CRON] Last processed time: ${this.lastProcessedCallTime.toISOString()}`);

      if (newCalls.length > 0) {
        this.logger.log(`[NEW CALLS DETECTED] Found ${newCalls.length} new Monad calls to process`);
        
        // Log details for each call
        for (const call of newCalls) {
          this.logger.log(`[CALL DETAILS] 
            Token: ${call.address}
            Chat: ${call.chat.tgChatName || call.tgChatId}
            Time: ${call.createdAt.toISOString()}
            Token Name: ${call.tokenName || 'Unknown'}
            Ticker: ${call.ticker || 'Unknown'}
          `);
        }
        
        // Update last processed time to the most recent call
        this.lastProcessedCallTime = newCalls[newCalls.length - 1].createdAt;

        // Process each call
        for (const call of newCalls) {
          await this.handleNewCall(call);
        }
      } else {
        this.logger.log('[CRON] No new calls found');
      }
    } catch (error) {
      this.logger.error('Error checking for new calls:', error);
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
        // All validation checks before attempting trade creation
        try {
          // Check if we have ANY previous trades for this token
          const previousTrade = await this.prisma.tokenTrade.findFirst({
            where: {
              userId: user.privyId,
              tokenAddress: call.address,
              status: {
                in: ['ACTIVE', 'COMPLETED', 'FAILED']
              }
            }
          });

          if (previousTrade) {
            this.logger.log(`Skipping trade for user ${user.privyId} - Previous ${previousTrade.status} trade ${previousTrade.id} exists for token ${call.address}`);
            continue;
          }

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

          // Only proceed to trade execution if all validations pass
          if (uniqueChatsCount >= user.groupCallThreshold) {
            await this.executeTrade(user, call);
          } else {
            this.logger.debug(`Threshold not met for user ${user.privyId}: ${uniqueChatsCount}/${user.groupCallThreshold}`);
          }
        } catch (error) {
          this.logger.error(`Error validating trade for user ${user.privyId}:`, error);
        }
      }
    } catch (error) {
      this.logger.error('Error handling new call:', error);
    }
  }

  private async executeTrade(user: any, call: any) {
    const tradeKey = `${user.privyId}-${call.address}`;
    
    if (this.activeTrades.has(tradeKey)) {
      this.logger.warn(`Trade already in progress for user ${user.privyId} and token ${call.address}`);
      return;
    }

    try {
      this.activeTrades.add(tradeKey);
      this.logger.log(`Executing Monad trade for user ${user.privyId} - Token: ${call.address}`);

      // Check for existing active trade in DB
      const existingTrade = await this.prisma.tokenTrade.findFirst({
        where: {
          userId: user.privyId,
          tokenAddress: call.address,
          status: 'ACTIVE'
        }
      });

      if (existingTrade) {
        this.logger.warn(`Active trade already exists for user ${user.privyId} and token ${call.address}`);
        return;
      }

      // Get delegated wallet first
      const delegatedWallet = await this.privy.getDelegatedWallet(user.privyId);
      if (!delegatedWallet) {
        this.logger.error(`No delegated wallet found for user ${user.privyId}`);
        return;
      }

      // Get quote for buying token with MONAD
      const quote = await this.zeroEx.getQuote({
        sellToken: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
        buyToken: call.address,
        sellAmount: (user.buyAmount * 1e18).toString(),
        taker: delegatedWallet,
        isBuyingToken: true,
      });

      const entryPrice = parseFloat(quote.price);
      this.logger.log(`Quote received - Price: ${entryPrice}`);

      // Execute the swap first
      const txHash = await this.privy.executeSwap({
        privyId: user.privyId,
        walletAddress: delegatedWallet,
        swapData: quote.transaction,
        tokenAddress: call.address,
        trade: "BUY",
      });

      // Only create trade record after successful swap execution
      await this.prisma.tokenTrade.create({
        data: {
          userId: user.privyId,
          tokenAddress: call.address,
          chain: Chain.MONAD,
          status: 'ACTIVE',
          amount: quote.minBuyAmount,
          entryPrice,
          entryTxHash: txHash,
          isMonitoring: true,
          stopLossPrice: entryPrice * 0.75,
          takeProfitPrice: entryPrice * 2,
        }
      });

      this.logger.log(`Successfully executed buy for user ${user.privyId}:
        Token: ${call.address}
        Amount: ${quote.minBuyAmount}
        Entry Price: ${entryPrice}
        TX Hash: ${txHash}
      `);

    } catch (error) {
      this.logger.error(`Error executing trade for user ${user.privyId}:`, error);
      throw error;
    } finally {
      this.activeTrades.delete(tradeKey);
    }
  }
} 