import { NestFactory } from '@nestjs/core';
import { ApiHealthModule } from './api-health.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ApiHealthModule);
  await app.init();
}

bootstrap(); 