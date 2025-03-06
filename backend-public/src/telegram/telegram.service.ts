import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import axios from 'axios';

interface TelegramPhotoResponse {
  photoUrl: string;
}

interface TelegramChat {
  id: string;
  name: string;
}

interface TelegramChatsResponse {
  channels: TelegramChat[];
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

  private async fetchChatPhoto(user: any, chatId: string): Promise<string | null> {
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

  private async syncChat(user: any, chat: TelegramChat) {
    const existingChat = await this.prisma.chats.findUnique({
      where: { tgChatId: chat.id },
    });

    // If chat doesn't exist or doesn't have an image, fetch the photo
    if (!existingChat || !existingChat.tgChatImage) {
      const photoUrl = await this.fetchChatPhoto(user, chat.id);
      
      // Upsert the chat with new data
      return this.prisma.chats.upsert({
        where: { tgChatId: chat.id },
        create: {
          tgChatId: chat.id,
          tgChatName: chat.name,
          tgChatImage: photoUrl,
          users: {
            connect: { privyId: user.privyId }
          }
        },
        update: {
          tgChatName: chat.name,
          tgChatImage: photoUrl || existingChat?.tgChatImage,
          users: {
            connect: { privyId: user.privyId }
          }
        }
      });
    }

    return existingChat;
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

      // Sync each chat with our database
      const syncPromises = response.data.channels.map((chat: TelegramChat) => 
        this.syncChat(user, chat)
      );
      
      const syncedChats = await Promise.all(syncPromises);

      // Return the synced chats
      return {
        channels: syncedChats.map(chat => ({
          id: chat.tgChatId,
          name: chat.tgChatName || '',
          type: 'channel',
          photoUrl: chat.tgChatImage || null
        }))
      };
    } catch (error) {
      throw new Error(`Failed to fetch chats: ${error.message}`);
    }
  }
} 