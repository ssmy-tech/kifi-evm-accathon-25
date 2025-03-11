import { Field, ObjectType, InputType, registerEnumType } from '@nestjs/graphql';
import { TelegramChat } from '../../telegram/dto/telegram.types';
import { Chain, MessageType } from '@prisma/client';

// Register the MessageType enum with GraphQL
registerEnumType(MessageType, {
  name: 'MessageType',
  description: 'The type of message (Call or Context)',
});

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

  @Field(() => MessageType)
  messageType: MessageType;

  @Field({ nullable: true })
  reason?: string;

  @Field()
  tgMessageId: string;
}

@ObjectType()
export class Call {
  @Field()
  id: string;

  @Field()
  createdAt: Date;

  @Field()
  address: string;

  @Field(() => [Message])
  messages: Message[];

  @Field()
  hasInitialAnalysis: boolean;

  @Field()
  hasFutureAnalysis: boolean;
}

@ObjectType()
export class ChatWithCalls {
  @Field(() => TelegramChat)
  chat: TelegramChat;

  @Field(() => [Call])
  calls: Call[];
}

@ObjectType()
export class TokenCalls {
  @Field()
  chain: string;

  @Field()
  address: string;

  @Field(() => [ChatWithCalls])
  chats: ChatWithCalls[];
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