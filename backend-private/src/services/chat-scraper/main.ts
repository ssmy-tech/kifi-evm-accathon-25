import { NestFactory } from '@nestjs/core';
import { ChatScraperModule } from './chat-scraper.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('ChatScraperBootstrap');
  logger.log('Starting Chat Scraper Service...');

  const app = await NestFactory.create(ChatScraperModule);
  await app.init();
  
  app.enableShutdownHooks();

  // Get port from environment variable or use default
  const port = process.env.PORT || 5000;
  
  await app.listen(port, '0.0.0.0');
  logger.log(`Chat Scraper service is running on port ${port}`);

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
}

bootstrap().catch(err => {
  console.error('Failed to start Chat Scraper Service:', err);
  process.exit(1);
}); 