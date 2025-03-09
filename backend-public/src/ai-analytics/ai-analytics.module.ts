import { Module } from '@nestjs/common';
import { AiAnalyticsService } from './ai-analytics.service';
import { AiAnalyticsResolver } from './ai-analytics.resolver';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [AiAnalyticsService, AiAnalyticsResolver, PrismaService],
  exports: [AiAnalyticsService],
})
export class AiAnalyticsModule {} 