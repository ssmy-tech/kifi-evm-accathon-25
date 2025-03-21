import { Module } from '@nestjs/common';
import { GraphQLModule } from '@nestjs/graphql';
import { ApolloDriver, ApolloDriverConfig } from '@nestjs/apollo';
import { ConfigModule } from '@nestjs/config';
import { join } from 'path';
import { PrismaService } from './prisma.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { PrivyModule } from './privy/privy.module';
import { TelegramModule } from './telegram/telegram.module';
import { HealthModule } from './health/health.module';
import { CallsModule } from './calls/calls.module';
import { AiAnalyticsModule } from './ai-analytics/ai-analytics.module';
import { TradesModule } from './trades/trades.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    GraphQLModule.forRoot<ApolloDriverConfig>({
      driver: ApolloDriver,
      autoSchemaFile: join(process.cwd(), 'src/schema.gql'),
      sortSchema: true,
      playground: true,
      csrfPrevention: false,
    }),
    UsersModule,
    AuthModule,
    PrivyModule,
    TelegramModule,
    HealthModule,
    CallsModule,
    AiAnalyticsModule,
    TradesModule,
  ],
  providers: [PrismaService],
})
export class AppModule {} 