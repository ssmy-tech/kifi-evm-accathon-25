import { GraphQLResolveInfo, GraphQLScalarType, GraphQLScalarTypeConfig } from 'graphql';
import { Context } from '../context';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
export type RequireFields<T, K extends keyof T> = Omit<T, K> & { [P in K]-?: NonNullable<T[P]> };
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: Date; output: Date; }
};

export type ApiHealthResponse = {
  error: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type ApiSecretResponse = {
  apiSecret: Scalars['String']['output'];
};

export type AuthPayload = {
  createdUser: Scalars['Boolean']['output'];
};

export type Call = {
  address: Scalars['String']['output'];
  createdAt: Scalars['DateTime']['output'];
  hasFutureAnalysis: Scalars['Boolean']['output'];
  hasInitialAnalysis: Scalars['Boolean']['output'];
  id: Scalars['String']['output'];
  messages: Array<Message>;
};

export type ChatWithCalls = {
  calls: Array<Call>;
  chat: TelegramChat;
};

export type ChatsResponse = {
  chats: Array<TelegramChat>;
};

export type GetCallsInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Scalars['String']['input']>;
};

export type KeyTopic = {
  context: Scalars['String']['output'];
  frequency: Scalars['Float']['output'];
  topic: Scalars['String']['output'];
};

export type Message = {
  createdAt: Scalars['DateTime']['output'];
  fromId: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  messageType: MessageType;
  reason: Maybe<Scalars['String']['output']>;
  text: Maybe<Scalars['String']['output']>;
  tgMessageId: Scalars['String']['output'];
};

/** The type of message (Call or Context) */
export type MessageType =
  | 'Call'
  | 'Context';

export type Mutation = {
  privyLogin: AuthPayload;
  saveUserChats: ChatsResponse;
  updateTelegramApiLink: Scalars['Boolean']['output'];
  updateUserSettings: UserSettings;
};


export type MutationSaveUserChatsArgs = {
  input: SaveChatsInput;
};


export type MutationUpdateTelegramApiLinkArgs = {
  apiLink: Scalars['String']['input'];
};


export type MutationUpdateUserSettingsArgs = {
  input: UpdateUserSettingsInput;
};

export type NextStep = {
  context: Scalars['String']['output'];
  suggestion: Scalars['String']['output'];
};

export type Query = {
  checkTelegramApiHealth: ApiHealthResponse;
  getCallsByToken: TokenCallsResponse;
  getChatPhoto: Maybe<Scalars['String']['output']>;
  getTelegramApiSecret: ApiSecretResponse;
  getTelegramChats: ChatsResponse;
  getTelegramContractAnalytics: TelegramAnalyticsResponse;
  getTwitterContractAnalytics: TwitterAnalyticsResponse;
  getUserSavedChats: ChatsResponse;
  getUserSettings: UserSettings;
  user: Maybe<User>;
  whoAmI: Scalars['String']['output'];
};


export type QueryGetCallsByTokenArgs = {
  input?: InputMaybe<GetCallsInput>;
};


export type QueryGetChatPhotoArgs = {
  chatId: Scalars['String']['input'];
};


export type QueryGetTelegramContractAnalyticsArgs = {
  input: TelegramContractAnalyticsInput;
};


export type QueryGetTwitterContractAnalyticsArgs = {
  input: TwitterContractAnalyticsInput;
};

export type SaveChatsInput = {
  chatIds: Array<Scalars['String']['input']>;
};

export type Sentiment = {
  communityMood: Scalars['String']['output'];
  details: Array<Scalars['String']['output']>;
  overall: Scalars['String']['output'];
};

export type TelegramAnalyticsResponse = {
  keyTopics: Array<KeyTopic>;
  lastGeneratedAt: Scalars['DateTime']['output'];
  nextSteps: Array<NextStep>;
  sentiment: Sentiment;
  summary: Scalars['String']['output'];
  timeUntilNextGeneration: Scalars['Float']['output'];
};

export type TelegramChat = {
  callCount: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  lastCallTimestamp: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  photoUrl: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type TelegramContractAnalyticsInput = {
  contractAddress: Scalars['String']['input'];
};

export type TokenCalls = {
  address: Scalars['String']['output'];
  chain: Scalars['String']['output'];
  chats: Array<ChatWithCalls>;
};

export type TokenCallsResponse = {
  tokenCalls: Array<TokenCalls>;
};

export type Tweet = {
  author: Scalars['String']['output'];
  engagement: TweetEngagement;
  text: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type TweetEngagement = {
  likes: Scalars['Float']['output'];
  replies: Scalars['Float']['output'];
  retweets: Scalars['Float']['output'];
  views: Scalars['Float']['output'];
};

export type TwitterAnalyticsResponse = {
  keyTopics: Array<KeyTopic>;
  lastGeneratedAt: Scalars['DateTime']['output'];
  nextSteps: Array<NextStep>;
  relevantTweets: Array<Tweet>;
  sentiment: Sentiment;
  summary: Scalars['String']['output'];
  timeUntilNextGeneration: Scalars['Float']['output'];
};

export type TwitterContractAnalyticsInput = {
  contractAddress: Scalars['String']['input'];
};

export type UpdateUserSettingsInput = {
  buyAmount?: InputMaybe<Scalars['Float']['input']>;
  enableAutoAlpha?: InputMaybe<Scalars['Boolean']['input']>;
  groupCallThreshold?: InputMaybe<Scalars['Int']['input']>;
  selectedChatsIds?: InputMaybe<Array<Scalars['String']['input']>>;
  slippage?: InputMaybe<Scalars['Float']['input']>;
};

export type User = {
  createdAt: Scalars['DateTime']['output'];
  privyId: Scalars['String']['output'];
  tgApiLink: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type UserSettings = {
  buyAmount: Scalars['Float']['output'];
  enableAutoAlpha: Scalars['Boolean']['output'];
  groupCallThreshold: Scalars['Int']['output'];
  selectedChatsIds: Array<Scalars['String']['output']>;
  slippage: Scalars['Float']['output'];
};

export type WithIndex<TObject> = TObject & Record<string, any>;
export type ResolversObject<TObject> = WithIndex<TObject>;

export type ResolverTypeWrapper<T> = Promise<T> | T;


export type ResolverWithResolve<TResult, TParent, TContext, TArgs> = {
  resolve: ResolverFn<TResult, TParent, TContext, TArgs>;
};
export type Resolver<TResult, TParent = {}, TContext = {}, TArgs = {}> = ResolverFn<TResult, TParent, TContext, TArgs> | ResolverWithResolve<TResult, TParent, TContext, TArgs>;

export type ResolverFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => Promise<TResult> | TResult;

export type SubscriptionSubscribeFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => AsyncIterable<TResult> | Promise<AsyncIterable<TResult>>;

export type SubscriptionResolveFn<TResult, TParent, TContext, TArgs> = (
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;

export interface SubscriptionSubscriberObject<TResult, TKey extends string, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<{ [key in TKey]: TResult }, TParent, TContext, TArgs>;
  resolve?: SubscriptionResolveFn<TResult, { [key in TKey]: TResult }, TContext, TArgs>;
}

export interface SubscriptionResolverObject<TResult, TParent, TContext, TArgs> {
  subscribe: SubscriptionSubscribeFn<any, TParent, TContext, TArgs>;
  resolve: SubscriptionResolveFn<TResult, any, TContext, TArgs>;
}

export type SubscriptionObject<TResult, TKey extends string, TParent, TContext, TArgs> =
  | SubscriptionSubscriberObject<TResult, TKey, TParent, TContext, TArgs>
  | SubscriptionResolverObject<TResult, TParent, TContext, TArgs>;

export type SubscriptionResolver<TResult, TKey extends string, TParent = {}, TContext = {}, TArgs = {}> =
  | ((...args: any[]) => SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>)
  | SubscriptionObject<TResult, TKey, TParent, TContext, TArgs>;

export type TypeResolveFn<TTypes, TParent = {}, TContext = {}> = (
  parent: TParent,
  context: TContext,
  info: GraphQLResolveInfo
) => Maybe<TTypes> | Promise<Maybe<TTypes>>;

export type IsTypeOfResolverFn<T = {}, TContext = {}> = (obj: T, context: TContext, info: GraphQLResolveInfo) => boolean | Promise<boolean>;

export type NextResolverFn<T> = () => Promise<T>;

export type DirectiveResolverFn<TResult = {}, TParent = {}, TContext = {}, TArgs = {}> = (
  next: NextResolverFn<TResult>,
  parent: TParent,
  args: TArgs,
  context: TContext,
  info: GraphQLResolveInfo
) => TResult | Promise<TResult>;



/** Mapping between all available schema types and the resolvers types */
export type ResolversTypes = ResolversObject<{
  ApiHealthResponse: ResolverTypeWrapper<ApiHealthResponse>;
  ApiSecretResponse: ResolverTypeWrapper<ApiSecretResponse>;
  AuthPayload: ResolverTypeWrapper<AuthPayload>;
  Boolean: ResolverTypeWrapper<Scalars['Boolean']['output']>;
  Call: ResolverTypeWrapper<Call>;
  ChatWithCalls: ResolverTypeWrapper<ChatWithCalls>;
  ChatsResponse: ResolverTypeWrapper<ChatsResponse>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GetCallsInput: GetCallsInput;
  Int: ResolverTypeWrapper<Scalars['Int']['output']>;
  KeyTopic: ResolverTypeWrapper<KeyTopic>;
  Message: ResolverTypeWrapper<Message>;
  MessageType: MessageType;
  Mutation: ResolverTypeWrapper<{}>;
  NextStep: ResolverTypeWrapper<NextStep>;
  Query: ResolverTypeWrapper<{}>;
  SaveChatsInput: SaveChatsInput;
  Sentiment: ResolverTypeWrapper<Sentiment>;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  TelegramAnalyticsResponse: ResolverTypeWrapper<TelegramAnalyticsResponse>;
  TelegramChat: ResolverTypeWrapper<TelegramChat>;
  TelegramContractAnalyticsInput: TelegramContractAnalyticsInput;
  TokenCalls: ResolverTypeWrapper<TokenCalls>;
  TokenCallsResponse: ResolverTypeWrapper<TokenCallsResponse>;
  Tweet: ResolverTypeWrapper<Tweet>;
  TweetEngagement: ResolverTypeWrapper<TweetEngagement>;
  TwitterAnalyticsResponse: ResolverTypeWrapper<TwitterAnalyticsResponse>;
  TwitterContractAnalyticsInput: TwitterContractAnalyticsInput;
  UpdateUserSettingsInput: UpdateUserSettingsInput;
  User: ResolverTypeWrapper<User>;
  UserSettings: ResolverTypeWrapper<UserSettings>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  ApiHealthResponse: ApiHealthResponse;
  ApiSecretResponse: ApiSecretResponse;
  AuthPayload: AuthPayload;
  Boolean: Scalars['Boolean']['output'];
  Call: Call;
  ChatWithCalls: ChatWithCalls;
  ChatsResponse: ChatsResponse;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  GetCallsInput: GetCallsInput;
  Int: Scalars['Int']['output'];
  KeyTopic: KeyTopic;
  Message: Message;
  Mutation: {};
  NextStep: NextStep;
  Query: {};
  SaveChatsInput: SaveChatsInput;
  Sentiment: Sentiment;
  String: Scalars['String']['output'];
  TelegramAnalyticsResponse: TelegramAnalyticsResponse;
  TelegramChat: TelegramChat;
  TelegramContractAnalyticsInput: TelegramContractAnalyticsInput;
  TokenCalls: TokenCalls;
  TokenCallsResponse: TokenCallsResponse;
  Tweet: Tweet;
  TweetEngagement: TweetEngagement;
  TwitterAnalyticsResponse: TwitterAnalyticsResponse;
  TwitterContractAnalyticsInput: TwitterContractAnalyticsInput;
  UpdateUserSettingsInput: UpdateUserSettingsInput;
  User: User;
  UserSettings: UserSettings;
}>;

export type ApiHealthResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ApiHealthResponse'] = ResolversParentTypes['ApiHealthResponse']> = ResolversObject<{
  error?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  status?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ApiSecretResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ApiSecretResponse'] = ResolversParentTypes['ApiSecretResponse']> = ResolversObject<{
  apiSecret?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type AuthPayloadResolvers<ContextType = Context, ParentType extends ResolversParentTypes['AuthPayload'] = ResolversParentTypes['AuthPayload']> = ResolversObject<{
  createdUser?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type CallResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Call'] = ResolversParentTypes['Call']> = ResolversObject<{
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  hasFutureAnalysis?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  hasInitialAnalysis?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messages?: Resolver<Array<ResolversTypes['Message']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ChatWithCallsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ChatWithCalls'] = ResolversParentTypes['ChatWithCalls']> = ResolversObject<{
  calls?: Resolver<Array<ResolversTypes['Call']>, ParentType, ContextType>;
  chat?: Resolver<ResolversTypes['TelegramChat'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type ChatsResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['ChatsResponse'] = ResolversParentTypes['ChatsResponse']> = ResolversObject<{
  chats?: Resolver<Array<ResolversTypes['TelegramChat']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export interface DateTimeScalarConfig extends GraphQLScalarTypeConfig<ResolversTypes['DateTime'], any> {
  name: 'DateTime';
}

export type KeyTopicResolvers<ContextType = Context, ParentType extends ResolversParentTypes['KeyTopic'] = ResolversParentTypes['KeyTopic']> = ResolversObject<{
  context?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  frequency?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  topic?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MessageResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Message'] = ResolversParentTypes['Message']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  fromId?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  messageType?: Resolver<ResolversTypes['MessageType'], ParentType, ContextType>;
  reason?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  text?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  tgMessageId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  privyLogin?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType>;
  saveUserChats?: Resolver<ResolversTypes['ChatsResponse'], ParentType, ContextType, RequireFields<MutationSaveUserChatsArgs, 'input'>>;
  updateTelegramApiLink?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationUpdateTelegramApiLinkArgs, 'apiLink'>>;
  updateUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType, RequireFields<MutationUpdateUserSettingsArgs, 'input'>>;
}>;

export type NextStepResolvers<ContextType = Context, ParentType extends ResolversParentTypes['NextStep'] = ResolversParentTypes['NextStep']> = ResolversObject<{
  context?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  suggestion?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  checkTelegramApiHealth?: Resolver<ResolversTypes['ApiHealthResponse'], ParentType, ContextType>;
  getCallsByToken?: Resolver<ResolversTypes['TokenCallsResponse'], ParentType, ContextType, Partial<QueryGetCallsByTokenArgs>>;
  getChatPhoto?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType, RequireFields<QueryGetChatPhotoArgs, 'chatId'>>;
  getTelegramApiSecret?: Resolver<ResolversTypes['ApiSecretResponse'], ParentType, ContextType>;
  getTelegramChats?: Resolver<ResolversTypes['ChatsResponse'], ParentType, ContextType>;
  getTelegramContractAnalytics?: Resolver<ResolversTypes['TelegramAnalyticsResponse'], ParentType, ContextType, RequireFields<QueryGetTelegramContractAnalyticsArgs, 'input'>>;
  getTwitterContractAnalytics?: Resolver<ResolversTypes['TwitterAnalyticsResponse'], ParentType, ContextType, RequireFields<QueryGetTwitterContractAnalyticsArgs, 'input'>>;
  getUserSavedChats?: Resolver<ResolversTypes['ChatsResponse'], ParentType, ContextType>;
  getUserSettings?: Resolver<ResolversTypes['UserSettings'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  whoAmI?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type SentimentResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Sentiment'] = ResolversParentTypes['Sentiment']> = ResolversObject<{
  communityMood?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  details?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  overall?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TelegramAnalyticsResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TelegramAnalyticsResponse'] = ResolversParentTypes['TelegramAnalyticsResponse']> = ResolversObject<{
  keyTopics?: Resolver<Array<ResolversTypes['KeyTopic']>, ParentType, ContextType>;
  lastGeneratedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  nextSteps?: Resolver<Array<ResolversTypes['NextStep']>, ParentType, ContextType>;
  sentiment?: Resolver<ResolversTypes['Sentiment'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timeUntilNextGeneration?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TelegramChatResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TelegramChat'] = ResolversParentTypes['TelegramChat']> = ResolversObject<{
  callCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  lastCallTimestamp?: Resolver<Maybe<ResolversTypes['DateTime']>, ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  photoUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TokenCallsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TokenCalls'] = ResolversParentTypes['TokenCalls']> = ResolversObject<{
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  chats?: Resolver<Array<ResolversTypes['ChatWithCalls']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TokenCallsResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TokenCallsResponse'] = ResolversParentTypes['TokenCallsResponse']> = ResolversObject<{
  tokenCalls?: Resolver<Array<ResolversTypes['TokenCalls']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TweetResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Tweet'] = ResolversParentTypes['Tweet']> = ResolversObject<{
  author?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  engagement?: Resolver<ResolversTypes['TweetEngagement'], ParentType, ContextType>;
  text?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timestamp?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  url?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TweetEngagementResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TweetEngagement'] = ResolversParentTypes['TweetEngagement']> = ResolversObject<{
  likes?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  replies?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  retweets?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  views?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TwitterAnalyticsResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TwitterAnalyticsResponse'] = ResolversParentTypes['TwitterAnalyticsResponse']> = ResolversObject<{
  keyTopics?: Resolver<Array<ResolversTypes['KeyTopic']>, ParentType, ContextType>;
  lastGeneratedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  nextSteps?: Resolver<Array<ResolversTypes['NextStep']>, ParentType, ContextType>;
  relevantTweets?: Resolver<Array<ResolversTypes['Tweet']>, ParentType, ContextType>;
  sentiment?: Resolver<ResolversTypes['Sentiment'], ParentType, ContextType>;
  summary?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  timeUntilNextGeneration?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  privyId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tgApiLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserSettingsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['UserSettings'] = ResolversParentTypes['UserSettings']> = ResolversObject<{
  buyAmount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  enableAutoAlpha?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType>;
  groupCallThreshold?: Resolver<ResolversTypes['Int'], ParentType, ContextType>;
  selectedChatsIds?: Resolver<Array<ResolversTypes['String']>, ParentType, ContextType>;
  slippage?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  ApiHealthResponse?: ApiHealthResponseResolvers<ContextType>;
  ApiSecretResponse?: ApiSecretResponseResolvers<ContextType>;
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  Call?: CallResolvers<ContextType>;
  ChatWithCalls?: ChatWithCallsResolvers<ContextType>;
  ChatsResponse?: ChatsResponseResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  KeyTopic?: KeyTopicResolvers<ContextType>;
  Message?: MessageResolvers<ContextType>;
  Mutation?: MutationResolvers<ContextType>;
  NextStep?: NextStepResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  Sentiment?: SentimentResolvers<ContextType>;
  TelegramAnalyticsResponse?: TelegramAnalyticsResponseResolvers<ContextType>;
  TelegramChat?: TelegramChatResolvers<ContextType>;
  TokenCalls?: TokenCallsResolvers<ContextType>;
  TokenCallsResponse?: TokenCallsResponseResolvers<ContextType>;
  Tweet?: TweetResolvers<ContextType>;
  TweetEngagement?: TweetEngagementResolvers<ContextType>;
  TwitterAnalyticsResponse?: TwitterAnalyticsResponseResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
  UserSettings?: UserSettingsResolvers<ContextType>;
}>;

