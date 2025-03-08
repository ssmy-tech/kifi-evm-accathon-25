import { Injectable, Logger } from '@nestjs/common';
import { BlockchainConfigService } from '../config/blockchain.config';
import { Connection, PublicKey } from '@solana/web3.js';
import { getMint } from '@solana/spl-token';
import { Metaplex } from '@metaplex-foundation/js';

interface SolanaContractResult {
  isValid: boolean;
  symbol?: string;
  name?: string;
}

@Injectable()
export class SolanaProvider {
  private readonly logger = new Logger(SolanaProvider.name);
  private readonly connection: Connection;
  private readonly metaplex: Metaplex;

  constructor(private readonly config: BlockchainConfigService) {
    this.connection = new Connection(this.config.solanaRpcUrl);
    this.metaplex = new Metaplex(this.connection);
  }

  private async getTokenMetadata(mintAddress: PublicKey): Promise<{ symbol?: string; name?: string }> {
    try {
      const metadata = await this.metaplex.nfts().findByMint({ mintAddress });
      
      if (!metadata) {
        return {};
      }

      this.logger.debug(`Raw metadata - Name: "${metadata.name}", Symbol: "${metadata.symbol}"`);

      return {
        name: metadata.name,
        symbol: metadata.symbol
      };
    } catch (error) {
      this.logger.debug(`Error fetching metadata: ${error.message}`);
      return {};
    }
  }

  async isContract(address: string): Promise<SolanaContractResult> {
    try {
      const pubkey = new PublicKey(address);
      
      // First check if it's a valid mint
      await getMint(this.connection, pubkey);
      
      // If we get here, it's a valid token mint, so get the metadata
      const metadata = await this.getTokenMetadata(pubkey);
      
      if (metadata.name || metadata.symbol) {
        this.logger.log(`Found Solana token: ${metadata.name || 'Unknown'} (${metadata.symbol || 'Unknown'})`);
      } else {
        this.logger.log(`Found Solana token without metadata at ${address}`);
      }
      
      return {
        isValid: true,
        ...metadata
      };
    } catch (error) {
      this.logger.debug(`Not a valid Solana token: ${error.message}`);
      return { isValid: false };
    }
  }
} 