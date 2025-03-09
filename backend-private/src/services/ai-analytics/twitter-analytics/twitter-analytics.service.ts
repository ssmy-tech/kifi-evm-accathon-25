import { Injectable, Logger, HttpException, HttpStatus } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../../prisma/prisma.service';
import axios from 'axios';
import type { TwitterMessage, AnalysisResult } from './types';

interface TokenData {
  price?: string;
  priceUsd?: string;
  volume?: {
    h24: string;
    h6: string;
    h1: string;
    m5: string;
  };
  priceChange?: {
    h24: string;
    h6: string;
    h1: string;
    m5: string;
  };
  liquidity?: {
    usd: string;
    base: string;
    quote: string;
  };
  txns24h?: {
    buys: number;
    sells: number;
  };
  pairs?: Array<{
    exchange: string;
    chainId: string;
    pairAddress: string;
    baseToken: {
      address: string;
      name: string;
      symbol: string;
    };
    quoteToken: {
      address: string;
      name: string;
      symbol: string;
    };
    priceUsd: string;
    liquidity: {
      usd: string;
      base: string;
      quote: string;
    };
    volume: {
      h24: string;
      h6: string;
      h1: string;
      m5: string;
    };
    priceChange: {
      h24: string;
      h6: string;
      h1: string;
      m5: string;
    };
    txns: {
      h24: {
        buys: number;
        sells: number;
      };
      h6: {
        buys: number;
        sells: number;
      };
      h1: {
        buys: number;
        sells: number;
      };
      m5: {
        buys: number;
        sells: number;
      };
    };
  }>;
}

@Injectable()
export class TwitterAnalyticsService {
  private readonly logger = new Logger(TwitterAnalyticsService.name);
  private readonly rapidApiKey: string;
  private readonly rapidApiHost: string;

  constructor(
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService
  ) {
    const rapidApiKey = this.configService.get<string>('RAPID_API_KEY');
    if (!rapidApiKey) {
      throw new Error('RAPID_API_KEY is required for Twitter Analytics');
    }
    this.rapidApiKey = rapidApiKey;
    this.rapidApiHost = 'twitter-api45.p.rapidapi.com';
  }

  /**
   * Fetch current token data from DexScreener
   */
  private async fetchTokenData(contractAddress: string, chain: string): Promise<TokenData> {
    try {
      const chainMap = {
        'BASE': 'base',
        'ETHEREUM': 'ethereum',
        'SOLANA': 'solana',
        'MONAD': 'monad'
      };
      
      const chainId = chainMap[chain as keyof typeof chainMap] || 'ethereum';
      const response = await axios.get(`https://api.dexscreener.com/latest/dex/tokens/${contractAddress}`);
      
      if (!response.data?.pairs?.length) {
        return {};
      }

      const pair = response.data.pairs.sort((a, b) => 
        parseFloat(b.liquidity?.usd || '0') - parseFloat(a.liquidity?.usd || '0')
      )[0];

      return {
        price: pair.priceUsd,
        priceUsd: pair.priceUsd,
        volume: pair.volume,
        priceChange: pair.priceChange,
        liquidity: pair.liquidity,
        txns24h: pair.txns?.h24,
        pairs: response.data.pairs
      };
    } catch (error) {
      this.logger.warn(`Failed to fetch token data from DexScreener: ${error.message}`);
      return {};
    }
  }

  /**
   * Fetch tweets using RapidAPI
   */
  private async fetchTweets(query: string, startTime?: string, endTime?: string): Promise<TwitterMessage[]> {
    try {
      const response = await axios.get('https://twitter-api45.p.rapidapi.com/search.php', {
        params: {
          query,
          start_time: startTime,
          end_time: endTime
        },
        headers: {
          'X-RapidAPI-Key': this.rapidApiKey,
          'X-RapidAPI-Host': this.rapidApiHost
        }
      });

      if (!response.data?.timeline?.length) {
        return [];
      }

      return response.data.timeline
        .filter(item => item.type === 'tweet')
        .map(tweet => ({
          id: tweet.tweet_id,
          text: tweet.text,
          timestamp: new Date(tweet.created_at).toISOString(),
          author: tweet.screen_name,
          metrics: {
            retweets: tweet.retweets,
            likes: tweet.favorites,
            replies: tweet.replies,
            views: parseInt(tweet.views, 10),
            bookmarks: tweet.bookmarks,
            quotes: tweet.quotes
          },
          url: `https://twitter.com/${tweet.screen_name}/status/${tweet.tweet_id}`
        }));
    } catch (error) {
      this.logger.error(`Failed to fetch tweets: ${error.message}`, error.stack);
      throw new HttpException('Failed to fetch tweets', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  /**
   * Get the most relevant tweets based on engagement metrics
   */
  private getRelevantTweets(tweets: TwitterMessage[], limit: number = 5): TwitterMessage[] {
    // Calculate engagement score for each tweet
    const tweetsWithScore = tweets.map(tweet => ({
      tweet,
      score: (
        tweet.metrics.likes * 1 +
        tweet.metrics.retweets * 2 +
        tweet.metrics.replies * 1.5 +
        tweet.metrics.views * 0.01 +
        tweet.metrics.quotes * 1.5 +
        tweet.metrics.bookmarks * 1
      )
    }));

    // Sort by score and return top tweets
    return tweetsWithScore
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(t => t.tweet);
  }

  /**
   * Analyze Twitter data for a specific contract
   */
  async analyzeContractTweets(
    contractAddress: string,
    startDate?: string,
    endDate?: string,
  ): Promise<AnalysisResult> {
    this.logger.log(`Analyzing tweets for contract: ${contractAddress}`);
    
    try {
      // Get token metadata from the most recent call
      const latestCall = await this.prisma.calls.findFirst({
        where: { address: { equals: contractAddress, mode: 'insensitive' as const } },
        orderBy: { createdAt: 'desc' },
      });

      if (!latestCall?.ticker) {
        throw new HttpException('No token information found', HttpStatus.NOT_FOUND);
      }

      // Fetch tweets using token name and symbol
      const tweets = await this.fetchTweets(
        `${latestCall.tokenName} OR ${latestCall.ticker}`,
        startDate,
        endDate
      );

      if (!tweets.length) {
        throw new HttpException('No tweets found for this token', HttpStatus.NOT_FOUND);
      }

      return await this.analyzeTweetsWithLLM(tweets, contractAddress);
    } catch (error) {
      this.logger.error(`Error analyzing tweets: ${error.message}`, error.stack);
      throw new HttpException(
        error.message || 'Failed to analyze tweets',
        error.status || HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Analyze tweets using SecretLLM from Nillion
   */
  private async analyzeTweetsWithLLM(tweets: TwitterMessage[], contractAddress: string): Promise<AnalysisResult> {
    const nilaiApiUrl = this.configService.get<string>('NILAI_API_URL');
    const nilaiApiKey = this.configService.get<string>('NILAI_API_KEY');
    
    if (!nilaiApiUrl || !nilaiApiKey) throw new Error('Missing Nilai API configuration');
    
    try {
      // Get token metadata from the most recent call
      const latestCall = await this.prisma.calls.findFirst({
        where: { address: { equals: contractAddress, mode: 'insensitive' as const } },
        orderBy: { createdAt: 'desc' },
      });

      // Fetch token data from DexScreener
      const tokenData = await this.fetchTokenData(contractAddress, latestCall?.chain || 'ETHEREUM');

      // Get the most relevant tweets
      const relevantTweets = this.getRelevantTweets(tweets);

      const tokenContext = latestCall?.ticker ? 
        `Token Information:
        Name: ${latestCall.tokenName || 'Unknown'}
        Symbol: ${latestCall.ticker}
        Chain: ${latestCall.chain}
        Price: ${tokenData.price ? `$${tokenData.price}` : 'Unknown'}
        24h Volume: ${tokenData.volume?.h24 ? `$${tokenData.volume.h24}` : 'Unknown'}
        24h Price Change: ${tokenData.priceChange?.h24 ? `${tokenData.priceChange.h24}%` : 'Unknown'}
        Available on: ${tokenData.pairs?.map(p => p.exchange).join(', ') || 'Unknown'}` : '';

      const formattedTweets = tweets
        .map(tweet => {
          const tweetTime = new Date(tweet.timestamp);
          const metrics = `[👍 ${tweet.metrics.likes} 🔄 ${tweet.metrics.retweets} 💬 ${tweet.metrics.replies} 👀 ${tweet.metrics.views}]`;
          return `[${tweetTime.toLocaleString()} (${tweetTime.toTimeString().split(' ')[0]})] @${tweet.author} ${metrics}: ${tweet.text}`;
        })
        .join('\n');
      
      const currentTime = new Date().toISOString();
      const currentTimeFormatted = new Date(currentTime).toLocaleString();
      const tweetTimeRange = tweets.length > 0 ? {
        earliest: new Date(Math.min(...tweets.map(t => new Date(t.timestamp).getTime()))).toISOString(),
        latest: new Date(Math.max(...tweets.map(t => new Date(t.timestamp).getTime()))).toISOString()
      } : null;

      const marketContext = `Current market data (as of ${currentTimeFormatted}):${
        tokenData.price ? ` Price $${tokenData.price},` : ''
      }${
        tokenData.priceChange?.h24 ? ` 24h change ${tokenData.priceChange.h24}%` : ''
      }`;

      const summaryResponse = await axios.post(
        `${nilaiApiUrl}/v1/chat/completions`,
        {
          model: 'meta-llama/Llama-3.1-8B-Instruct',
          messages: [
            {
              role: 'system',
              content: `You are a direct and clear analyst of blockchain discussions on Twitter.
              Write concise, factual summaries in 1-2 sentences.
              Consider engagement metrics (likes, retweets, replies) in your analysis.
              Consider how recent or outdated the tweets are relative to current market data.
              Note significant changes between discussed metrics and current data.
              Focus on timing gaps and data differences, not investment advice.
              Never use phrases like "the tweets are about" or "appears to be".
              Never use bullet points or special formatting.
              
              ${tokenContext}`
            },
            {
              role: 'user',
              content: `Provide a 1-2 sentence summary that includes:
              1. Key points and numbers mentioned in tweets, noting high-engagement tweets
              2. How current market data compares to the discussed metrics
              3. Note if tweets are recent (last hour), today, or older
              
              Time context:
              - Tweets from: ${tweetTimeRange ? new Date(tweetTimeRange.earliest).toLocaleString() : 'Unknown'}
              - Latest tweet: ${tweetTimeRange ? new Date(tweetTimeRange.latest).toLocaleString() : 'Unknown'}
              - Current time: ${currentTimeFormatted}
              
              ${marketContext}
              
              Twitter activity:
              ${formattedTweets}`
            }
          ],
          temperature: 0.1,
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${nilaiApiKey}`,
          },
        }
      );
      
      const summary = summaryResponse.data.choices[0].message.content.trim();

      return {
        summary,
        sentiment: {
          overall: 'Neutral',
          communityMood: 'neutral',
          details: []
        },
        keyTopics: [{
          topic: 'No clear topics identified',
          frequency: 0,
          context: 'Insufficient tweets for topic analysis'
        }],
        nextSteps: [{
          suggestion: 'Monitor for more activity',
          context: 'Insufficient data for detailed suggestions'
        }],
        relevantTweets: relevantTweets.map(tweet => ({
          url: tweet.url!,
          text: tweet.text,
          author: tweet.author,
          timestamp: tweet.timestamp,
          engagement: {
            likes: tweet.metrics.likes,
            retweets: tweet.metrics.retweets,
            replies: tweet.metrics.replies,
            views: tweet.metrics.views
          }
        }))
      };
    } catch (error) {
      this.logger.error(`LLM analysis error: ${error.message}`, error.stack);
      throw new Error(`Failed to analyze tweets: ${error.message}`);
    }
  }
} 