import { Module } from '@nestjs/common';
import { TelegramService } from './telegram.service';
import { TelegramResolver } from './telegram.resolver';
import { UsersModule } from '../users/users.module';
import { PrismaService } from '../prisma.service';
import { S3Module } from '../s3/s3.module';

@Module({
  imports: [UsersModule, S3Module],
  providers: [TelegramService, TelegramResolver, PrismaService],
  exports: [TelegramService],
})
export class TelegramModule {} 