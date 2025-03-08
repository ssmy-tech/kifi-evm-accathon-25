import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonConfigModule } from '../../common/config.module';
import { BlockchainModule } from '../../common/blockchain/blockchain.module';
import { ChatScraperService } from './chat-scraper.service';
import { ChatScraperConfigService } from './config.service';
import { TelegramApiService } from './telegram-api.service';
import { HealthController } from '../../health.controller';

@Module({
  imports: [
    CommonConfigModule,
    BlockchainModule,
    ScheduleModule.forRoot(),
  ],
  controllers: [
    HealthController
  ],
  providers: [
    ChatScraperService,
    ChatScraperConfigService,
    TelegramApiService,
  ],
})
export class ChatScraperModule {} 