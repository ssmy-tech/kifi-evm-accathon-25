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

export type CallWithChat = {
  callCount: Scalars['Float']['output'];
  chat: TelegramChat;
};

export type ChatsResponse = {
  chats: Array<TelegramChat>;
};

export type GetCallsInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Scalars['String']['input']>;
};

export type Mutation = {
  privyLogin: AuthPayload;
  saveUserChats: ChatsResponse;
  updateTelegramApiLink: Scalars['Boolean']['output'];
};


export type MutationSaveUserChatsArgs = {
  input: SaveChatsInput;
};


export type MutationUpdateTelegramApiLinkArgs = {
  apiLink: Scalars['String']['input'];
};

export type Query = {
  checkTelegramApiHealth: ApiHealthResponse;
  getCallsByToken: TokenCallsResponse;
  getChatPhoto: Maybe<Scalars['String']['output']>;
  getTelegramApiSecret: ApiSecretResponse;
  getTelegramChats: ChatsResponse;
  getUserSavedChats: ChatsResponse;
  user: Maybe<User>;
  users: Array<User>;
  whoAmI: Scalars['String']['output'];
};


export type QueryGetCallsByTokenArgs = {
  input?: InputMaybe<GetCallsInput>;
};


export type QueryGetChatPhotoArgs = {
  chatId: Scalars['String']['input'];
};

export type SaveChatsInput = {
  chatIds: Array<Scalars['String']['input']>;
};

export type TelegramChat = {
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  photoUrl: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type TokenCalls = {
  address: Scalars['String']['output'];
  calls: Array<CallWithChat>;
  chain: Scalars['String']['output'];
};

export type TokenCallsResponse = {
  tokenCalls: Array<TokenCalls>;
};

export type User = {
  createdAt: Scalars['DateTime']['output'];
  privyId: Scalars['String']['output'];
  tgApiLink: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
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
  CallWithChat: ResolverTypeWrapper<CallWithChat>;
  ChatsResponse: ResolverTypeWrapper<ChatsResponse>;
  DateTime: ResolverTypeWrapper<Scalars['DateTime']['output']>;
  Float: ResolverTypeWrapper<Scalars['Float']['output']>;
  GetCallsInput: GetCallsInput;
  Mutation: ResolverTypeWrapper<{}>;
  Query: ResolverTypeWrapper<{}>;
  SaveChatsInput: SaveChatsInput;
  String: ResolverTypeWrapper<Scalars['String']['output']>;
  TelegramChat: ResolverTypeWrapper<TelegramChat>;
  TokenCalls: ResolverTypeWrapper<TokenCalls>;
  TokenCallsResponse: ResolverTypeWrapper<TokenCallsResponse>;
  User: ResolverTypeWrapper<User>;
}>;

/** Mapping between all available schema types and the resolvers parents */
export type ResolversParentTypes = ResolversObject<{
  ApiHealthResponse: ApiHealthResponse;
  ApiSecretResponse: ApiSecretResponse;
  AuthPayload: AuthPayload;
  Boolean: Scalars['Boolean']['output'];
  CallWithChat: CallWithChat;
  ChatsResponse: ChatsResponse;
  DateTime: Scalars['DateTime']['output'];
  Float: Scalars['Float']['output'];
  GetCallsInput: GetCallsInput;
  Mutation: {};
  Query: {};
  SaveChatsInput: SaveChatsInput;
  String: Scalars['String']['output'];
  TelegramChat: TelegramChat;
  TokenCalls: TokenCalls;
  TokenCallsResponse: TokenCallsResponse;
  User: User;
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

export type CallWithChatResolvers<ContextType = Context, ParentType extends ResolversParentTypes['CallWithChat'] = ResolversParentTypes['CallWithChat']> = ResolversObject<{
  callCount?: Resolver<ResolversTypes['Float'], ParentType, ContextType>;
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

export type MutationResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Mutation'] = ResolversParentTypes['Mutation']> = ResolversObject<{
  privyLogin?: Resolver<ResolversTypes['AuthPayload'], ParentType, ContextType>;
  saveUserChats?: Resolver<ResolversTypes['ChatsResponse'], ParentType, ContextType, RequireFields<MutationSaveUserChatsArgs, 'input'>>;
  updateTelegramApiLink?: Resolver<ResolversTypes['Boolean'], ParentType, ContextType, RequireFields<MutationUpdateTelegramApiLinkArgs, 'apiLink'>>;
}>;

export type QueryResolvers<ContextType = Context, ParentType extends ResolversParentTypes['Query'] = ResolversParentTypes['Query']> = ResolversObject<{
  checkTelegramApiHealth?: Resolver<ResolversTypes['ApiHealthResponse'], ParentType, ContextType>;
  getCallsByToken?: Resolver<ResolversTypes['TokenCallsResponse'], ParentType, ContextType, Partial<QueryGetCallsByTokenArgs>>;
  getChatPhoto?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType, RequireFields<QueryGetChatPhotoArgs, 'chatId'>>;
  getTelegramApiSecret?: Resolver<ResolversTypes['ApiSecretResponse'], ParentType, ContextType>;
  getTelegramChats?: Resolver<ResolversTypes['ChatsResponse'], ParentType, ContextType>;
  getUserSavedChats?: Resolver<ResolversTypes['ChatsResponse'], ParentType, ContextType>;
  user?: Resolver<Maybe<ResolversTypes['User']>, ParentType, ContextType>;
  users?: Resolver<Array<ResolversTypes['User']>, ParentType, ContextType>;
  whoAmI?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
}>;

export type TelegramChatResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TelegramChat'] = ResolversParentTypes['TelegramChat']> = ResolversObject<{
  id?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  name?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  photoUrl?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  type?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TokenCallsResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TokenCalls'] = ResolversParentTypes['TokenCalls']> = ResolversObject<{
  address?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  calls?: Resolver<Array<ResolversTypes['CallWithChat']>, ParentType, ContextType>;
  chain?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type TokenCallsResponseResolvers<ContextType = Context, ParentType extends ResolversParentTypes['TokenCallsResponse'] = ResolversParentTypes['TokenCallsResponse']> = ResolversObject<{
  tokenCalls?: Resolver<Array<ResolversTypes['TokenCalls']>, ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type UserResolvers<ContextType = Context, ParentType extends ResolversParentTypes['User'] = ResolversParentTypes['User']> = ResolversObject<{
  createdAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  privyId?: Resolver<ResolversTypes['String'], ParentType, ContextType>;
  tgApiLink?: Resolver<Maybe<ResolversTypes['String']>, ParentType, ContextType>;
  updatedAt?: Resolver<ResolversTypes['DateTime'], ParentType, ContextType>;
  __isTypeOf?: IsTypeOfResolverFn<ParentType, ContextType>;
}>;

export type Resolvers<ContextType = Context> = ResolversObject<{
  ApiHealthResponse?: ApiHealthResponseResolvers<ContextType>;
  ApiSecretResponse?: ApiSecretResponseResolvers<ContextType>;
  AuthPayload?: AuthPayloadResolvers<ContextType>;
  CallWithChat?: CallWithChatResolvers<ContextType>;
  ChatsResponse?: ChatsResponseResolvers<ContextType>;
  DateTime?: GraphQLScalarType;
  Mutation?: MutationResolvers<ContextType>;
  Query?: QueryResolvers<ContextType>;
  TelegramChat?: TelegramChatResolvers<ContextType>;
  TokenCalls?: TokenCallsResolvers<ContextType>;
  TokenCallsResponse?: TokenCallsResponseResolvers<ContextType>;
  User?: UserResolvers<ContextType>;
}>;

