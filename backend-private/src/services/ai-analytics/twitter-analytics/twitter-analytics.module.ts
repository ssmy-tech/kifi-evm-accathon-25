import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../../../prisma/prisma.module';
import { TwitterAnalyticsService } from './twitter-analytics.service';
import { TwitterAnalyticsController } from './twitter-analytics.controller';

@Module({
  imports: [ConfigModule, PrismaModule],
  controllers: [TwitterAnalyticsController],
  providers: [TwitterAnalyticsService],
  exports: [TwitterAnalyticsService],
})
export class TwitterAnalyticsModule {} 