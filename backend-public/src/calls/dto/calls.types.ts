import { Field, ObjectType, InputType } from '@nestjs/graphql';
import { TelegramChat } from '../../telegram/dto/telegram.types';
import { Chain } from '@prisma/client';

@ObjectType()
export class Message {
  @Field()
  id: string;

  @Field()
  createdAt: Date;

  @Field({ nullable: true })
  text?: string;
  
  @Field({ nullable: true })
  fromId?: string;
}

@ObjectType()
export class CallWithChat {
  @Field(() => TelegramChat)
  chat: TelegramChat;

  @Field()
  callCount: number;

  @Field(() => [Message], { nullable: true })
  messages?: Message[];
}

@ObjectType()
export class TokenCalls {
  @Field()
  chain: string;

  @Field()
  address: string;

  @Field(() => [CallWithChat])
  calls: CallWithChat[];
}

@ObjectType()
export class TokenCallsResponse {
  @Field(() => [TokenCalls])
  tokenCalls: TokenCalls[];
}

@InputType()
export class GetCallsInput {
  @Field(() => String, { nullable: true })
  chain?: Chain;
  
  @Field(() => String, { nullable: true })
  address?: string;
} 