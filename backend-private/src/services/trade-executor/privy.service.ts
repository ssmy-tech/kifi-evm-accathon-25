import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient, WalletWithMetadata } from '@privy-io/server-auth';
import { ethers } from 'ethers';

// ERC20 approve function signature
const ERC20_ABI = [
  "function approve(address spender, uint256 amount) external returns (bool)"
];

interface SwapData {
  to: string;
  data: string;
  gas: string;
  gasPrice: string;
  value: string;
}

@Injectable()
export class PrivyService {
  private readonly logger = new Logger(PrivyService.name);
  private readonly privy: PrivyClient;

  constructor(private config: ConfigService) {
    const appId = this.config.get<string>('PRIVY_APP_ID');
    const appSecret = this.config.get<string>('PRIVY_APP_SECRET');
    const authorizationPrivateKey = this.config.get<string>('PRIVY_AUTHORIZATION_PRIVATE_KEY');
    
    if (!appId || !appSecret) {
      throw new Error('PRIVY_APP_ID and PRIVY_APP_SECRET must be set');
    }
    if (!authorizationPrivateKey) {
      throw new Error('PRIVY_AUTHORIZATION_PRIVATE_KEY must be set');
    }

    this.privy = new PrivyClient(appId, appSecret, {
      // Optional configuration
      walletApi:{
        authorizationPrivateKey: authorizationPrivateKey,
      }
    });
  }

  async getDelegatedWallet(privyId: string): Promise<string | null> {
    try {
      // Get user data from Privy using the SDK
      const user = await this.privy.getUser(privyId);
      
      // Find delegated embedded wallets
      const embeddedWallets = user.linkedAccounts.filter(
        (account): account is WalletWithMetadata => 
          account.type === 'wallet' && 
          account.walletClientType === 'privy' &&
          account.delegated === true
      );

      console.log(embeddedWallets);

      if (embeddedWallets.length === 0) {
        this.logger.warn(`No delegated wallets found for user ${privyId}`);
        return null;
      }

      // Return the first delegated wallet address
      return embeddedWallets[0].address;
    } catch (error) {
      this.logger.error(`Failed to get delegated wallet for user ${privyId}:`, error);
      throw error;
    }
  }

  async executeSwap(params: {
    privyId: string;
    walletAddress: string;
    swapData: SwapData;
    tokenAddress: string;
    trade: "SELL" | "BUY";
  }): Promise<string> {
    try {
      this.logger.log(`Executing swap with params:`, params);
      
      // Convert values to BigInt and then to hex with 0x prefix
      const gasLimit = `0x${BigInt(params.swapData.gas || '0').toString(16)}`;
      const gasPrice = `0x${BigInt(params.swapData.gasPrice || '0').toString(16)}`;
      const value = `0x${BigInt(params.swapData.value || '0').toString(16)}`;

      if (params.trade === "SELL") {
        // For sells, we need to approve the token first
        const tokenContract = new ethers.Contract(params.tokenAddress, ERC20_ABI);
        const maxApproval = ethers.MaxUint256;
        
        // Create approval transaction
        const approvalData = tokenContract.interface.encodeFunctionData(
          'approve',
          [params.swapData.to, maxApproval]
        );

        const approvalTx = {
          to: params.tokenAddress,
          data: approvalData,
          value: '0x0',
          gas_limit: '0x30D40', // 200,000 gas
          gas_price: gasPrice,
          chainId: 10143,
        };

        this.logger.log('Sending approval transaction:', approvalTx);

        // Send approval transaction
        const {hash: approvalHash} = await this.privy.walletApi.ethereum.sendTransaction({
          address: params.walletAddress,
          caip2: 'eip155:10143',
          chainType: 'ethereum',
          transaction: approvalTx,
        });

        this.logger.log('Approval transaction sent:', { approvalHash });
        
        // Wait a bit for the approval to be mined
        await new Promise(resolve => setTimeout(resolve, 2000));
      }

      // Format transaction for signing
      const transaction = {
        to: params.swapData.to,
        data: params.swapData.data,
        value,
        gas_limit: gasLimit,
        gas_price: gasPrice,
        chainId: 10143, // Monad testnet
      };

      this.logger.log('Formatted transaction:', transaction);

      const {hash} = await this.privy.walletApi.ethereum.sendTransaction({
        address: params.walletAddress,
        caip2: 'eip155:10143',
        chainType: 'ethereum',
        transaction,
      });

      this.logger.log('Signed transaction:', { hash });
      
      // TODO: Send the signed transaction
      return hash;
    } catch (error) {
      this.logger.error('Failed to execute swap:', error);
      throw error;
    }
  }
} 