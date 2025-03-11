export interface SwapQuote {
  price: string;
  guaranteedPrice: string;
  to: string;
  data: string;
  value: string;
  gas: string;
  estimatedGas: string;
  gasPrice: string;
  permit2?: {
    eip712: any;
  };
}

export interface PriceCheck {
  tokenAddress: string;
  currentPrice: number;
  timestamp: number;
} 