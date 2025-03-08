import { Injectable, Logger } from '@nestjs/common';
import axios, { AxiosInstance } from 'axios';
import { TelegramChat, TelegramMessage, TelegramApiResponse } from './types/telegram.types';

@Injectable()
export class TelegramApiService {
  private readonly logger = new Logger(TelegramApiService.name);
  private readonly apiClient: AxiosInstance;

  constructor() {
    this.apiClient = axios.create({
      timeout: 10000, // 10 seconds
      headers: {
        'Content-Type': 'application/json',
      },
    });
  }

  async getChats(apiEndpoint: string, apiToken: string): Promise<TelegramApiResponse<TelegramChat>> {
    try {
      const response = await this.apiClient.get(`${apiEndpoint}/api/telegram/chats`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
      });
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch chats: ${error.message}`);
      throw error;
    }
  }

  async getMessages(
    apiEndpoint: string,
    apiToken: string,
    chatId: string,
    options: {
      limit?: number;
      fromMessageId?: string | number;
      direction?: 'before' | 'after';
    } = {},
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    try {
      const { limit = 100, fromMessageId, direction } = options;
      const response = await this.apiClient.get(`${apiEndpoint}/api/telegram/messages`, {
        headers: {
          Authorization: `Bearer ${apiToken}`,
        },
        params: {
          chatId,
          limit,
          ...(fromMessageId && { fromMessageId, direction }),
        },
      });
    //   this.logger.log(response.data);
      return response.data;
    } catch (error) {
      this.logger.error(`Failed to fetch messages for chat ${chatId}: ${error.message}`);
      throw error;
    }
  }

  async getNewMessages(
    apiEndpoint: string,
    apiToken: string,
    chatId: string,
    lastMessageId?: string | number,
  ): Promise<TelegramApiResponse<TelegramMessage>> {
    try {
      if (!lastMessageId) {
        // If no last message ID, get the most recent messages
        return this.getMessages(apiEndpoint, apiToken, chatId, { limit: 100 });
      }

      // Get messages after the last processed message
      return this.getMessages(apiEndpoint, apiToken, chatId, {
        fromMessageId: lastMessageId,
        direction: 'after',
        limit: 100,
      });
    } catch (error) {
      this.logger.error(`Failed to fetch new messages for chat ${chatId}: ${error.message}`);
      throw error;
    }
  }
} 