import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { CommonConfigModule } from '../../common/config.module';
import { ApiHealthService } from './api-health.service';

@Module({
  imports: [
    CommonConfigModule,
    ScheduleModule.forRoot(),
  ],
  providers: [ApiHealthService],
})
export class ApiHealthModule {} 