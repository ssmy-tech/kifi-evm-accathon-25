import { NestFactory } from '@nestjs/core';
import { AiAnalyticsModule } from './ai-analytics.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(AiAnalyticsModule);
  await app.init();
}

bootstrap(); 