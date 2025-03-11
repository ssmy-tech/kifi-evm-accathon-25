import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SwapQuote } from './types';

@Injectable()
export class ZeroExService {
  private readonly logger = new Logger(ZeroExService.name);
  private readonly API_KEY: string;
  private readonly BASE_URL = 'https://api.0x.org';
  private readonly CHAIN_ID = '31337'; // Monad testnet

  constructor(private config: ConfigService) {
    const apiKey = this.config.get<string>('ZEROX_API_KEY');
    if (!apiKey) {
      throw new Error('ZEROX_API_KEY environment variable is not set');
    }
    this.API_KEY = apiKey;
  }

  async getPrice(tokenAddress: string): Promise<number> {
    try {
      const params = new URLSearchParams({
        chainId: this.CHAIN_ID,
        sellToken: tokenAddress,
        buyToken: 'NATIVE', // MONAD
        sellAmount: '1000000000000000000', // 1 token
      });

      const response = await fetch(
        `${this.BASE_URL}/swap/permit2/price?${params.toString()}`,
        {
          headers: {
            '0x-api-key': this.API_KEY,
            '0x-version': 'v2',
          },
        }
      );

      const data = await response.json();
      return parseFloat(data.price);
    } catch (error) {
      this.logger.error(`Failed to get price for ${tokenAddress}:`, error);
      throw error;
    }
  }

  async getQuote(params: {
    sellToken: string;
    buyToken: string;
    sellAmount: string;
    takerAddress: string;
  }): Promise<SwapQuote> {
    try {
      const quoteParams = new URLSearchParams({
        chainId: this.CHAIN_ID,
        ...params,
      });

      const response = await fetch(
        `${this.BASE_URL}/swap/permit2/quote?${quoteParams.toString()}`,
        {
          headers: {
            '0x-api-key': this.API_KEY,
            '0x-version': 'v2',
          },
        }
      );

      return response.json();
    } catch (error) {
      this.logger.error('Failed to get quote:', error);
      throw error;
    }
  }
} 