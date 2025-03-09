import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TwitterAnalyticsService } from './twitter-analytics.service';

@Module({
  imports: [
    ConfigModule,
  ],
  providers: [TwitterAnalyticsService],
  exports: [TwitterAnalyticsService],
})
export class TwitterAnalyticsModule {} 