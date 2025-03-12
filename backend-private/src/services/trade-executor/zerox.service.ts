import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwapQuote } from './types';
import { ethers } from 'ethers';

@Injectable()
export class ZeroExService {
  private readonly logger = new Logger(ZeroExService.name);
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://api.0x.org';
  private readonly CHAIN_ID = '10143'; // Monad testnet
  private readonly NATIVE_TOKEN = '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE';
  
  // Rate limiting configuration
  private readonly MAX_REQUESTS_PER_SECOND = 5;
  private readonly requestQueue: Array<() => Promise<any>> = [];
  private isProcessingQueue = false;
  private lastRequestTime = 0;
  private requestCount = 0;

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('ZEROX_API_KEY');
    if (!apiKey) {
      throw new Error('ZEROX_API_KEY environment variable is not set');
    }
    this.API_KEY = apiKey;
  }

  private async processQueue() {
    if (this.isProcessingQueue) {
      this.logger.debug('Queue is already being processed');
      return;
    }
    
    this.isProcessingQueue = true;
    this.logger.debug(`Starting to process queue with ${this.requestQueue.length} requests`);

    try {
      while (this.requestQueue.length > 0) {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;

        // Reset counter if a second has passed
        if (timeSinceLastRequest >= 1000) {
          this.logger.debug('Resetting rate limit counter');
          this.requestCount = 0;
          this.lastRequestTime = now;
        }

        // If we've hit the rate limit, wait until next second
        if (this.requestCount >= this.MAX_REQUESTS_PER_SECOND) {
          const waitTime = 1000 - timeSinceLastRequest;
          this.logger.debug(`Rate limit hit, waiting ${waitTime}ms`);
          await new Promise(resolve => setTimeout(resolve, waitTime));
          continue;
        }

        const request = this.requestQueue.shift();
        if (request) {
          this.requestCount++;
          this.lastRequestTime = now;
          this.logger.debug(`Processing request ${this.requestCount}/${this.MAX_REQUESTS_PER_SECOND} in current window`);
          
          try {
            await request();
          } catch (error) {
            this.logger.error('Error processing queued request:', error);
          }
        }
      }
    } finally {
      this.isProcessingQueue = false;
      this.logger.debug('Finished processing queue');
      
      // Check if new items were added while processing
      if (this.requestQueue.length > 0) {
        this.logger.debug(`Found ${this.requestQueue.length} new requests, restarting queue processing`);
        setImmediate(() => this.processQueue());
      }
    }
  }

  private async executeRateLimited<T>(request: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.logger.debug(`Adding request to queue (current length: ${this.requestQueue.length})`);
      
      this.requestQueue.push(async () => {
        try {
          this.logger.debug('Executing rate-limited request');
          const result = await request();
          resolve(result);
        } catch (error) {
          this.logger.error('Rate-limited request failed:', error);
          reject(error);
        }
      });

      // Start processing if not already running
      if (!this.isProcessingQueue) {
        this.logger.debug('Starting queue processing');
        this.processQueue();
      } else {
        this.logger.debug('Queue processing already running');
      }
    });
  }

  private validateAmount(amount: any): string {
    if (!amount || typeof amount !== 'string') {
      throw new Error(`Invalid amount: ${amount}`);
    }
    // Ensure it's a valid number string
    if (!/^[0-9]+$/.test(amount)) {
      throw new Error(`Amount is not a valid number string: ${amount}`);
    }
    return amount;
  }

  private calculatePrice(buyAmount: string, sellAmount: string): number {
    try {
      // Validate amounts before processing
      const validBuyAmount = this.validateAmount(buyAmount);
      const validSellAmount = this.validateAmount(sellAmount);
      
      // Price is always token/MONAD
      // For getPrice: sellAmount is token, buyAmount is MONAD -> token/MONAD = 1/buyAmount
      // For getQuote: sellAmount is MONAD, buyAmount is token -> token/MONAD = buyAmount/sellAmount
      // const price = validBuyAmount/validSellAmount
      const price = parseFloat(validBuyAmount) / parseFloat(validSellAmount);

      this.logger.debug('Price calculation:', {
        buyAmount: validBuyAmount,
        sellAmount: validSellAmount,
        price,
        explanation: 'Price represents token/MONAD ratio'
      });

      return price;
    } catch (error) {
      this.logger.error('Error calculating price:', {
        buyAmount,
        sellAmount,
        error: error.message
      });
      throw error;
    }
  }

  private async makeRateLimitedRequest(url: string, options: RequestInit): Promise<Response> {
    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;

    // Reset counter if a second has passed
    if (timeSinceLastRequest >= 1000) {
      this.requestCount = 0;
      this.lastRequestTime = now;
    }

    // If we've hit the rate limit, wait until next second
    if (this.requestCount >= this.MAX_REQUESTS_PER_SECOND) {
      const waitTime = 1000 - timeSinceLastRequest;
      this.logger.debug(`API rate limit hit, waiting ${waitTime}ms before making request`);
      await new Promise(resolve => setTimeout(resolve, waitTime));
      return this.makeRateLimitedRequest(url, options); // Retry after waiting
    }

    this.requestCount++;
    this.lastRequestTime = now;
    this.logger.debug(`Making API request ${this.requestCount}/${this.MAX_REQUESTS_PER_SECOND} in current window`);
    
    return fetch(url, options);
  }

  async getPrice(tokenAddress: string, tokenAmount: string): Promise<number> {
    return this.executeRateLimited(async () => {
      try {
        const params = new URLSearchParams({
          chainId: this.CHAIN_ID,
          sellToken: tokenAddress,  // Token we're checking price for
          buyToken: this.NATIVE_TOKEN,  // We want price in MONAD
          sellAmount: tokenAmount,  // Amount of token they own
        });

        const response = await this.makeRateLimitedRequest(
          `${this.BASE_URL}/swap/permit2/price?${params.toString()}`,
          {
            headers: {
              '0x-api-key': this.API_KEY,
              '0x-version': 'v2',
            },
          }
        );

        const data = await response.json();

        if (!data.buyAmount || !data.sellAmount) {
          this.logger.warn(`Missing or invalid amounts in price response for ${tokenAddress}:`, data);
          if (data.issues) {
            this.logger.warn('Price issues:', data.issues);
          }
          return 0;
        }

        // For getPrice: we're selling their token amount to get MONAD
        // Price should be token/MONAD = sellAmount/buyAmount
        console.log('GET PRICE', this.calculatePrice(data.sellAmount, data.buyAmount))
        return this.calculatePrice(data.sellAmount, data.buyAmount);
      } catch (error) {
        this.logger.error(`Failed to get price for ${tokenAddress}:`, error);
        return 0; // Return 0 for any error case
      }
    });
  }

  async getQuote(params: {
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    taker: string;
    isBuyingToken: boolean;  // true if buying token with MONAD, false if selling token for MONAD
  }): Promise<SwapQuote & { price: number }> {
    return this.executeRateLimited(async () => {
      try {
        // Log input parameters
        this.logger.debug('Getting quote with params:', {
          sellToken: params.sellToken,
          buyToken: params.buyToken,
          sellAmount: params.sellAmount,
          taker: params.taker,
          isBuyingToken: params.isBuyingToken
        });

        // Validate sellAmount before making the request
        if (!params.sellAmount) {
          throw new Error('sellAmount is required');
        }

        try {
          // Validate that sellAmount is a valid number
          ethers.parseUnits(params.sellAmount, 18);
        } catch (e) {
          throw new Error(`Invalid sellAmount format: ${params.sellAmount}`);
        }

        const quoteParams = new URLSearchParams({
          chainId: this.CHAIN_ID,
          sellToken: params.sellToken,
          buyToken: params.buyToken,
          sellAmount: params.sellAmount,
          taker: params.taker
        });

        const response = await this.makeRateLimitedRequest(
          `${this.BASE_URL}/swap/permit2/quote?${quoteParams.toString()}`,
          {
            headers: {
              '0x-api-key': this.API_KEY,
              '0x-version': 'v2',
            },
          }
        );

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`API request failed: ${response.status} - ${errorText}`);
        }

        const data = await response.json();
        
        // Log the full response for debugging
        this.logger.debug('Full quote response:', {
          status: response.status,
          data: JSON.stringify(data, null, 2)
        });

        // Check for API errors or issues first
        if (data.code || data.reason) {
          throw new Error(`API Error: ${data.reason || data.code}`);
        }

        // Validate the response data
        if (!data.sellAmount) {
          this.logger.error('Invalid response:', data);
          throw new Error('Missing sellAmount in quote response');
        }
        if (!data.minBuyAmount) {
          this.logger.error('Invalid response:', data);
          throw new Error('Missing minBuyAmount in quote response');
        }

        if (data.issues?.balance || data.issues?.allowance) {
          this.logger.warn(`Quote issues for ${params.buyToken}:`, data.issues);
        }

        // Calculate price based on whether we're buying or selling token
        let price: number;
        if (params.isBuyingToken) {
          // Buying token with MONAD
          // We're selling MONAD (sellAmount) to get tokens (minBuyAmount)
          // Price should be token/MONAD = minBuyAmount/sellAmount
          price = this.calculatePrice(data.buyAmount, data.sellAmount);
          console.log('BUY PRICE', price)
        } else {
          // Selling token for MONAD
          // We're selling tokens (sellAmount) to get MONAD (minBuyAmount)
          // Price should be token/MONAD = sellAmount/minBuyAmount
          price = this.calculatePrice(data.sellAmount, data.buyAmount);
          console.log('SELL PRICE', price)
        }
        return {
          ...data,
          price
        };
      } catch (error) {
        this.logger.error('Failed to get quote:', {
          error: error.message,
          params
        });
        throw error;
      }
    });
  }
} 