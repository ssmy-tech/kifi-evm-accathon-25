import { Injectable, Logger } from '@nestjs/common';
import { BlockchainConfigService } from '../config/blockchain.config';
import { ethers } from 'ethers';

interface MonadContractResult {
  isValid: boolean;
  symbol?: string;
  name?: string;
}

@Injectable()
export class MonadProvider {
  private readonly logger = new Logger(MonadProvider.name);
  private readonly provider: ethers.JsonRpcProvider;
  private readonly ERC20_ABI = [
    'function name() view returns (string)',
    'function symbol() view returns (string)'
  ];

  constructor(private readonly config: BlockchainConfigService) {
    this.provider = new ethers.JsonRpcProvider(this.config.monadRpcUrl);
  }

  async isContract(address: string): Promise<MonadContractResult> {
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
        
        this.logger.log(`Found Monad token: ${name} (${symbol})`);
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
      this.logger.debug(`Error checking Monad contract ${address}: ${error.message}`);
      return { isValid: false };
    }
  }
} 