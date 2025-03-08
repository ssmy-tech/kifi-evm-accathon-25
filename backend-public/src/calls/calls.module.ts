import { Module } from '@nestjs/common';
import { CallsService } from './calls.service';
import { CallsResolver } from './calls.resolver';
import { PrismaService } from '../prisma.service';

@Module({
  providers: [CallsService, CallsResolver, PrismaService],
  exports: [CallsService],
})
export class CallsModule {} 