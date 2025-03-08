import { NestFactory } from '@nestjs/core';
import { ChatScraperModule } from './chat-scraper.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('ChatScraperBootstrap');
  logger.log('Starting Chat Scraper Service...');

  const app = await NestFactory.create(ChatScraperModule);
  await app.init();
  
  app.enableShutdownHooks();

  process.on('SIGINT', async () => {
    logger.log('Shutting down...');
    await app.close();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    logger.log('Shutting down...');
    await app.close();
    process.exit(0);
  });

  logger.log('Chat Scraper Service is running');
}

bootstrap().catch(err => {
  console.error('Failed to start Chat Scraper Service:', err);
  process.exit(1);
}); 