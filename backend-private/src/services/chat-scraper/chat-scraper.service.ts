import { Injectable, Logger, OnModuleInit, Controller, Get } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '../../common/blockchain/blockchain.service';
import { ChatScraperConfigService } from './config.service';
import { TelegramApiService } from './telegram-api.service';
import { AiService } from './ai.service';
import { TelegramMessage } from './types/telegram.types';
import { Chain } from '@prisma/client';
import { randomUUID } from 'crypto';

interface RateLimitInfo {
  lastRequest: Date;
  requestCount: number;
}

interface PendingContext {
  callId: string;
  messageId: number;
  address: string;
  chatId: string;
  nextMessages: TelegramMessage[];
  timeoutHandle: NodeJS.Timeout;
  createdAt: Date;
}

@Injectable()
@Controller('health')
export class ChatScraperService implements OnModuleInit {
  private readonly logger = new Logger(ChatScraperService.name);
  private readonly prisma: PrismaClient;
  private readonly rateLimits: Map<string, RateLimitInfo> = new Map();
  private readonly pendingContexts: Map<string, PendingContext> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 150; // Adjust this based on API limits
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
  private readonly CONTEXT_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly config: ChatScraperConfigService,
    private readonly telegramApi: TelegramApiService,
    private readonly aiService: AiService,
  ) {
    this.prisma = new PrismaClient({
      datasources: {
        db: {
          url: this.config.databaseUrl,
        },
      },
      log: ['error'],
    });
  }

  private isRateLimited(userEndpoint: string): boolean {
    const now = new Date();
    const rateInfo = this.rateLimits.get(userEndpoint);

    if (!rateInfo) {
      this.rateLimits.set(userEndpoint, { lastRequest: now, requestCount: 1 });
      return false;
    }

    const timeSinceLastWindow = now.getTime() - rateInfo.lastRequest.getTime();

    if (timeSinceLastWindow > this.RATE_LIMIT_WINDOW_MS) {
      // Reset window if it's been more than a minute
      this.rateLimits.set(userEndpoint, { lastRequest: now, requestCount: 1 });
      return false;
    }

    if (rateInfo.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      const waitTimeMs = this.RATE_LIMIT_WINDOW_MS - timeSinceLastWindow;
      this.logger.warn(`Rate limit reached for endpoint ${userEndpoint}. Need to wait ${Math.ceil(waitTimeMs / 1000)}s`);
      return true;
    }

    // Increment request count
    rateInfo.requestCount++;
    this.rateLimits.set(userEndpoint, rateInfo);
    return false;
  }

  private async waitForRateLimit(userEndpoint: string): Promise<void> {
    while (this.isRateLimited(userEndpoint)) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async onModuleInit() {
    try {
      await this.prisma.$connect();
      await this.handleChatScraping();
      this.logger.log('Service initialized');
    } catch (error) {
      this.logger.error('Failed to initialize service:', error);
      throw error;
    }
  }

  @Cron('*/30 * * * * *') // Runs every 15 seconds
  async handleChatScraping() {
    this.logger.log('Starting chat scraping');
    try {
      const chats = await this.prisma.chats.findMany({
        include: {
          users: true,
          messages: {
            orderBy: {
              createdAt: 'desc',
            },
            take: 1,
          },
        },
        orderBy: {
          lastProcessedAt: 'asc',
        },
      });

      for (const chat of chats) {
        await this.processChat(chat);
      }
    } catch (error) {
      this.logger.error('Error in chat scraping:', error);
    }
  }

  private async processChat(chat: any) {
    this.logger.log(`Processing chat: ${chat.tgChatName || chat.tgChatId}`);
    if (!chat.users?.length) {
      return;
    }

    for (const user of chat.users) {
      if (!user.tgApiLink || !user.tgApiSecret) {
        continue;
      }

      try {
        await this.waitForRateLimit(user.tgApiLink);
        let messages: TelegramMessage[] = [];
        let lastProcessedId = chat.lastProcessedMessageId ? parseInt(chat.lastProcessedMessageId) : null;
        
        if (!chat.lastProcessedAt) {
          this.logger.log(`Processing new chat: ${chat.tgChatName || chat.tgChatId}`);
          
          const recentResponse = await this.telegramApi.getMessages(
            user.tgApiLink,
            user.tgApiSecret,
            chat.tgChatId,
            { limit: 1 }
          );

          const recentBatch = recentResponse.data;
          if (recentBatch.length === 0) {
            continue;
          }

          const mostRecentMessage = recentBatch[0];
          if (!mostRecentMessage?.date) {
            continue;
          }

          const referenceTime = new Date(mostRecentMessage.date);
          const oneDayBeforeReference = new Date(referenceTime.getTime() - 24 * 60 * 60 * 1000);
          
          let oldestMessageId = mostRecentMessage.id;
          let reachedOneDayOld = false;
          let totalFetched = 0;

          messages.push(mostRecentMessage);
          totalFetched++;

          while (!reachedOneDayOld && totalFetched < 2000) {
            await this.waitForRateLimit(user.tgApiLink);
            const response = await this.telegramApi.getMessages(
              user.tgApiLink,
              user.tgApiSecret,
              chat.tgChatId,
              { 
                limit: 100,
                fromMessageId: oldestMessageId,
                direction: 'before'
              }
            );
            console.log(response.data);

            const batch = response.data;
            
            if (batch.length === 0) {
              break;
            }

            const validBatch = batch.filter(msg => msg && msg.date && typeof msg.date === 'string');
            if (validBatch.length === 0) {
              break;
            }

            const oldMessages = validBatch.filter(msg => new Date(msg.date) < oneDayBeforeReference);
            if (oldMessages.length > 0) {
              const newMessages = validBatch.filter(msg => new Date(msg.date) >= oneDayBeforeReference);
              messages.push(...newMessages);
              reachedOneDayOld = true;
            } else {
              messages.push(...validBatch);
              oldestMessageId = validBatch[validBatch.length - 1].id;
              totalFetched += validBatch.length;
            }
          }
          
          // Sort messages by ID in ascending order
          messages.sort((a, b) => a.id - b.id);
          this.logger.log(`Found ${messages.length} messages in the last 24 hours for new chat ${chat.tgChatName || chat.tgChatId}`);
        } else {
          const response = await this.telegramApi.getNewMessages(
            user.tgApiLink,
            user.tgApiSecret,
            chat.tgChatId,
            lastProcessedId?.toString()
          );
          messages = response.data;
        }

        if (messages?.length > 0) {
          // Process only messages that are newer than the last processed message
          const newMessages = messages.filter(msg => !lastProcessedId || msg.id > lastProcessedId);
          
          if (newMessages.length > 0) {
            await this.processMessages(newMessages, chat.tgChatId);
            const latestMessageId = Math.max(...newMessages.map(msg => msg.id));
            
            await this.prisma.chats.update({
              where: { tgChatId: chat.tgChatId },
              data: {
                lastProcessedMessageId: latestMessageId.toString(),
                lastProcessedAt: new Date(),
              },
            });
            
            if (!chat.lastProcessedAt) {
              this.logger.log(`Initialized new chat ${chat.tgChatName || chat.tgChatId} with ${newMessages.length} messages`);
            } else {
              this.logger.log(`Processed ${newMessages.length} new messages for chat ${chat.tgChatName || chat.tgChatId}`);
            }
          }
          break;
        }
      } catch (error) {
        this.logger.error(`Failed to fetch messages for chat ${chat.tgChatId}:`, error);
      }
    }
  }

  private async processMessages(messages: TelegramMessage[], chatId: string) {
    const contractAddressRegex = /\b(0x[a-fA-F0-9]{40})\b|\b([1-9A-HJ-NP-Za-km-z]{32,44})\b/g;

    // Sort messages by ID to ensure correct order
    messages.sort((a, b) => a.id - b.id);

    for (const message of messages) {
      const content = message.text || '';
      const matches = content.match(contractAddressRegex);

      if (matches) {
        for (const address of matches) {
          this.logger.log(`Found potential contract address: ${address}`, `${message.id}_${address}`);
          
          try {
            const result = await this.blockchainService.verifyContract(address);
            if (result.isValid && result.chain) {
              this.logger.log(`Found valid contract: ${address} on chain: ${result.chain}`, `${message.id}_${address}`);
              
              try {
                // Find the chat to get API credentials
                const chat = await this.prisma.chats.findUnique({
                  where: { tgChatId: chatId },
                  include: { users: true }
                });

                if (!chat?.users?.[0]?.tgApiLink || !chat.users[0].tgApiSecret) {
                  this.logger.error(`No valid API credentials found for chat ${chatId}`);
                  continue;
                }

                const user = {
                  tgApiLink: chat.users[0].tgApiLink as string,
                  tgApiSecret: chat.users[0].tgApiSecret as string
                };

                const fromIdJson = message.fromId ? 
                  (typeof message.fromId === 'string' ? 
                    message.fromId : 
                    JSON.parse(JSON.stringify(message.fromId))) : 
                  null;
                
                const callId = randomUUID();
                
                // Create call record with metadata using UUID
                await this.prisma.calls.create({
                  data: {
                    telegramCallId: callId,
                    address: address,
                    chain: result.chain,
                    ticker: result.symbol,
                    tokenName: result.name,
                    chat: {
                      connect: {
                        tgChatId: chatId
                      }
                    },
                    messages: {
                      connectOrCreate: {
                        where: {
                          telegramMessageId: message.id.toString()
                        },
                        create: {
                          telegramMessageId: message.id.toString(),
                          text: content,
                          fromId: fromIdJson,
                          chat: {
                            connect: {
                              tgChatId: chatId
                            }
                          }
                        }
                      }
                    }
                  }
                });

                // Fetch previous 10 messages using the API
                await this.waitForRateLimit(user.tgApiLink);
                const previousResponse = await this.telegramApi.getMessages(
                  user.tgApiLink,
                  user.tgApiSecret,
                  chatId,
                  {
                    limit: 10,
                    fromMessageId: message.id,
                    direction: 'before'
                  }
                );

                const previousMessages = previousResponse.data;
                
                // Process the call message and previous context immediately
                await this.processInitialContext(callId, message, previousMessages);

                // Set up collection of future context
                const timeoutHandle = setTimeout(
                  () => this.processFutureContext(callId),
                  this.CONTEXT_TIMEOUT_MS
                );

                this.pendingContexts.set(callId, {
                  callId,
                  messageId: message.id,
                  address,
                  chatId,
                  nextMessages: [],
                  timeoutHandle,
                  createdAt: new Date()
                });

              } catch (error) {
                this.logger.error(`Failed to create call record: ${error.message}`);
              }
            }
          } catch (error) {
            this.logger.error(`Error verifying contract ${address}: ${error.message}`);
          }
        }
      }

      // Check if this message should be added to any pending contexts
      for (const [callId, context] of this.pendingContexts.entries()) {
        if (context.chatId === chatId && message.id > context.messageId) {
          context.nextMessages.push(message);
          
          // If we've collected enough next messages, process the future context
          if (context.nextMessages.length >= 20) {
            this.processFutureContext(callId);
          }
        }
      }
    }
  }

  private async processInitialContext(callId: string, callMessage: TelegramMessage, previousMessages: TelegramMessage[]) {
    try {
      this.logger.log(`Processing initial context for call ${callId} with ${previousMessages.length} previous messages`);

      // Get the call details from the database
      const call = await this.prisma.calls.findUnique({
        where: { telegramCallId: callId }
      });

      if (!call) {
        this.logger.error(`Call ${callId} not found when processing initial context`);
        return;
      }

      // Format the payload for AI analysis
      const aiPayload = {
        callId,
        token: {
          address: call.address,
          name: call.tokenName,
          ticker: call.ticker,
          chain: call.chain
        },
        contextType: 'initial' as const,
        callMessage: {
          id: callMessage.id,
          text: callMessage.text || null,
          fromId: callMessage.fromId,
          date: callMessage.date,
          messageType: 'call' as const
        },
        messages: [
          ...previousMessages.map(msg => ({
            id: msg.id,
            text: msg.text || null,
            fromId: msg.fromId,
            date: msg.date,
            messageType: 'previous' as const
          }))
        ].sort((a, b) => a.id - b.id)
      };

      // Log what will be sent to AI
      this.logger.log('Initial context AI payload:', {
        endpoint: '/telegram-analytics/analyze-context',
        method: 'POST',
        payload: aiPayload
      });

      // Send to AI endpoint for analysis
      const aiResponse = await this.aiService.analyzeContext(aiPayload);

      // Store initial AI analysis in the database
      await this.prisma.calls.update({
        where: { telegramCallId: callId },
        data: {
          initialAnalysis: JSON.stringify(aiResponse)
        }
      });

      this.logger.log(`Stored initial analysis for call ${callId}`);

    } catch (error) {
      this.logger.error(`Failed to process initial context for call ${callId}: ${error.message}`);
    }
  }

  private async processFutureContext(callId: string) {
    const context = this.pendingContexts.get(callId);
    if (!context) return;

    // Clear the timeout since we're processing now
    clearTimeout(context.timeoutHandle);
    this.pendingContexts.delete(callId);

    // Skip processing if there are no future messages
    if (context.nextMessages.length === 0) {
      this.logger.log(`No future messages to process for call ${callId}, skipping analysis`);
      return;
    }

    try {
      this.logger.log(`Processing future context for call ${callId} with ${context.nextMessages.length} next messages`);

      // Get the call details and message from the database
      const call = await this.prisma.calls.findUnique({
        where: { telegramCallId: callId },
        include: {
          messages: {
            where: {
              telegramMessageId: context.messageId.toString()
            }
          }
        }
      });

      if (!call) {
        this.logger.error(`Call ${callId} not found when processing future context`);
        return;
      }

      const callMessage = call.messages[0];
      if (!callMessage) {
        this.logger.error(`Original call message not found for call ${callId}`);
        return;
      }

      // Format the payload for AI analysis
      const aiPayload = {
        callId,
        token: {
          address: call.address,
          name: call.tokenName,
          ticker: call.ticker,
          chain: call.chain
        },
        contextType: 'future' as const,
        callMessage: {
          id: parseInt(callMessage.telegramMessageId),
          text: callMessage.text || null,
          fromId: callMessage.fromId,
          date: callMessage.createdAt.toISOString(),
          messageType: 'call' as const
        },
        messages: context.nextMessages
          .sort((a, b) => a.id - b.id)
          .map(msg => ({
            id: msg.id,
            text: msg.text || null,
            fromId: msg.fromId,
            date: msg.date,
            messageType: 'future' as const
          }))
      };

      // Log what will be sent to AI
      this.logger.log('Future context AI payload:', {
        endpoint: '/telegram-analytics/analyze-context',
        method: 'POST',
        payload: aiPayload
      });

      // Send to AI endpoint for analysis
      const aiResponse = await this.aiService.analyzeContext(aiPayload);

      // Store future context AI analysis in the database
      await this.prisma.calls.update({
        where: { telegramCallId: callId },
        data: {
          futureAnalysis: JSON.stringify(aiResponse)
        }
      });

      this.logger.log(`Stored future analysis for call ${callId}`);

    } catch (error) {
      this.logger.error(`Failed to process future context for call ${callId}: ${error.message}`);
    }
  }
} 