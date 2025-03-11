import { Field, ObjectType, InputType } from '@nestjs/graphql';

@ObjectType()
export class ApiSecretResponse {
  @Field()
  apiSecret: string;
}

@ObjectType()
export class ApiHealthResponse {
  @Field()
  status: string;

  @Field({ nullable: true })
  error?: string;
}

@ObjectType()
export class TelegramChat {
  @Field()
  id: string;

  @Field()
  name: string;

  @Field()
  type: string;

  @Field({ nullable: true })
  photoUrl?: string;

  @Field()
  callCount: number;

  @Field({ nullable: true })
  lastCallTimestamp?: Date;
}

@ObjectType()
export class ChatsResponse {
  @Field(() => [TelegramChat])
  chats: TelegramChat[];
}

@InputType()
export class SaveChatsInput {
  @Field(() => [String])
  chatIds: string[];
} 