import { Field, ObjectType, InputType } from '@nestjs/graphql';

@ObjectType()
class KeyTopic {
  @Field()
  topic: string;

  @Field()
  frequency: number;

  @Field()
  context: string;
}

@ObjectType()
class NextStep {
  @Field()
  suggestion: string;

  @Field()
  context: string;
}

@ObjectType()
class Sentiment {
  @Field()
  overall: string;

  @Field()
  communityMood: string;

  @Field(() => [String])
  details: string[];
}

@ObjectType()
class TweetEngagement {
  @Field()
  likes: number;

  @Field()
  retweets: number;

  @Field()
  replies: number;

  @Field()
  views: number;
}

@ObjectType()
class Tweet {
  @Field()
  url: string;

  @Field()
  text: string;

  @Field()
  author: string;

  @Field()
  timestamp: string;

  @Field(() => TweetEngagement)
  engagement: TweetEngagement;
}

@ObjectType()
export class TwitterAnalyticsResponse {
  @Field()
  summary: string;

  @Field(() => Sentiment)
  sentiment: Sentiment;

  @Field(() => [KeyTopic])
  keyTopics: KeyTopic[];

  @Field(() => [NextStep])
  nextSteps: NextStep[];

  @Field(() => [Tweet])
  relevantTweets: Tweet[];

  @Field()
  timeUntilNextGeneration: number;

  @Field()
  lastGeneratedAt: Date;
}

@ObjectType()
export class TelegramAnalyticsResponse {
  @Field()
  summary: string;

  @Field(() => Sentiment)
  sentiment: Sentiment;

  @Field(() => [KeyTopic])
  keyTopics: KeyTopic[];

  @Field(() => [NextStep])
  nextSteps: NextStep[];

  @Field()
  timeUntilNextGeneration: number;

  @Field()
  lastGeneratedAt: Date;
}

@InputType()
export class TelegramContractAnalyticsInput {
  @Field()
  contractAddress: string;
}

@InputType()
export class TwitterContractAnalyticsInput {
  @Field()
  contractAddress: string;
} 