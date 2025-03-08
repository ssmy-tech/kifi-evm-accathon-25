import { Injectable, Logger } from '@nestjs/common';
import { EthereumProvider } from './providers/ethereum.provider';
import { BaseProvider } from './providers/base.provider';
import { MonadProvider } from './providers/monad.provider';
import { SolanaProvider } from './providers/solana.provider';
import { Chain } from '@prisma/client';

export interface ContractVerificationResult {
  isValid: boolean;
  chain?: Chain;
  symbol?: string;
  name?: string;
  error?: string;
}

@Injectable()
export class BlockchainService {
  private readonly logger = new Logger(BlockchainService.name);

  constructor(
    private readonly ethereumProvider: EthereumProvider,
    private readonly baseProvider: BaseProvider,
    private readonly monadProvider: MonadProvider,
    private readonly solanaProvider: SolanaProvider,
  ) {}

  async verifyContract(address: string): Promise<ContractVerificationResult> {
    this.logger.log(`Verifying contract ${address}`);

    try {
      // Check if it's an Ethereum-style address (0x followed by 40 hex characters)
      if (/^0x[a-fA-F0-9]{40}$/.test(address)) {
        // Try Base first since it's in our Chain enum
        const baseResult = await this.baseProvider.isContract(address);
        if (baseResult.isValid) {
          return { ...baseResult, chain: Chain.BASE };
        }

        // Try Monad
        const monadResult = await this.monadProvider.isContract(address);
        if (monadResult.isValid) {
          return { ...monadResult, chain: Chain.MONAD };
        }

        // Try Ethereum but skip if valid since it's not in our Chain enum
        const ethResult = await this.ethereumProvider.isContract(address);
        if (ethResult.isValid) {
          return { isValid: false, error: 'Ethereum chain not supported' };
        }
      }
      // Check if it's a Solana-style address (32-44 base58 characters)
      else if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(address)) {
        const solanaResult = await this.solanaProvider.isContract(address);
        if (solanaResult.isValid) {
          return { ...solanaResult, chain: Chain.SOLANA };
        }
      }

      return { isValid: false };
    } catch (error) {
      this.logger.error(`Error verifying contract ${address}: ${error.message}`);
      return { isValid: false, error: error.message };
    }
  }
} 