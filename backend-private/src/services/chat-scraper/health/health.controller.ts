import { Controller, Get } from '@nestjs/common';
import { HealthService } from './health.service';

@Controller('health')
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get()
  healthCheck() {
    return this.healthService.checkHealth();
  }

  @Get('hello')
  helloWorld() {
    return { message: 'Hello, World!' };
  }
} 