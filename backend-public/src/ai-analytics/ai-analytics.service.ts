import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma.service';
import { TelegramAnalyticsResponse, TelegramContractAnalyticsInput, TwitterAnalyticsResponse, TwitterContractAnalyticsInput } from './dto/ai-analytics.types';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { Chain, SummaryType, Prisma } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

interface BaseAnalyticsResponse {
  summary: string;
  sentiment: {
    overall: string;
    communityMood: string;
    details: string[];
  };
  keyTopics: Array<{
    topic: string;
    frequency: number;
    context: string;
  }>;
  nextSteps: Array<{
    suggestion: string;
    context: string;
  }>;
}

interface TwitterApiResponse extends BaseAnalyticsResponse {
  relevantTweets: Array<{
    url: string;
    text: string;
    author: string;
    timestamp: string;
    engagement: {
      likes: number;
      retweets: number;
      replies: number;
      views: number;
    };
  }>;
}

interface TelegramApiResponse extends BaseAnalyticsResponse {}

const GENERATION_COOLDOWN = 5 * 60 * 1000; // 5 minutes in milliseconds

@Injectable()
export class AiAnalyticsService {
  private readonly analyticsUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.analyticsUrl = this.configService.get<string>('ANALYTICS_URL') || 'http://localhost:9000';
  }

  private calculateTimeUntilNextGeneration(lastGeneratedAt: Date | null): number {
    if (!lastGeneratedAt) return 0;
    
    const timeSinceLastGeneration = Date.now() - lastGeneratedAt.getTime();
    const timeUntilNext = Math.max(0, GENERATION_COOLDOWN - timeSinceLastGeneration);
    
    return Math.ceil(timeUntilNext / 1000); // Convert to seconds
  }

  async getTwitterContractAnalytics(input: TwitterContractAnalyticsInput): Promise<TwitterAnalyticsResponse> {
    try {
      // Check for existing summary
      const existingSummary = await this.prisma.summary.findFirst({
        where: {
          address: input.contractAddress,
          summaryType: SummaryType.Twitter,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const timeUntilNext = this.calculateTimeUntilNextGeneration(existingSummary?.createdAt || null);

      // If we have a recent summary, return it
      if (existingSummary && timeUntilNext > 0) {
        const parsedData = JSON.parse(existingSummary.summary) as TwitterApiResponse;
        return {
          ...parsedData,
          timeUntilNextGeneration: timeUntilNext,
          lastGeneratedAt: existingSummary.createdAt,
        };
      }

      // If no recent summary exists or it's expired, generate a new one
      const url = `${this.analyticsUrl}/twitter-analytics/contract/${input.contractAddress}`;
      const response = await axios.get<TwitterApiResponse>(url);

      // Store the new summary
      const summaryData: Prisma.SummaryCreateInput = {
        id: uuidv4(),
        privyId: '', // Twitter analytics doesn't require privyId
        address: input.contractAddress,
        summaryType: SummaryType.Twitter,
        summary: JSON.stringify(response.data),
        Blockchain: Chain.BASE, // Required field, using BASE as default
      };

      const newSummary = await this.prisma.summary.create({
        data: summaryData,
      });

      return {
        ...response.data,
        timeUntilNextGeneration: GENERATION_COOLDOWN / 1000,
        lastGeneratedAt: newSummary.createdAt,
      };
    } catch (error: any) {
      console.error('Error getting twitter contract analytics:', error);
      if (error?.response?.status) {
        if (error.response.status === 404) {
          throw new Error(`No Twitter data found for contract: ${input.contractAddress}`);
        }
        throw new Error(`Twitter analytics API error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error('Failed to get twitter contract analytics');
    }
  }

  async getTelegramContractAnalytics(input: TelegramContractAnalyticsInput, privyId: string): Promise<TelegramAnalyticsResponse> {
    try {
      // Check for existing summary
      const existingSummary = await this.prisma.summary.findFirst({
        where: {
          privyId,
          address: input.contractAddress,
          summaryType: SummaryType.Telegram,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const timeUntilNext = this.calculateTimeUntilNextGeneration(existingSummary?.createdAt || null);

      // If we have a recent summary, return it
      if (existingSummary && timeUntilNext > 0) {
        const parsedData = JSON.parse(existingSummary.summary) as TelegramApiResponse;
        return {
          ...parsedData,
          timeUntilNextGeneration: timeUntilNext,
          lastGeneratedAt: existingSummary.createdAt,
        };
      }

      // If no recent summary exists or it's expired, generate a new one
      const url = `${this.analyticsUrl}/telegram-analytics/contract/${input.contractAddress}/privy/${privyId}`;
      const response = await axios.get<TelegramApiResponse>(url);

      // Store the new summary
      const summaryData: Prisma.SummaryCreateInput = {
        id: uuidv4(),
        privyId,
        address: input.contractAddress,
        summaryType: SummaryType.Telegram,
        summary: JSON.stringify(response.data),
        Blockchain: Chain.BASE, // Required field, using BASE as default
      };

      const newSummary = await this.prisma.summary.create({
        data: summaryData,
      });

      return {
        ...response.data,
        timeUntilNextGeneration: GENERATION_COOLDOWN / 1000,
        lastGeneratedAt: newSummary.createdAt,
      };
    } catch (error: any) {
      console.error('Error getting telegram contract analytics:', error);
      if (error?.response?.status) {
        if (error.response.status === 404) {
          throw new Error(`No Telegram data found for contract: ${input.contractAddress}`);
        } else if (error.response.status === 401) {
          throw new Error('Unauthorized: Please check your Telegram API configuration');
        } else if (error.response.status === 403) {
          throw new Error('Access forbidden: Please check your Telegram API permissions');
        }
        throw new Error(`Telegram analytics API error: ${error.response?.data?.message || error.message}`);
      }
      throw new Error('Failed to get telegram contract analytics');
    }
  }
} 