import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class BlockchainConfigService {
  constructor(private readonly configService: ConfigService) {}

  get ethereumRpcUrl(): string {
    return this.configService.getOrThrow<string>('ETHEREUM_RPC_URL');
  }

  get baseRpcUrl(): string {
    return this.configService.getOrThrow<string>('BASE_RPC_URL');
  }

  get monadRpcUrl(): string {
    return this.configService.getOrThrow<string>('MONAD_RPC_URL');
  }

  get solanaRpcUrl(): string {
    return this.configService.getOrThrow<string>('SOLANA_RPC_URL');
  }
} 