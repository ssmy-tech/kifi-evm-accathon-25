import { NestFactory } from '@nestjs/core';
import { ChatScraperModule } from './chat-scraper.module';

async function bootstrap() {
  const app = await NestFactory.createApplicationContext(ChatScraperModule);
  // We don't listen on any port since this is a background service
  await app.init();
} 