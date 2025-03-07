import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonConfigModule } from '../../common/config.module';
import { AiAnalyticsService } from './ai-analytics.service';

@Module({
  imports: [
    CommonConfigModule,
    ScheduleModule.forRoot(),
  ],
  providers: [AiAnalyticsService],
})
export class AiAnalyticsModule {} 