import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BlockchainService } from './blockchain.service';
import { BlockchainConfigService } from './config/blockchain.config';
import { EthereumProvider } from './providers/ethereum.provider';
import { BaseProvider } from './providers/base.provider';
import { MonadProvider } from './providers/monad.provider';
import { SolanaProvider } from './providers/solana.provider';

@Module({
  imports: [ConfigModule],
  providers: [
    BlockchainService,
    BlockchainConfigService,
    EthereumProvider,
    BaseProvider,
    MonadProvider,
    SolanaProvider,
  ],
  exports: [BlockchainService],
})
export class BlockchainModule {} 