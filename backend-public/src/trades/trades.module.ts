import { Module } from '@nestjs/common';
import { TradesService } from './trades.service';
import { TradesResolver } from './trades.resolver';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [TradesService, TradesResolver, PrismaService],
  exports: [TradesService],
})
export class TradesModule {} 