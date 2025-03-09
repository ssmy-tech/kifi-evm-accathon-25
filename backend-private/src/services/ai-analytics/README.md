# AI Analytics Microservice

This microservice provides AI-powered analytics for various data sources including Telegram and Twitter.

## Features

- **Telegram Analytics**: Analyze Telegram messages related to specific contract addresses via API endpoint
- **Twitter Analytics**: Analyze Twitter data (to be implemented)

## API Endpoints

### Telegram Analytics

- `GET /telegram-analytics/contract/:contractAddress` - Analyze Telegram messages for a specific contract address
  - Query Parameters:
    - `startDate` (optional): Filter messages from this date (ISO format)
    - `endDate` (optional): Filter messages until this date (ISO format)
    - `limit` (optional): Limit the number of messages to analyze

## Environment Variables

The following environment variables are required:

```
# Nillion SecretLLM Configuration
NILAI_API_URL=https://api.nilai.app
NILAI_API_KEY=your_nilai_api_key

# Telegram API Configuration
TELEGRAM_API_TOKEN=your_telegram_api_token

# Twitter API Configuration
TWITTER_API_KEY=your_twitter_api_key
TWITTER_API_SECRET=your_twitter_api_secret
TWITTER_BEARER_TOKEN=your_twitter_bearer_token
```

## Database Integration

This service uses the common Prisma module from the parent project to interact with the database. It uses the following models:

- **Calls**: For contract calls with fields like `telegramCallId`, `address`, and `tgChatId`
- **Messages**: For messages with fields like `telegramMessageId`, `text`, and `fromId`

## Architecture

This microservice is integrated into the main NestJS application and is structured as follows:

- `ai-analytics.module.ts` - Main module that orchestrates the analytics services
- `ai-analytics.service.ts` - Core service (minimal implementation, no scheduled tasks)
- `telegram-analytics/` - Module for Telegram data analysis with API endpoint
- `twitter-analytics/` - Module for Twitter data analysis (to be implemented)

## LLM Integration

The service uses SecretLLM from Nillion for secure and private analysis of messages. The integration is implemented in the Telegram analytics service. 