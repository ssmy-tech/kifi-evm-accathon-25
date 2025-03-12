import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { PrismaModule } from '../../prisma/prisma.module';
import { TradeExecutorService } from './trade-executor.service';
import { ZeroExService } from './zerox.service';
import { PriceMonitorService } from './price-monitor.service';
import { PrivyService } from './privy.service';
import { HealthController } from './health/health.controller';
@Module({
  imports: [
    ConfigModule.forRoot(),
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot(),
    PrismaModule,
  ],
  controllers: [
    HealthController
  ],
  providers: [
    TradeExecutorService,
    ZeroExService,
    PrivyService,
  ],
})
export class TradeExecutorModule {} 