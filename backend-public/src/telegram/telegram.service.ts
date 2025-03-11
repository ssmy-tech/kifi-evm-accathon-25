import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { ChatType } from '@prisma/client';
import { S3Service } from '../s3/s3.service';
import axios from 'axios';
import { TelegramChat, ChatsResponse, SaveChatsInput } from './dto/telegram.types';

interface TelegramChatResponse {
  id: string;
  name: string;
  type: string; // 'channel' | 'group' | 'user'
}

interface TelegramChatsResponse {
  data: Array<{
    id: string;
    name: string;
    type: string;
    unreadCount: number;
    avatar: string;
  }>;
}

@Injectable()
export class TelegramService {
  private readonly MAX_REQUESTS_PER_SECOND = 20;
  private lastRequestTime = Date.now();
  private requestCount = 0;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
    private readonly s3Service: S3Service,
  ) {}

  private mapToChatType(type: string): ChatType {
    switch (type.toLowerCase()) {
      case 'channel':
        return ChatType.Channel;
      case 'group':
        return ChatType.Group;
      case 'user':
        return ChatType.User;
      default:
        return ChatType.Channel; // fallback
    }
  }

  private async rateLimit() {
    this.requestCount++;
    const now = Date.now();
    const elapsedTime = now - this.lastRequestTime;

    // Reset counter every second
    if (elapsedTime >= 1000) {
      this.requestCount = 1;
      this.lastRequestTime = now;
      return;
    }

    // If we've hit the limit, wait until the next second
    if (this.requestCount >= this.MAX_REQUESTS_PER_SECOND) {
      const delayMs = 1000 - elapsedTime;
      await new Promise(resolve => setTimeout(resolve, delayMs));
      this.requestCount = 1;
      this.lastRequestTime = Date.now();
    }
  }

  async updateApiLink(privyId: string, apiLink: string): Promise<boolean> {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    try {
      await this.usersService.updateTelegramApi(privyId, apiLink);
      return true;
    } catch (error) {
      console.error('Failed to update Telegram API:', error);
      return false;
    }
  }

  async getApiSecret(privyId: string) {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return { apiSecret: user.tgApiSecret };
  }

  async checkApiHealth(privyId: string) {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user || !user.tgApiLink) {
      throw new UnauthorizedException('User or API link not found');
    }

    try {
      await this.rateLimit();
      const response = await axios.get(
        `${user.tgApiLink}/api/health`,
        {
          headers: {
            'Authorization': `Bearer ${user.tgApiSecret}`,
          },
        }
      )
      return { status: response.status === 200 ? 'healthy' : 'unhealthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async getChatPhoto(privyId: string, chatId: string): Promise<string> {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user || !user.tgApiLink) {
      throw new UnauthorizedException('User or API link not found');
    }

    try {
      await this.rateLimit();
      const response = await axios.get(
        `${user.tgApiLink}/api/telegram/photo/${chatId}`,
        {
          headers: {
            'Authorization': `Bearer ${user.tgApiSecret}`,
          },
          responseType: 'arraybuffer'
        }
      );

      // Check if the buffer is empty
      const buffer = Buffer.from(response.data as ArrayBuffer);
      if (buffer.length === 0) {
        return 'no-photo';
      }

      // Upload to S3 with a unique key
      const key = `chat-photos/${chatId}.jpg`;
      const photoUrl = await this.s3Service.uploadBase64Image(buffer, key);
      return photoUrl;
    } catch (error) {
      console.error(`Failed to fetch photo for chat ${chatId}:`, error.message);
      return 'no-photo';
    }
  }

  async getChats(privyId: string) {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user || !user.tgApiLink) {
      throw new UnauthorizedException('User or API link not found');
    }

    try {
      // Fetch chats from Telegram API
      await this.rateLimit();
      const response = await axios.get<TelegramChatsResponse>(
        `${user.tgApiLink}/api/telegram/chats`,
        {
          headers: {
            'Authorization': `Bearer ${user.tgApiSecret}`,
          },
        }
      );

      // Get call information for each chat
      const chatIds = response.data.data.map(chat => chat.id);
      const chatCalls = await this.prisma.chats.findMany({
        where: {
          tgChatId: {
            in: chatIds
          }
        },
        include: {
          calls: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      // Create a map of chat ID to call information
      const callInfoMap = new Map(
        chatCalls.map(chat => [
          chat.tgChatId,
          {
            callCount: chat.calls.length,
            lastCallTimestamp: chat.calls[0]?.createdAt || undefined
          }
        ])
      );

      return {
        chats: response.data.data.map(chat => ({
          id: chat.id,
          name: chat.name,
          type: chat.type,
          photoUrl: chat.avatar || undefined,
          callCount: callInfoMap.get(chat.id)?.callCount || 0,
          lastCallTimestamp: callInfoMap.get(chat.id)?.lastCallTimestamp
        }))
      };
    } catch (error) {
      // Return empty array instead of throwing error
      return { chats: [] };
    }
  }

  private async getChatDetails(user: any, chatId: string): Promise<TelegramChatResponse | null> {
    try {
      await this.rateLimit();
      const response = await axios.get<TelegramChatsResponse>(
        `${user.tgApiLink}/api/telegram/chats`,
        {
          headers: {
            'Authorization': `Bearer ${user.tgApiSecret}`,
          },
        }
      );

      // Find the specific chat in the response
      const chatDetails = response.data.data.find(chat => chat.id === chatId);
      return chatDetails || null;
    } catch (error) {
      console.error(`Failed to fetch chat details for ${chatId}:`, error.message);
      return null;
    }
  }

  async createUserSavedChats(privyId: string, input: SaveChatsInput) {
    try {
      const user = await this.usersService.findByPrivyUserIdFull(privyId);
      if (!user) {
        throw new Error('User not found');
      }

      if (!user.tgApiLink) {
        throw new Error('Telegram API link not set');
      }

      // Get all chat details
      const chatDetails = await Promise.all(
        input.chatIds.map(async (chatId) => {
          const chat = await this.getChatDetails(user, chatId);
          if (!chat) {
            return null;
          }
          return chat;
        }),
      );

      // Filter out null values
      const validChats = chatDetails.filter(
        (chat): chat is TelegramChatResponse => chat !== null,
      );

      // First, disconnect all existing chats from the user
      await this.prisma.user.update({
        where: { privyId },
        data: {
          chats: {
            disconnect: await this.prisma.chats.findMany({
              where: {
                users: {
                  some: {
                    privyId
                  }
                }
              },
              select: {
                tgChatId: true
              }
            }).then(chats => chats.map(chat => ({ tgChatId: chat.tgChatId })))
          }
        }
      });

      // Then, connect or create the new chats
      const savedChats = await Promise.all(
        validChats.map(async (chat) => {
          // Try to get the chat photo
          let photoUrl: string | null = null;
          try {
            photoUrl = await this.getChatPhoto(privyId, chat.id);
          } catch (error) {
            console.error(`Failed to get chat photo for ${chat.id}:`, error);
          }

          // Create or update the chat and connect it to the user
          return this.prisma.chats.upsert({
            where: { tgChatId: chat.id },
            update: {
              tgChatName: chat.name,
              tgChatImageUrl: photoUrl,
              tgChatType: this.mapToChatType(chat.type),
              users: {
                connect: { privyId },
              },
            },
            create: {
              tgChatId: chat.id,
              tgChatName: chat.name,
              tgChatImageUrl: photoUrl,
              tgChatType: this.mapToChatType(chat.type),
              users: {
                connect: { privyId },
              },
            },
          });
        }),
      );

      // Get the updated chats with call information
      const updatedChats = await this.prisma.chats.findMany({
        where: {
          tgChatId: {
            in: savedChats.map(chat => chat.tgChatId)
          }
        },
        include: {
          calls: {
            orderBy: {
              createdAt: 'desc'
            }
          }
        }
      });

      return {
        chats: updatedChats.map((chat) => ({
          id: chat.tgChatId,
          name: chat.tgChatName || '',
          type: chat.tgChatType.toLowerCase(),
          photoUrl: chat.tgChatImageUrl || undefined,
          callCount: chat.calls.length,
          lastCallTimestamp: chat.calls[0]?.createdAt || undefined
        }))
      };
    } catch (error) {
      console.error('Error saving user chats:', error);
      // Return empty array instead of null when there's an error
      return { chats: [] };
    }
  }

  async getUserSavedChats(privyId: string): Promise<ChatsResponse> {
    const chats = await this.prisma.chats.findMany({
      where: {
        users: {
          some: {
            privyId: privyId
          }
        }
      },
      include: {
        calls: {
          where: {
            chat: {
              users: {
                some: {
                  privyId: privyId
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    });

    return {
      chats: chats.map(chat => ({
        id: chat.tgChatId,
        name: chat.tgChatName || '',
        type: chat.tgChatType.toLowerCase(),
        photoUrl: chat.tgChatImageUrl || undefined,
        callCount: chat.calls.length,
        lastCallTimestamp: chat.calls[0]?.createdAt || undefined
      }))
    };
  }
} 