import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { ChatType } from '@prisma/client';
import axios from 'axios';

interface TelegramPhotoResponse {
  photoUrl: string;
}

interface TelegramChat {
  id: string;
  name: string;
  type: string; // 'channel' | 'group' | 'user'
}

interface TelegramChatsResponse {
  channels: TelegramChat[];
}

interface SaveChatsInput {
  chatIds: string[];
}

@Injectable()
export class TelegramService {
  private readonly MAX_REQUESTS_PER_SECOND = 20;
  private lastRequestTime = Date.now();
  private requestCount = 0;

  constructor(
    private readonly usersService: UsersService,
    private readonly prisma: PrismaService,
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

  async updateApiLink(privyId: string, apiLink: string) {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.usersService.updateTelegramApi(privyId, apiLink);
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
      const response = await axios.post(
        `${user.tgApiLink}/api/health`,
        {},
        {
          headers: {
            'Authorization': `Bearer ${user.tgApiSecret}`,
          },
        }
      );
      return { status: response.status === 200 ? 'healthy' : 'unhealthy' };
    } catch (error) {
      return { status: 'unhealthy', error: error.message };
    }
  }

  async getChatPhoto(privyId: string, chatId: string): Promise<string | null> {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user || !user.tgApiLink) {
      throw new UnauthorizedException('User or API link not found');
    }

    try {
      await this.rateLimit();
      const response = await axios.get<TelegramPhotoResponse>(
        `${user.tgApiLink}/api/chats/${chatId}/photo`,
        {
          headers: {
            'Authorization': `Bearer ${user.tgApiSecret}`,
          },
        }
      );
      return response.data.photoUrl || null;
    } catch (error) {
      console.error(`Failed to fetch photo for chat ${chatId}:`, error.message);
      return null;
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
        `${user.tgApiLink}/api/chats`,
        {
          headers: {
            'Authorization': `Bearer ${user.tgApiSecret}`,
          },
        }
      );

      return {
        channels: response.data.channels.map(chat => ({
          id: chat.id,
          name: chat.name,
          type: chat.type
        }))
      };
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${error.message}`);
    }
  }

  private async getChatDetails(user: any, chatId: string): Promise<TelegramChat | null> {
    try {
      await this.rateLimit();
      const response = await axios.get<TelegramChatsResponse>(
        `${user.tgApiLink}/api/chats`,
        {
          headers: {
            'Authorization': `Bearer ${user.tgApiSecret}`,
          },
        }
      );

      // Find the specific chat in the response
      const chatDetails = response.data.channels.find(chat => chat.id === chatId);
      return chatDetails || null;
    } catch (error) {
      console.error(`Failed to fetch chat details for ${chatId}:`, error.message);
      return null;
    }
  }

  async createUserSavedChats(privyId: string, input: SaveChatsInput) {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    // Create or connect chats and link them to the user
    const savedChats = await Promise.all(
      input.chatIds.map(async (chatId) => {
        // Get chat details from Telegram API
        const chatDetails = await this.getChatDetails(user, chatId);
        if (!chatDetails) {
          console.error(`Could not fetch details for chat ${chatId}`);
          return null;
        }

        // Get chat photo
        const photoUrl = await this.getChatPhoto(privyId, chatId);

        // Upsert the chat with all details
        return this.prisma.chats.upsert({
          where: { tgChatId: chatId },
          create: {
            tgChatId: chatId,
            tgChatName: chatDetails.name,
            tgChatImage: photoUrl,
            tgChatType: this.mapToChatType(chatDetails.type),
            users: {
              connect: { privyId }
            }
          },
          update: {
            tgChatName: chatDetails.name,
            tgChatImage: photoUrl,
            tgChatType: this.mapToChatType(chatDetails.type),
            users: {
              connect: { privyId }
            }
          }
        });
      })
    );

    // Filter out any nulls from failed chat fetches
    return savedChats.filter(chat => chat !== null);
  }

  async getUserSavedChats(privyId: string) {
    const user = await this.usersService.findByPrivyUserIdFull(privyId);
    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const savedChats = await this.prisma.chats.findMany({
      where: {
        users: {
          some: {
            privyId
          }
        }
      },
      include: {
        users: true
      }
    });

    return {
      channels: savedChats.map(chat => ({
        id: chat.tgChatId,
        name: chat.tgChatName || '',
        type: chat.tgChatType.toLowerCase(),
        photoUrl: chat.tgChatImage || null
      }))
    };
  }
} 