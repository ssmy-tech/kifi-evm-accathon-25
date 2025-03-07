/* eslint-disable */
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';
import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
import { useQuery, useMutation, UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
export type MakeEmpty<T extends { [key: string]: unknown }, K extends keyof T> = { [_ in K]?: never };
export type Incremental<T> = T | { [P in keyof T]?: P extends ' $fragmentName' | '__typename' ? T[P] : never };
const defaultOptions = {} as const;

function fetcher<TData, TVariables>(endpoint: string, requestInit: RequestInit, query: string, variables?: TVariables) {
  return async (): Promise<TData> => {
    const res = await fetch(endpoint, {
      method: 'POST',
      ...requestInit,
      body: JSON.stringify({ query, variables }),
    });

    const json = await res.json();

    if (json.errors) {
      const { message } = json.errors[0];

      throw new Error(message);
    }

    return json.data;
  }
}
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

export type ChatsResponse = {
  __typename?: 'ChatsResponse';
  chats: Array<TelegramChat>;
};

export type Mutation = {
  __typename?: 'Mutation';
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
  __typename?: 'Query';
  checkTelegramApiHealth: ApiHealthResponse;
  getChatPhoto?: Maybe<Scalars['String']['output']>;
  getTelegramApiSecret: ApiSecretResponse;
  getTelegramChats: ChatsResponse;
  getUserSavedChats: ChatsResponse;
  user?: Maybe<User>;
  users: Array<User>;
  whoAmI: Scalars['String']['output'];
};


export type QueryGetChatPhotoArgs = {
  chatId: Scalars['String']['input'];
};


export type QueryUserArgs = {
  privyId: Scalars['String']['input'];
};

export type SaveChatsInput = {
  chatIds: Array<Scalars['String']['input']>;
};

export type TelegramChat = {
  __typename?: 'TelegramChat';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  photoUrl?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  name?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type GetUserSavedChatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSavedChatsQuery = { __typename?: 'Query', getUserSavedChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null }> } };

export type GetTelegramChatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTelegramChatsQuery = { __typename?: 'Query', getTelegramChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null }> } };

export type GetTelegramApiSecretQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTelegramApiSecretQuery = { __typename?: 'Query', getTelegramApiSecret: { __typename?: 'ApiSecretResponse', apiSecret: string } };

export type CheckTelegramApiHealthQueryVariables = Exact<{ [key: string]: never; }>;


export type CheckTelegramApiHealthQuery = { __typename?: 'Query', checkTelegramApiHealth: { __typename?: 'ApiHealthResponse', status: string, error?: string | null } };

export type GetChatPhotoQueryVariables = Exact<{
  chatId: Scalars['String']['input'];
}>;


export type GetChatPhotoQuery = { __typename?: 'Query', getChatPhoto?: string | null };

export type SaveUserChatsMutationVariables = Exact<{
  input: SaveChatsInput;
}>;


export type SaveUserChatsMutation = { __typename?: 'Mutation', saveUserChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null }> } };

export type UpdateTelegramApiLinkMutationVariables = Exact<{
  apiLink: Scalars['String']['input'];
}>;


export type UpdateTelegramApiLinkMutation = { __typename?: 'Mutation', updateTelegramApiLink: boolean };

export type PrivyLoginMutationVariables = Exact<{ [key: string]: never; }>;


export type PrivyLoginMutation = { __typename?: 'Mutation', privyLogin: { __typename?: 'AuthPayload', createdUser: boolean } };


export const GetUserSavedChatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetUserSavedChats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getUserSavedChats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"photoUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>;
export const GetTelegramChatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTelegramChats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getTelegramChats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"photoUrl"}}]}}]}}]}}]} as unknown as DocumentNode<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>;
export const GetTelegramApiSecretDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetTelegramApiSecret"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getTelegramApiSecret"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"apiSecret"}}]}}]}}]} as unknown as DocumentNode<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>;
export const CheckTelegramApiHealthDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"CheckTelegramApiHealth"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"checkTelegramApiHealth"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"status"}},{"kind":"Field","name":{"kind":"Name","value":"error"}}]}}]}}]} as unknown as DocumentNode<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>;
export const GetChatPhotoDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"query","name":{"kind":"Name","value":"GetChatPhoto"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"getChatPhoto"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"chatId"},"value":{"kind":"Variable","name":{"kind":"Name","value":"chatId"}}}]}]}}]} as unknown as DocumentNode<GetChatPhotoQuery, GetChatPhotoQueryVariables>;
export const SaveUserChatsDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"SaveUserChats"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"input"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"SaveChatsInput"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"saveUserChats"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"input"},"value":{"kind":"Variable","name":{"kind":"Name","value":"input"}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"chats"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"id"}},{"kind":"Field","name":{"kind":"Name","value":"name"}},{"kind":"Field","name":{"kind":"Name","value":"type"}},{"kind":"Field","name":{"kind":"Name","value":"photoUrl"}}]}}]}}]}}]} as unknown as DocumentNode<SaveUserChatsMutation, SaveUserChatsMutationVariables>;
export const UpdateTelegramApiLinkDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"UpdateTelegramApiLink"},"variableDefinitions":[{"kind":"VariableDefinition","variable":{"kind":"Variable","name":{"kind":"Name","value":"apiLink"}},"type":{"kind":"NonNullType","type":{"kind":"NamedType","name":{"kind":"Name","value":"String"}}}}],"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"updateTelegramApiLink"},"arguments":[{"kind":"Argument","name":{"kind":"Name","value":"apiLink"},"value":{"kind":"Variable","name":{"kind":"Name","value":"apiLink"}}}]}]}}]} as unknown as DocumentNode<UpdateTelegramApiLinkMutation, UpdateTelegramApiLinkMutationVariables>;
export const PrivyLoginDocument = {"kind":"Document","definitions":[{"kind":"OperationDefinition","operation":"mutation","name":{"kind":"Name","value":"PrivyLogin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"privyLogin"},"selectionSet":{"kind":"SelectionSet","selections":[{"kind":"Field","name":{"kind":"Name","value":"createdUser"}}]}}]}}]} as unknown as DocumentNode<PrivyLoginMutation, PrivyLoginMutationVariables>;
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

export type ChatsResponse = {
  __typename?: 'ChatsResponse';
  chats: Array<TelegramChat>;
};

export type Mutation = {
  __typename?: 'Mutation';
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
  __typename?: 'Query';
  checkTelegramApiHealth: ApiHealthResponse;
  getChatPhoto?: Maybe<Scalars['String']['output']>;
  getTelegramApiSecret: ApiSecretResponse;
  getTelegramChats: ChatsResponse;
  getUserSavedChats: ChatsResponse;
  user?: Maybe<User>;
  users: Array<User>;
  whoAmI: Scalars['String']['output'];
};


export type QueryGetChatPhotoArgs = {
  chatId: Scalars['String']['input'];
};


export type QueryUserArgs = {
  privyId: Scalars['String']['input'];
};

export type SaveChatsInput = {
  chatIds: Array<Scalars['String']['input']>;
};

export type TelegramChat = {
  __typename?: 'TelegramChat';
  id: Scalars['String']['output'];
  name: Scalars['String']['output'];
  photoUrl?: Maybe<Scalars['String']['output']>;
  type: Scalars['String']['output'];
};

export type User = {
  __typename?: 'User';
  createdAt: Scalars['DateTime']['output'];
  email: Scalars['String']['output'];
  id: Scalars['Int']['output'];
  name?: Maybe<Scalars['String']['output']>;
  updatedAt: Scalars['DateTime']['output'];
};

export type GetUserSavedChatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetUserSavedChatsQuery = { __typename?: 'Query', getUserSavedChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null }> } };

export type GetTelegramChatsQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTelegramChatsQuery = { __typename?: 'Query', getTelegramChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null }> } };

export type GetTelegramApiSecretQueryVariables = Exact<{ [key: string]: never; }>;


export type GetTelegramApiSecretQuery = { __typename?: 'Query', getTelegramApiSecret: { __typename?: 'ApiSecretResponse', apiSecret: string } };

export type CheckTelegramApiHealthQueryVariables = Exact<{ [key: string]: never; }>;


export type CheckTelegramApiHealthQuery = { __typename?: 'Query', checkTelegramApiHealth: { __typename?: 'ApiHealthResponse', status: string, error?: string | null } };

export type GetChatPhotoQueryVariables = Exact<{
  chatId: Scalars['String']['input'];
}>;


export type GetChatPhotoQuery = { __typename?: 'Query', getChatPhoto?: string | null };

export type SaveUserChatsMutationVariables = Exact<{
  input: SaveChatsInput;
}>;


export type SaveUserChatsMutation = { __typename?: 'Mutation', saveUserChats: { __typename?: 'ChatsResponse', chats: Array<{ __typename?: 'TelegramChat', id: string, name: string, type: string, photoUrl?: string | null }> } };

export type UpdateTelegramApiLinkMutationVariables = Exact<{
  apiLink: Scalars['String']['input'];
}>;


export type UpdateTelegramApiLinkMutation = { __typename?: 'Mutation', updateTelegramApiLink: boolean };

export type PrivyLoginMutationVariables = Exact<{ [key: string]: never; }>;


export type PrivyLoginMutation = { __typename?: 'Mutation', privyLogin: { __typename?: 'AuthPayload', createdUser: boolean } };


export const GetUserSavedChatsDocument = gql`
    query GetUserSavedChats {
  getUserSavedChats {
    chats {
      id
      name
      type
      photoUrl
    }
  }
}
    `;

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
export const GetTelegramChatsDocument = gql`
    query GetTelegramChats {
  getTelegramChats {
    chats {
      id
      name
      type
      photoUrl
    }
  }
}
    `;

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
export const GetTelegramApiSecretDocument = gql`
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
export const CheckTelegramApiHealthDocument = gql`
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
export const GetChatPhotoDocument = gql`
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
export const SaveUserChatsDocument = gql`
    mutation SaveUserChats($input: SaveChatsInput!) {
  saveUserChats(input: $input) {
    chats {
      id
      name
      type
      photoUrl
    }
  }
}
    `;
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
export const UpdateTelegramApiLinkDocument = gql`
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
export const PrivyLoginDocument = gql`
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


export const GetUserSavedChatsDocument = `
    query GetUserSavedChats {
  getUserSavedChats {
    chats {
      id
      name
      type
      photoUrl
    }
  }
}
    `;

export const useGetUserSavedChatsQuery = <
      TData = GetUserSavedChatsQuery,
      TError = unknown
    >(
      dataSource: { endpoint: string, fetchParams?: RequestInit },
      variables?: GetUserSavedChatsQueryVariables,
      options?: UseQueryOptions<GetUserSavedChatsQuery, TError, TData>
    ) => {
    
    return useQuery<GetUserSavedChatsQuery, TError, TData>(
      variables === undefined ? ['GetUserSavedChats'] : ['GetUserSavedChats', variables],
      fetcher<GetUserSavedChatsQuery, GetUserSavedChatsQueryVariables>(dataSource.endpoint, dataSource.fetchParams || {}, GetUserSavedChatsDocument, variables),
      options
    )};

export const GetTelegramChatsDocument = `
    query GetTelegramChats {
  getTelegramChats {
    chats {
      id
      name
      type
      photoUrl
    }
  }
}
    `;

export const useGetTelegramChatsQuery = <
      TData = GetTelegramChatsQuery,
      TError = unknown
    >(
      dataSource: { endpoint: string, fetchParams?: RequestInit },
      variables?: GetTelegramChatsQueryVariables,
      options?: UseQueryOptions<GetTelegramChatsQuery, TError, TData>
    ) => {
    
    return useQuery<GetTelegramChatsQuery, TError, TData>(
      variables === undefined ? ['GetTelegramChats'] : ['GetTelegramChats', variables],
      fetcher<GetTelegramChatsQuery, GetTelegramChatsQueryVariables>(dataSource.endpoint, dataSource.fetchParams || {}, GetTelegramChatsDocument, variables),
      options
    )};

export const GetTelegramApiSecretDocument = `
    query GetTelegramApiSecret {
  getTelegramApiSecret {
    apiSecret
  }
}
    `;

export const useGetTelegramApiSecretQuery = <
      TData = GetTelegramApiSecretQuery,
      TError = unknown
    >(
      dataSource: { endpoint: string, fetchParams?: RequestInit },
      variables?: GetTelegramApiSecretQueryVariables,
      options?: UseQueryOptions<GetTelegramApiSecretQuery, TError, TData>
    ) => {
    
    return useQuery<GetTelegramApiSecretQuery, TError, TData>(
      variables === undefined ? ['GetTelegramApiSecret'] : ['GetTelegramApiSecret', variables],
      fetcher<GetTelegramApiSecretQuery, GetTelegramApiSecretQueryVariables>(dataSource.endpoint, dataSource.fetchParams || {}, GetTelegramApiSecretDocument, variables),
      options
    )};

export const CheckTelegramApiHealthDocument = `
    query CheckTelegramApiHealth {
  checkTelegramApiHealth {
    status
    error
  }
}
    `;

export const useCheckTelegramApiHealthQuery = <
      TData = CheckTelegramApiHealthQuery,
      TError = unknown
    >(
      dataSource: { endpoint: string, fetchParams?: RequestInit },
      variables?: CheckTelegramApiHealthQueryVariables,
      options?: UseQueryOptions<CheckTelegramApiHealthQuery, TError, TData>
    ) => {
    
    return useQuery<CheckTelegramApiHealthQuery, TError, TData>(
      variables === undefined ? ['CheckTelegramApiHealth'] : ['CheckTelegramApiHealth', variables],
      fetcher<CheckTelegramApiHealthQuery, CheckTelegramApiHealthQueryVariables>(dataSource.endpoint, dataSource.fetchParams || {}, CheckTelegramApiHealthDocument, variables),
      options
    )};

export const GetChatPhotoDocument = `
    query GetChatPhoto($chatId: String!) {
  getChatPhoto(chatId: $chatId)
}
    `;

export const useGetChatPhotoQuery = <
      TData = GetChatPhotoQuery,
      TError = unknown
    >(
      dataSource: { endpoint: string, fetchParams?: RequestInit },
      variables: GetChatPhotoQueryVariables,
      options?: UseQueryOptions<GetChatPhotoQuery, TError, TData>
    ) => {
    
    return useQuery<GetChatPhotoQuery, TError, TData>(
      ['GetChatPhoto', variables],
      fetcher<GetChatPhotoQuery, GetChatPhotoQueryVariables>(dataSource.endpoint, dataSource.fetchParams || {}, GetChatPhotoDocument, variables),
      options
    )};

export const SaveUserChatsDocument = `
    mutation SaveUserChats($input: SaveChatsInput!) {
  saveUserChats(input: $input) {
    chats {
      id
      name
      type
      photoUrl
    }
  }
}
    `;

export const useSaveUserChatsMutation = <
      TError = unknown,
      TContext = unknown
    >(
      dataSource: { endpoint: string, fetchParams?: RequestInit },
      options?: UseMutationOptions<SaveUserChatsMutation, TError, SaveUserChatsMutationVariables, TContext>
    ) => {
    
    return useMutation<SaveUserChatsMutation, TError, SaveUserChatsMutationVariables, TContext>(
      ['SaveUserChats'],
      (variables?: SaveUserChatsMutationVariables) => fetcher<SaveUserChatsMutation, SaveUserChatsMutationVariables>(dataSource.endpoint, dataSource.fetchParams || {}, SaveUserChatsDocument, variables)(),
      options
    )};

export const UpdateTelegramApiLinkDocument = `
    mutation UpdateTelegramApiLink($apiLink: String!) {
  updateTelegramApiLink(apiLink: $apiLink)
}
    `;

export const useUpdateTelegramApiLinkMutation = <
      TError = unknown,
      TContext = unknown
    >(
      dataSource: { endpoint: string, fetchParams?: RequestInit },
      options?: UseMutationOptions<UpdateTelegramApiLinkMutation, TError, UpdateTelegramApiLinkMutationVariables, TContext>
    ) => {
    
    return useMutation<UpdateTelegramApiLinkMutation, TError, UpdateTelegramApiLinkMutationVariables, TContext>(
      ['UpdateTelegramApiLink'],
      (variables?: UpdateTelegramApiLinkMutationVariables) => fetcher<UpdateTelegramApiLinkMutation, UpdateTelegramApiLinkMutationVariables>(dataSource.endpoint, dataSource.fetchParams || {}, UpdateTelegramApiLinkDocument, variables)(),
      options
    )};

export const PrivyLoginDocument = `
    mutation PrivyLogin {
  privyLogin {
    createdUser
  }
}
    `;

export const usePrivyLoginMutation = <
      TError = unknown,
      TContext = unknown
    >(
      dataSource: { endpoint: string, fetchParams?: RequestInit },
      options?: UseMutationOptions<PrivyLoginMutation, TError, PrivyLoginMutationVariables, TContext>
    ) => {
    
    return useMutation<PrivyLoginMutation, TError, PrivyLoginMutationVariables, TContext>(
      ['PrivyLogin'],
      (variables?: PrivyLoginMutationVariables) => fetcher<PrivyLoginMutation, PrivyLoginMutationVariables>(dataSource.endpoint, dataSource.fetchParams || {}, PrivyLoginDocument, variables)(),
      options
    )};
