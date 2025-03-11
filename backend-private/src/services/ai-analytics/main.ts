import { NestFactory } from '@nestjs/core';
import { AiAnalyticsModule } from './ai-analytics.module';
import { Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('AiAnalyticsBootstrap');
  logger.log('Starting AI Analytics Service...');

  const app = await NestFactory.create(AiAnalyticsModule);
  await app.init();
  
  app.enableShutdownHooks();

  // const port = process.env.PORT || 5001;
  const port = 5001
  
  await app.listen(port, '0.0.0.0');
  logger.log(`AI Analytics service is running on port ${port}`);

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
  console.error('Failed to start AI Analytics Service:', err);
  process.exit(1);
}); 