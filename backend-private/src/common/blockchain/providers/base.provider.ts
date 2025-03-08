import { Injectable, Logger } from '@nestjs/common';
import { ethers } from 'ethers';
import { BlockchainConfigService } from '../config/blockchain.config';

interface BaseContractResult {
  isValid: boolean;
  symbol?: string;
  name?: string;
}

@Injectable()
export class BaseProvider {
  private readonly logger = new Logger(BaseProvider.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)'
  ];

  constructor(private readonly config: BlockchainConfigService) {
    this.provider = new ethers.JsonRpcProvider(this.config.baseRpcUrl);
  }

  async isContract(address: string): Promise<BaseContractResult> {
    try {
      const code = await this.provider.getCode(address);
      if (code === '0x') {
        return { isValid: false };
      }

      try {
        const contract = new ethers.Contract(address, this.ERC20_ABI, this.provider);
        const [name, symbol] = await Promise.all([
          contract.name(),
          contract.symbol()
        ]);
        
        this.logger.log(`Found Base token: ${name} (${symbol})`);
        return {
          isValid: true,
          name,
          symbol
        };
      } catch (error) {
        // Contract exists but might not be an ERC20 token
        return { isValid: true };
      }
    } catch (error) {
      this.logger.debug(`Error checking Base contract ${address}: ${error.message}`);
      return { isValid: false };
    }
  }
} 