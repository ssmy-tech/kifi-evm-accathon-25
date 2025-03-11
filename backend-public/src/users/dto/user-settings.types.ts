import { Field, ObjectType, InputType, Float, Int } from '@nestjs/graphql';

@ObjectType()
export class UserSettings {
  @Field()
  enableAutoAlpha: boolean;

  @Field(() => [String])
  selectedChatsIds: string[];

  @Field(() => Int)
  groupCallThreshold: number;

  @Field(() => Float)
  slippage: number;

  @Field(() => Float)
  buyAmount: number;
}

@InputType()
export class UpdateUserSettingsInput {
  @Field({ nullable: true })
  enableAutoAlpha?: boolean;

  @Field(() => [String], { nullable: true })
  selectedChatsIds?: string[];

  @Field(() => Int, { nullable: true })
  groupCallThreshold?: number;

  @Field(() => Float, { nullable: true })
  slippage?: number;

  @Field(() => Float, { nullable: true })
  buyAmount?: number;
} 