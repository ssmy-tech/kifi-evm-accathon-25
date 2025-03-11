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

interface RateLimitInfo {
  lastRequest: Date;
  requestCount: number;
}

class SingleRequestQueue {
  private queue: Array<{
    task: () => Promise<any>;
    resolve: (value: any) => void;
    reject: (error: any) => void;
  }> = [];
  private isProcessing = false;

  async add<T>(task: () => Promise<T>): Promise<T> {
    const currentQueueSize = this.queue.length;
    if (currentQueueSize > 0) {
      console.log(`AI Queue size: ${currentQueueSize}`);
    }
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.processNext();
    });
  }

  private async processNext() {
    if (this.isProcessing || this.queue.length === 0) {
      return;
    }

    this.isProcessing = true;
    const { task, resolve, reject } = this.queue.shift()!;

    try {
      const result = await task();
      resolve(result);
    } catch (error) {
      reject(error);
    } finally {
      await new Promise(resolve => setTimeout(resolve, 5000));
      this.isProcessing = false;
      this.processNext();
    }
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  get isActive(): boolean {
    return this.isProcessing;
  }
}

@Injectable()
export class AiService {
  private readonly logger = new Logger(AiService.name);
  private readonly MAX_REQUESTS_PER_MINUTE = 30;
  private readonly RATE_LIMIT_WINDOW_MS = 60000;
  private readonly REQUEST_TIMEOUT_MS = 120000;
  private rateLimitInfo: RateLimitInfo = {
    lastRequest: new Date(),
    requestCount: 0
  };
  private requestQueue: SingleRequestQueue;

  constructor(private readonly config: ChatScraperConfigService) {
    this.logger.log(`AI API URL configured as: "${this.config.aiApiUrl}"`);
    this.requestQueue = new SingleRequestQueue();
  }

  private isRateLimited(): boolean {
    const now = new Date();
    const timeSinceLastWindow = now.getTime() - this.rateLimitInfo.lastRequest.getTime();

    if (timeSinceLastWindow > this.RATE_LIMIT_WINDOW_MS) {
      this.rateLimitInfo = {
        lastRequest: now,
        requestCount: 1
      };
      return false;
    }

    if (this.rateLimitInfo.requestCount >= this.MAX_REQUESTS_PER_MINUTE) {
      return true;
    }

    this.rateLimitInfo.requestCount++;
    return false;
  }

  private async waitForRateLimit(): Promise<void> {
    while (this.isRateLimited()) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  async analyzeContext(payload: ContextAnalysisPayload): Promise<ContextAnalysisResponse> {
    return this.requestQueue.add(async () => {
      await this.waitForRateLimit();
      
      try {
        const response = await axios.post(
          `${this.config.aiApiUrl}/telegram-analytics/analyze-context`,
          payload,
          {
            headers: {
              'Content-Type': 'application/json',
            },
            timeout: this.REQUEST_TIMEOUT_MS,
          }
        );

        const result = response.data;
        if (result.relatedMessageIds.length > 0) {
          console.log(`✓ ${payload.contextType} analysis: ${result.relatedMessageIds.length} messages for ${payload.token.address}`);
        }
        return result;
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          console.error(`✗ ${payload.contextType} timeout: ${payload.token.address}`);
        } else {
          console.error(`✗ ${payload.contextType} failed: ${payload.token.address}`);
        }
        throw error;
      }
    });
  }
} 