import { Injectable, Logger, OnModuleInit, Controller, Get } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaClient } from '@prisma/client';
import { BlockchainService } from '../../common/blockchain/blockchain.service';
import { ChatScraperConfigService } from './config.service';
import { TelegramApiService } from './telegram-api.service';
import { TelegramMessage } from './types/telegram.types';
import { Chain } from '@prisma/client';

interface RateLimitInfo {
  lastRequest: Date;
  requestCount: number;
}

@Injectable()
@Controller('health')
export class ChatScraperService implements OnModuleInit {
  private readonly logger = new Logger(ChatScraperService.name);
  private readonly prisma: PrismaClient;
  private readonly rateLimits: Map<string, RateLimitInfo> = new Map();
  private readonly MAX_REQUESTS_PER_MINUTE = 200; // Adjust this based on API limits
  private readonly RATE_LIMIT_WINDOW_MS = 60000; // 1 minute

  constructor(
    private readonly blockchainService: BlockchainService,
    private readonly config: ChatScraperConfigService,
    private readonly telegramApi: TelegramApiService,
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

  @Cron('*/15 * * * * *') // Runs every 15 seconds
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
          const oneHourBeforeReference = new Date(referenceTime.getTime() - 60 * 60 * 1000);
          
          let oldestMessageId = mostRecentMessage.id;
          let reachedOneHourOld = false;
          let totalFetched = 0;

          messages.push(mostRecentMessage);
          totalFetched++;

          while (!reachedOneHourOld && totalFetched < 1000) {
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

            const batch = response.data;
            
            if (batch.length === 0) {
              break;
            }

            const validBatch = batch.filter(msg => msg && msg.date && typeof msg.date === 'string');
            if (validBatch.length === 0) {
              break;
            }

            const oldMessages = validBatch.filter(msg => new Date(msg.date) < oneHourBeforeReference);
            if (oldMessages.length > 0) {
              const newMessages = validBatch.filter(msg => new Date(msg.date) >= oneHourBeforeReference);
              messages.push(...newMessages);
              reachedOneHourOld = true;
            } else {
              messages.push(...validBatch);
              oldestMessageId = validBatch[validBatch.length - 1].id;
              totalFetched += validBatch.length;
            }
          }
          
          // Sort messages by ID in ascending order
          messages.sort((a, b) => a.id - b.id);
          this.logger.log(`Found ${messages.length} messages in the last hour for new chat ${chat.tgChatName || chat.tgChatId}`);
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
                // Process fromId to ensure it's a valid JSON value
                const fromIdJson = message.fromId ? 
                  (typeof message.fromId === 'string' ? 
                    message.fromId : 
                    JSON.parse(JSON.stringify(message.fromId))) : 
                  null;
                
                // Create call record with metadata
                await this.prisma.calls.create({
                  data: {
                    telegramCallId: `${message.id}_${address}`,
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
              } catch (error) {
                this.logger.error(`Failed to create call record: ${error.message}`);
              }
            }
          } catch (error) {
            this.logger.error(`Error verifying contract ${address}: ${error.message}`);
          }
        }
      }
    }
  }
} 