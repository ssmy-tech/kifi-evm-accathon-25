import { Injectable, Logger } from '@nestjs/common';
import { ChatScraperConfigService } from './config.service';
import axios from 'axios';
import { TelegramMessage } from './types/telegram.types';
import { Chain } from '@prisma/client';

interface ContextAnalysisPayload {
  callId: string;
  token: {
    address: string;
    name: string | null;
    ticker: string | null;
    chain: Chain;
  };
  contextType: 'initial' | 'future';
  callMessage: {
    id: number;
    text: string | null;
    fromId: any;
    date: string;
    messageType: 'call';
  };
  messages: Array<{
    id: number;
    text: string | null;
    fromId: any;
    date: string;
    messageType: string;
  }>;
}

interface ContextAnalysisResponse {
  relatedMessageIds: number[];
  matchReason: Array<{
    messageId: number;
    reason: string;
    matchedTerm: string;
  }>;
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);

  constructor(private readonly config: ChatScraperConfigService) {}

  async analyzeContext(payload: ContextAnalysisPayload): Promise<ContextAnalysisResponse> {
    try {
      const response = await axios.post(
        `${this.config.aiApiUrl}/telegram-analytics/analyze-context`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
          },
        }
      );

      return response.data;
    } catch (error) {
      this.logger.error(`Failed to analyze context: ${error.message}`, error.stack);
      throw error;
    }
  }
} 