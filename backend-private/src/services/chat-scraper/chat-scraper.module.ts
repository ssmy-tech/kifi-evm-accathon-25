import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonConfigModule } from '../../common/config.module';
import { ChatScraperService } from './chat-scraper.service';

@Module({
  imports: [
    CommonConfigModule,
    ScheduleModule.forRoot(),
  ],
  providers: [ChatScraperService],
})
export class ChatScraperModule {} 