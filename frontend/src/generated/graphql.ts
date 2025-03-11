import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: { input: string; output: string; }
  String: { input: string; output: string; }
  Boolean: { input: boolean; output: boolean; }
  Int: { input: number; output: number; }
  Float: { input: number; output: number; }
  /** A date-time string at UTC, such as 2019-12-03T09:54:33Z, compliant with the date-time format. */
  DateTime: { input: string; output: string; }
};

export type ApiHealthResponse = {
  __typename?: 'ApiHealthResponse';
  error?: Maybe<Scalars['String']['output']>;
  status: Scalars['String']['output'];
};

export type ApiSecretResponse = {
  __typename?: 'ApiSecretResponse';
  apiSecret: Scalars['String']['output'];
};

export type AuthPayload = {
  __typename?: 'AuthPayload';
  createdUser: Scalars['Boolean']['output'];
};

export type CallWithChat = {
  __typename?: 'CallWithChat';
  callCount: Scalars['Float']['output'];
  chat: TelegramChat;
  hasFutureAnalysis: Scalars['Boolean']['output'];
  hasInitialAnalysis: Scalars['Boolean']['output'];
  messages?: Maybe<Array<Message>>;
};

export type ChatsResponse = {
  __typename?: 'ChatsResponse';
  chats: Array<TelegramChat>;
};

export type GetCallsInput = {
  address?: InputMaybe<Scalars['String']['input']>;
  chain?: InputMaybe<Scalars['String']['input']>;
};

export type KeyTopic = {
  __typename?: 'KeyTopic';
  context: Scalars['String']['output'];
  frequency: Scalars['Float']['output'];
  topic: Scalars['String']['output'];
};

export type Message = {
  __typename?: 'Message';
  createdAt: Scalars['DateTime']['output'];
  fromId?: Maybe<Scalars['String']['output']>;
  id: Scalars['String']['output'];
  messageType: MessageType;
  reason?: Maybe<Scalars['String']['output']>;
  text?: Maybe<Scalars['String']['output']>;
  tgMessageId: Scalars['String']['output'];
};

/** The type of message (Call or Context) */
export enum MessageType {
  Call = 'Call',
  Context = 'Context'
}

export type Mutation = {
  __typename?: 'Mutation';
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
  __typename?: 'NextStep';
  context: Scalars['String']['output'];
  suggestion: Scalars['String']['output'];
};

export type Query = {
  __typename?: 'Query';
  checkTelegramApiHealth: ApiHealthResponse;
  getCallsByToken: TokenCallsResponse;
  getChatPhoto?: Maybe<Scalars['String']['output']>;
  getTelegramApiSecret: ApiSecretResponse;
  getTelegramChats: ChatsResponse;
  getTelegramContractAnalytics: TelegramAnalyticsResponse;
  getTwitterContractAnalytics: TwitterAnalyticsResponse;
  getUserSavedChats: ChatsResponse;
  getUserSettings: UserSettings;
  user?: Maybe<User>;
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
  __typename?: 'Sentiment';
  communityMood: Scalars['String']['output'];
  details: Array<Scalars['String']['output']>;
  overall: Scalars['String']['output'];
};

export type TelegramAnalyticsResponse = {
  __typename?: 'TelegramAnalyticsResponse';
  keyTopics: Array<KeyTopic>;
  lastGeneratedAt: Scalars['DateTime']['output'];
  nextSteps: Array<NextStep>;
  sentiment: Sentiment;
  summary: Scalars['String']['output'];
  timeUntilNextGeneration: Scalars['Float']['output'];
};

export type TelegramChat = {
  __typename?: 'TelegramChat';
  callCount: Scalars['Float']['output'];
  id: Scalars['String']['output'];
  lastCallTimestamp?: Maybe<Scalars['DateTime']['output']>;
  name: Scalars['String']['output'];
  photoUrl?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type TelegramContractAnalyticsInput = {
  contractAddress: Scalars['String']['input'];
};

export type TokenCalls = {
  __typename?: 'TokenCalls';
  address: Scalars['String']['output'];
  calls: Array<CallWithChat>;
  chain: Scalars['String']['output'];
};

export type TokenCallsResponse = {
  __typename?: 'TokenCallsResponse';
  tokenCalls: Array<TokenCalls>;
};

export type Tweet = {
  __typename?: 'Tweet';
  author: Scalars['String']['output'];
  engagement: TweetEngagement;
  text: Scalars['String']['output'];
  timestamp: Scalars['String']['output'];
  url: Scalars['String']['output'];
};

export type TweetEngagement = {
  __typename?: 'TweetEngagement';
  likes: Scalars['Float']['output'];
  replies: Scalars['Float']['output'];
  retweets: Scalars['Float']['output'];
  views: Scalars['Float']['output'];
};

export type TwitterAnalyticsResponse = {
  __typename?: 'TwitterAnalyticsResponse';
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
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  privyId: Scalars['String']['output'];
  tgApiLink?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type UserSettings = {
  __typename?: 'UserSettings';
  buyAmount: Scalars['Float']['output'];
  enableAutoAlpha: Scalars['Boolean']['output'];
  groupCallThreshold: Scalars['Int']['output'];
  selectedChatsIds: Array<Scalars['String']['output']>;
  slippage: Scalars['Float']['output'];
};

export type ChatFieldsFragment = { __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null, callCount: number, lastCallTimestamp?: string | null };

export type GetUserSettingsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSettingsQuery = { __typename?: 'Query', getUserSettings: { __typename?: 'UserSettings', enableAutoAlpha: boolean, selectedChatsIds: Array<string>, groupCallThreshold: number, slippage: number, buyAmount: number } };

export type GetUserSavedChatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSavedChatsQuery = { __typename?: 'Query', getUserSavedChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null, callCount: number, lastCallTimestamp?: string | null }> } };

export type GetTelegramChatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTelegramChatsQuery = { __typename?: 'Query', getTelegramChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null, callCount: number, lastCallTimestamp?: string | null }> } };

export type GetTelegramApiSecretQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTelegramApiSecretQuery = { __typename?: 'Query', getTelegramApiSecret: { __typename?: 'ApiSecretResponse', apiSecret: string } };

export type CheckTelegramApiHealthQueryVariables = Exact<{ [key: string]: never; }>;


export type CheckTelegramApiHealthQuery = { __typename?: 'Query', checkTelegramApiHealth: { __typename?: 'ApiHealthResponse', status: string, error?: string | null } };

export type GetChatPhotoQueryVariables = Exact<{
  chatId: Scalars['String']['input'];
}>;


export type GetChatPhotoQuery = { __typename?: 'Query', getChatPhoto?: string | null };

export type GetTwitterContractAnalyticsQueryVariables = Exact<{
  input: TwitterContractAnalyticsInput;
}>;


export type GetTwitterContractAnalyticsQuery = { __typename?: 'Query', getTwitterContractAnalytics: { __typename?: 'TwitterAnalyticsResponse', summary: string, timeUntilNextGeneration: number, lastGeneratedAt: string, sentiment: { __typename?: 'Sentiment', overall: string, communityMood: string, details: Array<string> }, keyTopics: Array<{ __typename?: 'KeyTopic', topic: string, frequency: number, context: string }>, nextSteps: Array<{ __typename?: 'NextStep', suggestion: string, context: string }>, relevantTweets: Array<{ __typename?: 'Tweet', url: string, text: string, author: string, timestamp: string, engagement: { __typename?: 'TweetEngagement', likes: number, retweets: number, replies: number, views: number } }> } };

export type GetTelegramContractAnalyticsQueryVariables = Exact<{
  input: TelegramContractAnalyticsInput;
}>;


export type GetTelegramContractAnalyticsQuery = { __typename?: 'Query', getTelegramContractAnalytics: { __typename?: 'TelegramAnalyticsResponse', summary: string, timeUntilNextGeneration: number, lastGeneratedAt: string, sentiment: { __typename?: 'Sentiment', overall: string, communityMood: string, details: Array<string> }, keyTopics: Array<{ __typename?: 'KeyTopic', topic: string, frequency: number, context: string }>, nextSteps: Array<{ __typename?: 'NextStep', suggestion: string, context: string }> } };

export type GetCallsByTokenQueryVariables = Exact<{
  input?: InputMaybe<GetCallsInput>;
}>;


export type GetCallsByTokenQuery = { __typename?: 'Query', getCallsByToken: { __typename?: 'TokenCallsResponse', tokenCalls: Array<{ __typename?: 'TokenCalls', chain: string, address: string, calls: Array<{ __typename?: 'CallWithChat', callCount: number, hasInitialAnalysis: boolean, hasFutureAnalysis: boolean, chat: { __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null }, messages?: Array<{ __typename?: 'Message', id: string, createdAt: string, text?: string | null, fromId?: string | null, messageType: MessageType, reason?: string | null, tgMessageId: string }> | null }> }> } };

export type UpdateUserSettingsMutationVariables = Exact<{
  input: UpdateUserSettingsInput;
}>;


export type UpdateUserSettingsMutation = { __typename?: 'Mutation', updateUserSettings: { __typename?: 'UserSettings', enableAutoAlpha: boolean, selectedChatsIds: Array<string>, groupCallThreshold: number, slippage: number, buyAmount: number } };

export type SaveUserChatsMutationVariables = Exact<{
  input: SaveChatsInput;
}>;


export type SaveUserChatsMutation = { __typename?: 'Mutation', saveUserChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null, callCount: number, lastCallTimestamp?: string | null }> } };

export type UpdateTelegramApiLinkMutationVariables = Exact<{
  apiLink: Scalars['String']['input'];
}>;


export type UpdateTelegramApiLinkMutation = { __typename?: 'Mutation', updateTelegramApiLink: boolean };

export type PrivyLoginMutationVariables = Exact<{ [key: string]: never; }>;


export type PrivyLoginMutation = { __typename?: 'Mutation', privyLogin: { __typename?: 'AuthPayload', createdUser: boolean } };

export const ChatFieldsFragmentDoc = /*#__PURE__*/ gql`
    fragment ChatFields on TelegramChat {
  id
  name
  type
  photoUrl
  callCount
  lastCallTimestamp
}
    `;
export const GetUserSettingsDocument = /*#__PURE__*/ gql`
    query GetUserSettings {
  getUserSettings {
    enableAutoAlpha
    selectedChatsIds
    groupCallThreshold
    slippage
    buyAmount
  }
}
    `;

/**
 * __useGetUserSettingsQuery__
 *
 * To run a query within a React component, call `useGetUserSettingsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserSettingsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserSettingsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserSettingsQuery(baseOptions?: Apollo.QueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
      }
export function useGetUserSettingsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
        }
export function useGetUserSettingsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserSettingsQuery, GetUserSettingsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserSettingsQuery, GetUserSettingsQueryVariables>(GetUserSettingsDocument, options);
        }
export type GetUserSettingsQueryHookResult = ReturnType<typeof useGetUserSettingsQuery>;
export type GetUserSettingsLazyQueryHookResult = ReturnType<typeof useGetUserSettingsLazyQuery>;
export type GetUserSettingsSuspenseQueryHookResult = ReturnType<typeof useGetUserSettingsSuspenseQuery>;
export type GetUserSettingsQueryResult = Apollo.QueryResult<GetUserSettingsQuery, GetUserSettingsQueryVariables>;
export function refetchGetUserSettingsQuery(variables?: GetUserSettingsQueryVariables) {
      return { query: GetUserSettingsDocument, variables: variables }
    }
export const GetUserSavedChatsDocument = /*#__PURE__*/ gql`
    query GetUserSavedChats {
  getUserSavedChats {
    chats {
      ...ChatFields
    }
  }
}
    ${ChatFieldsFragmentDoc}`;

/**
 * __useGetUserSavedChatsQuery__
 *
 * To run a query within a React component, call `useGetUserSavedChatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetUserSavedChatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetUserSavedChatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetUserSavedChatsQuery(baseOptions?: Apollo.QueryHookOptions<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>(GetUserSavedChatsDocument, options);
      }
export function useGetUserSavedChatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>(GetUserSavedChatsDocument, options);
        }
export function useGetUserSavedChatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>(GetUserSavedChatsDocument, options);
        }
export type GetUserSavedChatsQueryHookResult = ReturnType<typeof useGetUserSavedChatsQuery>;
export type GetUserSavedChatsLazyQueryHookResult = ReturnType<typeof useGetUserSavedChatsLazyQuery>;
export type GetUserSavedChatsSuspenseQueryHookResult = ReturnType<typeof useGetUserSavedChatsSuspenseQuery>;
export type GetUserSavedChatsQueryResult = Apollo.QueryResult<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>;
export function refetchGetUserSavedChatsQuery(variables?: GetUserSavedChatsQueryVariables) {
      return { query: GetUserSavedChatsDocument, variables: variables }
    }
export const GetTelegramChatsDocument = /*#__PURE__*/ gql`
    query GetTelegramChats {
  getTelegramChats {
    chats {
      ...ChatFields
    }
  }
}
    ${ChatFieldsFragmentDoc}`;

/**
 * __useGetTelegramChatsQuery__
 *
 * To run a query within a React component, call `useGetTelegramChatsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTelegramChatsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTelegramChatsQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetTelegramChatsQuery(baseOptions?: Apollo.QueryHookOptions<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>(GetTelegramChatsDocument, options);
      }
export function useGetTelegramChatsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>(GetTelegramChatsDocument, options);
        }
export function useGetTelegramChatsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>(GetTelegramChatsDocument, options);
        }
export type GetTelegramChatsQueryHookResult = ReturnType<typeof useGetTelegramChatsQuery>;
export type GetTelegramChatsLazyQueryHookResult = ReturnType<typeof useGetTelegramChatsLazyQuery>;
export type GetTelegramChatsSuspenseQueryHookResult = ReturnType<typeof useGetTelegramChatsSuspenseQuery>;
export type GetTelegramChatsQueryResult = Apollo.QueryResult<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>;
export function refetchGetTelegramChatsQuery(variables?: GetTelegramChatsQueryVariables) {
      return { query: GetTelegramChatsDocument, variables: variables }
    }
export const GetTelegramApiSecretDocument = /*#__PURE__*/ gql`
    query GetTelegramApiSecret {
  getTelegramApiSecret {
    apiSecret
  }
}
    `;

/**
 * __useGetTelegramApiSecretQuery__
 *
 * To run a query within a React component, call `useGetTelegramApiSecretQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTelegramApiSecretQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTelegramApiSecretQuery({
 *   variables: {
 *   },
 * });
 */
export function useGetTelegramApiSecretQuery(baseOptions?: Apollo.QueryHookOptions<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>(GetTelegramApiSecretDocument, options);
      }
export function useGetTelegramApiSecretLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>(GetTelegramApiSecretDocument, options);
        }
export function useGetTelegramApiSecretSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>(GetTelegramApiSecretDocument, options);
        }
export type GetTelegramApiSecretQueryHookResult = ReturnType<typeof useGetTelegramApiSecretQuery>;
export type GetTelegramApiSecretLazyQueryHookResult = ReturnType<typeof useGetTelegramApiSecretLazyQuery>;
export type GetTelegramApiSecretSuspenseQueryHookResult = ReturnType<typeof useGetTelegramApiSecretSuspenseQuery>;
export type GetTelegramApiSecretQueryResult = Apollo.QueryResult<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>;
export function refetchGetTelegramApiSecretQuery(variables?: GetTelegramApiSecretQueryVariables) {
      return { query: GetTelegramApiSecretDocument, variables: variables }
    }
export const CheckTelegramApiHealthDocument = /*#__PURE__*/ gql`
    query CheckTelegramApiHealth {
  checkTelegramApiHealth {
    status
    error
  }
}
    `;

/**
 * __useCheckTelegramApiHealthQuery__
 *
 * To run a query within a React component, call `useCheckTelegramApiHealthQuery` and pass it any options that fit your needs.
 * When your component renders, `useCheckTelegramApiHealthQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useCheckTelegramApiHealthQuery({
 *   variables: {
 *   },
 * });
 */
export function useCheckTelegramApiHealthQuery(baseOptions?: Apollo.QueryHookOptions<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>(CheckTelegramApiHealthDocument, options);
      }
export function useCheckTelegramApiHealthLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>(CheckTelegramApiHealthDocument, options);
        }
export function useCheckTelegramApiHealthSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>(CheckTelegramApiHealthDocument, options);
        }
export type CheckTelegramApiHealthQueryHookResult = ReturnType<typeof useCheckTelegramApiHealthQuery>;
export type CheckTelegramApiHealthLazyQueryHookResult = ReturnType<typeof useCheckTelegramApiHealthLazyQuery>;
export type CheckTelegramApiHealthSuspenseQueryHookResult = ReturnType<typeof useCheckTelegramApiHealthSuspenseQuery>;
export type CheckTelegramApiHealthQueryResult = Apollo.QueryResult<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>;
export function refetchCheckTelegramApiHealthQuery(variables?: CheckTelegramApiHealthQueryVariables) {
      return { query: CheckTelegramApiHealthDocument, variables: variables }
    }
export const GetChatPhotoDocument = /*#__PURE__*/ gql`
    query GetChatPhoto($chatId: String!) {
  getChatPhoto(chatId: $chatId)
}
    `;

/**
 * __useGetChatPhotoQuery__
 *
 * To run a query within a React component, call `useGetChatPhotoQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetChatPhotoQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetChatPhotoQuery({
 *   variables: {
 *      chatId: // value for 'chatId'
 *   },
 * });
 */
export function useGetChatPhotoQuery(baseOptions: Apollo.QueryHookOptions<GetChatPhotoQuery, GetChatPhotoQueryVariables> & ({ variables: GetChatPhotoQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetChatPhotoQuery, GetChatPhotoQueryVariables>(GetChatPhotoDocument, options);
      }
export function useGetChatPhotoLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetChatPhotoQuery, GetChatPhotoQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetChatPhotoQuery, GetChatPhotoQueryVariables>(GetChatPhotoDocument, options);
        }
export function useGetChatPhotoSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetChatPhotoQuery, GetChatPhotoQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetChatPhotoQuery, GetChatPhotoQueryVariables>(GetChatPhotoDocument, options);
        }
export type GetChatPhotoQueryHookResult = ReturnType<typeof useGetChatPhotoQuery>;
export type GetChatPhotoLazyQueryHookResult = ReturnType<typeof useGetChatPhotoLazyQuery>;
export type GetChatPhotoSuspenseQueryHookResult = ReturnType<typeof useGetChatPhotoSuspenseQuery>;
export type GetChatPhotoQueryResult = Apollo.QueryResult<GetChatPhotoQuery, GetChatPhotoQueryVariables>;
export function refetchGetChatPhotoQuery(variables: GetChatPhotoQueryVariables) {
      return { query: GetChatPhotoDocument, variables: variables }
    }
export const GetTwitterContractAnalyticsDocument = /*#__PURE__*/ gql`
    query GetTwitterContractAnalytics($input: TwitterContractAnalyticsInput!) {
  getTwitterContractAnalytics(input: $input) {
    summary
    sentiment {
      overall
      communityMood
      details
    }
    keyTopics {
      topic
      frequency
      context
    }
    nextSteps {
      suggestion
      context
    }
    relevantTweets {
      url
      text
      author
      timestamp
      engagement {
        likes
        retweets
        replies
        views
      }
    }
    timeUntilNextGeneration
    lastGeneratedAt
  }
}
    `;

/**
 * __useGetTwitterContractAnalyticsQuery__
 *
 * To run a query within a React component, call `useGetTwitterContractAnalyticsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTwitterContractAnalyticsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTwitterContractAnalyticsQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetTwitterContractAnalyticsQuery(baseOptions: Apollo.QueryHookOptions<GetTwitterContractAnalyticsQuery, GetTwitterContractAnalyticsQueryVariables> & ({ variables: GetTwitterContractAnalyticsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTwitterContractAnalyticsQuery, GetTwitterContractAnalyticsQueryVariables>(GetTwitterContractAnalyticsDocument, options);
      }
export function useGetTwitterContractAnalyticsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTwitterContractAnalyticsQuery, GetTwitterContractAnalyticsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTwitterContractAnalyticsQuery, GetTwitterContractAnalyticsQueryVariables>(GetTwitterContractAnalyticsDocument, options);
        }
export function useGetTwitterContractAnalyticsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTwitterContractAnalyticsQuery, GetTwitterContractAnalyticsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTwitterContractAnalyticsQuery, GetTwitterContractAnalyticsQueryVariables>(GetTwitterContractAnalyticsDocument, options);
        }
export type GetTwitterContractAnalyticsQueryHookResult = ReturnType<typeof useGetTwitterContractAnalyticsQuery>;
export type GetTwitterContractAnalyticsLazyQueryHookResult = ReturnType<typeof useGetTwitterContractAnalyticsLazyQuery>;
export type GetTwitterContractAnalyticsSuspenseQueryHookResult = ReturnType<typeof useGetTwitterContractAnalyticsSuspenseQuery>;
export type GetTwitterContractAnalyticsQueryResult = Apollo.QueryResult<GetTwitterContractAnalyticsQuery, GetTwitterContractAnalyticsQueryVariables>;
export function refetchGetTwitterContractAnalyticsQuery(variables: GetTwitterContractAnalyticsQueryVariables) {
      return { query: GetTwitterContractAnalyticsDocument, variables: variables }
    }
export const GetTelegramContractAnalyticsDocument = /*#__PURE__*/ gql`
    query GetTelegramContractAnalytics($input: TelegramContractAnalyticsInput!) {
  getTelegramContractAnalytics(input: $input) {
    summary
    sentiment {
      overall
      communityMood
      details
    }
    keyTopics {
      topic
      frequency
      context
    }
    nextSteps {
      suggestion
      context
    }
    timeUntilNextGeneration
    lastGeneratedAt
  }
}
    `;

/**
 * __useGetTelegramContractAnalyticsQuery__
 *
 * To run a query within a React component, call `useGetTelegramContractAnalyticsQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetTelegramContractAnalyticsQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetTelegramContractAnalyticsQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetTelegramContractAnalyticsQuery(baseOptions: Apollo.QueryHookOptions<GetTelegramContractAnalyticsQuery, GetTelegramContractAnalyticsQueryVariables> & ({ variables: GetTelegramContractAnalyticsQueryVariables; skip?: boolean; } | { skip: boolean; }) ) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetTelegramContractAnalyticsQuery, GetTelegramContractAnalyticsQueryVariables>(GetTelegramContractAnalyticsDocument, options);
      }
export function useGetTelegramContractAnalyticsLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetTelegramContractAnalyticsQuery, GetTelegramContractAnalyticsQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetTelegramContractAnalyticsQuery, GetTelegramContractAnalyticsQueryVariables>(GetTelegramContractAnalyticsDocument, options);
        }
export function useGetTelegramContractAnalyticsSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetTelegramContractAnalyticsQuery, GetTelegramContractAnalyticsQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetTelegramContractAnalyticsQuery, GetTelegramContractAnalyticsQueryVariables>(GetTelegramContractAnalyticsDocument, options);
        }
export type GetTelegramContractAnalyticsQueryHookResult = ReturnType<typeof useGetTelegramContractAnalyticsQuery>;
export type GetTelegramContractAnalyticsLazyQueryHookResult = ReturnType<typeof useGetTelegramContractAnalyticsLazyQuery>;
export type GetTelegramContractAnalyticsSuspenseQueryHookResult = ReturnType<typeof useGetTelegramContractAnalyticsSuspenseQuery>;
export type GetTelegramContractAnalyticsQueryResult = Apollo.QueryResult<GetTelegramContractAnalyticsQuery, GetTelegramContractAnalyticsQueryVariables>;
export function refetchGetTelegramContractAnalyticsQuery(variables: GetTelegramContractAnalyticsQueryVariables) {
      return { query: GetTelegramContractAnalyticsDocument, variables: variables }
    }
export const GetCallsByTokenDocument = /*#__PURE__*/ gql`
    query GetCallsByToken($input: GetCallsInput) {
  getCallsByToken(input: $input) {
    tokenCalls {
      chain
      address
      calls {
        chat {
          id
          name
          type
          photoUrl
        }
        callCount
        hasInitialAnalysis
        hasFutureAnalysis
        messages {
          id
          createdAt
          text
          fromId
          messageType
          reason
          tgMessageId
        }
      }
    }
  }
}
    `;

/**
 * __useGetCallsByTokenQuery__
 *
 * To run a query within a React component, call `useGetCallsByTokenQuery` and pass it any options that fit your needs.
 * When your component renders, `useGetCallsByTokenQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useGetCallsByTokenQuery({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useGetCallsByTokenQuery(baseOptions?: Apollo.QueryHookOptions<GetCallsByTokenQuery, GetCallsByTokenQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<GetCallsByTokenQuery, GetCallsByTokenQueryVariables>(GetCallsByTokenDocument, options);
      }
export function useGetCallsByTokenLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<GetCallsByTokenQuery, GetCallsByTokenQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<GetCallsByTokenQuery, GetCallsByTokenQueryVariables>(GetCallsByTokenDocument, options);
        }
export function useGetCallsByTokenSuspenseQuery(baseOptions?: Apollo.SkipToken | Apollo.SuspenseQueryHookOptions<GetCallsByTokenQuery, GetCallsByTokenQueryVariables>) {
          const options = baseOptions === Apollo.skipToken ? baseOptions : {...defaultOptions, ...baseOptions}
          return Apollo.useSuspenseQuery<GetCallsByTokenQuery, GetCallsByTokenQueryVariables>(GetCallsByTokenDocument, options);
        }
export type GetCallsByTokenQueryHookResult = ReturnType<typeof useGetCallsByTokenQuery>;
export type GetCallsByTokenLazyQueryHookResult = ReturnType<typeof useGetCallsByTokenLazyQuery>;
export type GetCallsByTokenSuspenseQueryHookResult = ReturnType<typeof useGetCallsByTokenSuspenseQuery>;
export type GetCallsByTokenQueryResult = Apollo.QueryResult<GetCallsByTokenQuery, GetCallsByTokenQueryVariables>;
export function refetchGetCallsByTokenQuery(variables?: GetCallsByTokenQueryVariables) {
      return { query: GetCallsByTokenDocument, variables: variables }
    }
export const UpdateUserSettingsDocument = /*#__PURE__*/ gql`
    mutation UpdateUserSettings($input: UpdateUserSettingsInput!) {
  updateUserSettings(input: $input) {
    enableAutoAlpha
    selectedChatsIds
    groupCallThreshold
    slippage
    buyAmount
  }
}
    `;
export type UpdateUserSettingsMutationFn = Apollo.MutationFunction<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;

/**
 * __useUpdateUserSettingsMutation__
 *
 * To run a mutation, you first call `useUpdateUserSettingsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateUserSettingsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateUserSettingsMutation, { data, loading, error }] = useUpdateUserSettingsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useUpdateUserSettingsMutation(baseOptions?: Apollo.MutationHookOptions<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>(UpdateUserSettingsDocument, options);
      }
export type UpdateUserSettingsMutationHookResult = ReturnType<typeof useUpdateUserSettingsMutation>;
export type UpdateUserSettingsMutationResult = Apollo.MutationResult<UpdateUserSettingsMutation>;
export type UpdateUserSettingsMutationOptions = Apollo.BaseMutationOptions<UpdateUserSettingsMutation, UpdateUserSettingsMutationVariables>;
export const SaveUserChatsDocument = /*#__PURE__*/ gql`
    mutation SaveUserChats($input: SaveChatsInput!) {
  saveUserChats(input: $input) {
    chats {
      ...ChatFields
    }
  }
}
    ${ChatFieldsFragmentDoc}`;
export type SaveUserChatsMutationFn = Apollo.MutationFunction<SaveUserChatsMutation, SaveUserChatsMutationVariables>;

/**
 * __useSaveUserChatsMutation__
 *
 * To run a mutation, you first call `useSaveUserChatsMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useSaveUserChatsMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [saveUserChatsMutation, { data, loading, error }] = useSaveUserChatsMutation({
 *   variables: {
 *      input: // value for 'input'
 *   },
 * });
 */
export function useSaveUserChatsMutation(baseOptions?: Apollo.MutationHookOptions<SaveUserChatsMutation, SaveUserChatsMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<SaveUserChatsMutation, SaveUserChatsMutationVariables>(SaveUserChatsDocument, options);
      }
export type SaveUserChatsMutationHookResult = ReturnType<typeof useSaveUserChatsMutation>;
export type SaveUserChatsMutationResult = Apollo.MutationResult<SaveUserChatsMutation>;
export type SaveUserChatsMutationOptions = Apollo.BaseMutationOptions<SaveUserChatsMutation, SaveUserChatsMutationVariables>;
export const UpdateTelegramApiLinkDocument = /*#__PURE__*/ gql`
    mutation UpdateTelegramApiLink($apiLink: String!) {
  updateTelegramApiLink(apiLink: $apiLink)
}
    `;
export type UpdateTelegramApiLinkMutationFn = Apollo.MutationFunction<UpdateTelegramApiLinkMutation, UpdateTelegramApiLinkMutationVariables>;

/**
 * __useUpdateTelegramApiLinkMutation__
 *
 * To run a mutation, you first call `useUpdateTelegramApiLinkMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useUpdateTelegramApiLinkMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [updateTelegramApiLinkMutation, { data, loading, error }] = useUpdateTelegramApiLinkMutation({
 *   variables: {
 *      apiLink: // value for 'apiLink'
 *   },
 * });
 */
export function useUpdateTelegramApiLinkMutation(baseOptions?: Apollo.MutationHookOptions<UpdateTelegramApiLinkMutation, UpdateTelegramApiLinkMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<UpdateTelegramApiLinkMutation, UpdateTelegramApiLinkMutationVariables>(UpdateTelegramApiLinkDocument, options);
      }
export type UpdateTelegramApiLinkMutationHookResult = ReturnType<typeof useUpdateTelegramApiLinkMutation>;
export type UpdateTelegramApiLinkMutationResult = Apollo.MutationResult<UpdateTelegramApiLinkMutation>;
export type UpdateTelegramApiLinkMutationOptions = Apollo.BaseMutationOptions<UpdateTelegramApiLinkMutation, UpdateTelegramApiLinkMutationVariables>;
export const PrivyLoginDocument = /*#__PURE__*/ gql`
    mutation PrivyLogin {
  privyLogin {
    createdUser
  }
}
    `;
export type PrivyLoginMutationFn = Apollo.MutationFunction<PrivyLoginMutation, PrivyLoginMutationVariables>;

/**
 * __usePrivyLoginMutation__
 *
 * To run a mutation, you first call `usePrivyLoginMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `usePrivyLoginMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [privyLoginMutation, { data, loading, error }] = usePrivyLoginMutation({
 *   variables: {
 *   },
 * });
 */
export function usePrivyLoginMutation(baseOptions?: Apollo.MutationHookOptions<PrivyLoginMutation, PrivyLoginMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<PrivyLoginMutation, PrivyLoginMutationVariables>(PrivyLoginDocument, options);
      }
export type PrivyLoginMutationHookResult = ReturnType<typeof usePrivyLoginMutation>;
export type PrivyLoginMutationResult = Apollo.MutationResult<PrivyLoginMutation>;
export type PrivyLoginMutationOptions = Apollo.BaseMutationOptions<PrivyLoginMutation, PrivyLoginMutationVariables>;