// src/privy/privy.module.ts

import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrivyClient } from '@privy-io/server-auth';

/**
 * This "Global" decorator lets you avoid repeatedly importing PrivyModule
 * in every module that needs the client. Optional but convenient for singletons.
 */
@Global()
@Module({
  providers: [
    {
      provide: 'PRIVY_CLIENT',
      useFactory: (configService: ConfigService) => {
        // Pull from environment variables (or any config source):
        const appId = configService.get<string>('PRIVY_APP_ID');
        const appSecret = configService.get<string>('PRIVY_APP_SECRET');

        if (!appId || !appSecret) {
          throw new Error('Missing Privy API credentials in environment variables');
        }
        const privy = new PrivyClient(
            appId,
            appSecret,
            );

        return privy;
      },
      inject: [ConfigService],
    },
  ],
  exports: ['PRIVY_CLIENT'],
})
export class PrivyModule {}
