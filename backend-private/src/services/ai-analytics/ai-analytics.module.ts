import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CommonConfigModule } from '../../common/config.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AiAnalyticsService } from './ai-analytics.service';
import { TelegramAnalyticsModule } from './telegram-analytics';
import { TwitterAnalyticsModule } from './twitter-analytics';
import aiAnalyticsConfig from './config/ai-analytics.config';
import { HealthController } from './health/health.controller';
@Module({
  imports: [
    CommonConfigModule,
    ConfigModule.forFeature(aiAnalyticsConfig),
    PrismaModule,
    TelegramAnalyticsModule,
    TwitterAnalyticsModule,
  ],
  controllers: [HealthController],
  providers: [AiAnalyticsService],
})
export class AiAnalyticsModule {} 