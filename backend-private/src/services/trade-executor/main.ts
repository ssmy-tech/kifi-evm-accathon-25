import { NestFactory } from '@nestjs/core';
import { TradeExecutorModule } from './trade-executor.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('TradeExecutor');
  const app = await NestFactory.create(TradeExecutorModule, {
    logger: ['error', 'warn', 'log', 'debug', 'verbose'],
  });
  
  logger.log('Starting Trade Executor Service...');
  await app.listen(3004, '0.0.0.0');
  logger.log('Trade Executor Service is running on port 3004');
}

bootstrap(); 