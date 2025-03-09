import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TelegramAnalyticsService } from './telegram-analytics.service';
import { TelegramAnalyticsController } from './telegram-analytics.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [TelegramAnalyticsController],
  providers: [TelegramAnalyticsService],
  exports: [TelegramAnalyticsService],
})
export class TelegramAnalyticsModule {} 