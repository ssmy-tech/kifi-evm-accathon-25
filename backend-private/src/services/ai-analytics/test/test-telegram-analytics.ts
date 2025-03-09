import { Test, TestingModule } from '@nestjs/testing';
import { TelegramAnalyticsService } from '../telegram-analytics/telegram-analytics.service';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import { HttpException } from '@nestjs/common';
import { AnalysisResult } from '../telegram-analytics/types';

describe('TelegramAnalyticsService', () => {
  let service: TelegramAnalyticsService;
  let prisma: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [TelegramAnalyticsService, ConfigService, PrismaService],
    }).compile();

    service = module.get<TelegramAnalyticsService>(TelegramAnalyticsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('analyzeContractMessages', () => {
    const mockCalls = [{
      telegramCallId: 'call1',
      createdAt: new Date(),
      address: '0x1234567890abcdef',
      messages: [
        {
          telegramMessageId: 'msg1',
          text: 'When moon?',
          createdAt: new Date(),
          tgChatId: 'chat1',
          fromId: JSON.stringify({ username: 'crypto_lover' }),
        },
        {
          telegramMessageId: 'msg2',
          text: 'Great project!',
          createdAt: new Date(),
          tgChatId: 'chat1',
          fromId: JSON.stringify({ first_name: 'John', last_name: 'Doe' }),
        },
      ],
    }];

    it('throws HttpException when no calls found', async () => {
      jest.spyOn(prisma.calls, 'findMany').mockResolvedValue([]);
      await expect(service.analyzeContractMessages('0x1234567890abcdef')).rejects.toThrow(HttpException);
    });

    it('returns analysis result for valid contract', async () => {
      jest.spyOn(prisma.calls, 'findMany').mockResolvedValue(mockCalls as any);
      const result = await service.analyzeContractMessages('0x1234567890abcdef');

      expect(result).toBeDefined();
      expect(result).toMatchObject<AnalysisResult>({
        summary: expect.any(String),
        sentiment: {
          overall: expect.any(String),
          communityMood: expect.stringMatching(/^(positive|negative|neutral|mixed)$/),
          details: expect.any(Array)
        },
        keyTopics: expect.arrayContaining([
          expect.objectContaining({
            topic: expect.any(String),
            frequency: expect.any(Number),
            context: expect.any(String)
          })
        ]),
        nextSteps: expect.arrayContaining([
          expect.objectContaining({
            suggestion: expect.any(String),
            context: expect.any(String)
          })
        ])
      });

      // Additional specific checks
      result.keyTopics.forEach(topic => {
        expect(topic.frequency).toBeGreaterThanOrEqual(0);
        expect(topic.frequency).toBeLessThanOrEqual(100);
      });
    });

    it('handles date filters correctly', async () => {
      const startDate = '2024-01-01';
      const endDate = '2024-03-14';
      const findManySpy = jest.spyOn(prisma.calls, 'findMany').mockResolvedValue([]);

      await expect(service.analyzeContractMessages('0x1234567890abcdef', startDate, endDate))
        .rejects.toThrow(HttpException);

      expect(findManySpy).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          createdAt: { gte: new Date(startDate), lte: new Date(endDate) },
        }),
      }));
    });

    it('respects the limit parameter', async () => {
      const findManySpy = jest.spyOn(prisma.calls, 'findMany').mockResolvedValue([]);
      await expect(service.analyzeContractMessages('0x1234567890abcdef', undefined, undefined, 5))
        .rejects.toThrow(HttpException);

      expect(findManySpy).toHaveBeenCalledWith(expect.objectContaining({ take: 5 }));
    });
  });
}); 