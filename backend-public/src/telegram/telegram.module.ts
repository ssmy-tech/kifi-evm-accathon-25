import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramResolver } from './telegram.resolver';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule],
  providers: [TelegramService, TelegramResolver],
  exports: [TelegramService],
})
export class TelegramModule {} 