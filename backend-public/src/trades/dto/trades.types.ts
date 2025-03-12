import { Field, ObjectType, registerEnumType, Float, InputType } from '@nestjs/graphql';
import { Chain } from '@prisma/client';

// Register the enums with GraphQL
registerEnumType(Chain, {
  name: 'Chain',
  description: 'Supported blockchain networks',
});

export enum TradeStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  EXECUTING = 'EXECUTING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
}

export enum ExitReason {
  STOP_LOSS = 'STOP_LOSS',
  TAKE_PROFIT = 'TAKE_PROFIT',
  MANUAL = 'MANUAL',
}

registerEnumType(TradeStatus, {
  name: 'TradeStatus',
  description: 'Status of a trade',
});

registerEnumType(ExitReason, {
  name: 'ExitReason',
  description: 'Reason for exiting a trade',
});

@ObjectType()
export class Trade {
  @Field()
  tokenAddress: string;

  @Field(() => String, { nullable: true })
  entryTxHash?: string;

  @Field()
  amount: string;
}

@ObjectType()
export class TradesResponse {
  @Field(() => [Trade])
  trades: Trade[];
}

@InputType()
export class GetTradesInput {
  @Field(() => Chain, { nullable: true })
  chain?: Chain;
} 