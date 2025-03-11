import { NestFactory } from '@nestjs/core';
import { TradeExecutorModule } from './trade-executor.module';

async function bootstrap() {
  const app = await NestFactory.create(TradeExecutorModule);
  await app.listen(3004); // Make sure this port doesn't conflict with other services
}
bootstrap(); 