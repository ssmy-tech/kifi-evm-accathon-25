import { registerAs } from '@nestjs/config';

export default registerAs('ai-analytics', () => ({
  // Nillion SecretLLM configuration
  nilaiApiUrl: process.env.NILAI_API_URL || 'https://api.nilai.app',
  nilaiApiKey: process.env.NILAI_API_KEY,
  
  // Telegram API configuration
  telegramApiToken: process.env.TELEGRAM_API_TOKEN,
  
  // Twitter API configuration
  rapidApiKey: process.env.RAPID_API_KEY,
  twitterApiKey: process.env.TWITTER_API_KEY,
  twitterApiSecret: process.env.TWITTER_API_SECRET,
  twitterBearerToken: process.env.TWITTER_BEARER_TOKEN,
})); 