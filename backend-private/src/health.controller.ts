import { Controller, Get } from '@nestjs/common';

@Controller('health')
export class HealthController {
  @Get()
  healthCheck() {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: process.env.SERVICE_NAME || 'backend-private',
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  @Get('hello')
  helloWorld() {
    return { message: 'Hello, World!' };
  }
} 