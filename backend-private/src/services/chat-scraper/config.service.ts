import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class ChatScraperConfigService {
  constructor(private readonly configService: ConfigService) {}

  get databaseUrl(): string {
    return this.configService.getOrThrow<string>('DATABASE_URL');
  }

  get scanIntervalMs(): number {
    return this.configService.get<number>('CHAT_SCAN_INTERVAL_MS', 15000); // default 1 minute
  }

  get maxMessagesPerScan(): number {
    return this.configService.get<number>('MAX_MESSAGES_PER_SCAN', 100);
  }

  get aiApiUrl(): string {
    return this.configService.getOrThrow<string>('AI_API_URL');
  }
} 