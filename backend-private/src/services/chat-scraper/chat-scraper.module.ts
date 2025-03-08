import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonConfigModule } from '../../common/config.module';
import { BlockchainModule } from '../../common/blockchain/blockchain.module';
import { ChatScraperService } from './chat-scraper.service';
import { ChatScraperConfigService } from './config.service';
import { TelegramApiService } from './telegram-api.service';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    CommonConfigModule,
    BlockchainModule,
    ScheduleModule.forRoot(),
    HealthModule,
  ],
  providers: [
    ChatScraperService,
    ChatScraperConfigService,
    TelegramApiService,
  ],
})
export class ChatScraperModule {} 