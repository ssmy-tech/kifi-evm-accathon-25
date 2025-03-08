import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { PrismaService } from '../prisma.service';
import { ChatType } from '@prisma/client';
import { S3Service } from '../s3/s3.service';
import axios from 'axios';

interface TelegramChat {
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
      return {
        chats: response.data.data.map(chat => ({
          id: chat.id,
          name: chat.name,
          type: chat.type,
          photoUrl: chat.avatar
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

        // Generate the expected S3 URL for the photo
        const s3Key = `chat-photos/${chatId}.jpg`;
        const expectedPhotoUrl = `https://${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;
        let photoUrl: string = 'no-photo';

        try {
          // Try to fetch from Telegram and upload to S3 if needed
          photoUrl = await this.getChatPhoto(privyId, chatId);
        } catch (error) {
          console.error(`Failed to handle photo for chat ${chatId}:`, error);
        }

        // Upsert the chat with all details
        const savedChat = await this.prisma.chats.upsert({
          where: { tgChatId: chatId },
          create: {
            tgChatId: chatId,
            tgChatName: chatDetails.name,
            tgChatType: this.mapToChatType(chatDetails.type),
            tgChatImageUrl: photoUrl === 'no-photo' ? null : photoUrl,
            users: {
              connect: { privyId }
            }
          },
          update: {
            tgChatName: chatDetails.name,
            tgChatType: this.mapToChatType(chatDetails.type),
            tgChatImageUrl: photoUrl === 'no-photo' ? null : photoUrl,
            users: {
              connect: { privyId }
            }
          }
        });

        return savedChat;
      })
    );

    // Filter out nulls and format response
    const validChats = savedChats.filter(chat => chat !== null);
    return {
      chats: validChats.map(chat => ({
        id: chat.tgChatId,
        name: chat.tgChatName || '',
        type: chat.tgChatType.toLowerCase(),
        photoUrl: chat.tgChatImageUrl
      }))
    };
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
      chats: savedChats.map(chat => ({
        id: chat.tgChatId,
        name: chat.tgChatName || '',
        type: chat.tgChatType.toLowerCase(),
        photoUrl: chat.tgChatImageUrl
      }))
    };
  }
} 