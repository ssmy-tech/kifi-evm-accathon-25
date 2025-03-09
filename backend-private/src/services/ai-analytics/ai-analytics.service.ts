import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiAnalyticsService {
  private readonly logger = new Logger(AiAnalyticsService.name);

  constructor() {}

  // Service is kept minimal as we're only using the API endpoints
  // and not running scheduled analytics tasks
} 