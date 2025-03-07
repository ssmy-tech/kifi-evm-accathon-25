/* eslint-disable */
import * as types from './graphql';
import { TypedDocumentNode as DocumentNode } from '@graphql-typed-document-node/core';

/**
 * Map of all GraphQL operations in the project.
 *
 * This map has several performance disadvantages:
 * 1. It is not tree-shakeable, so it will include all operations in the project.
 * 2. It is not minifiable, so the string of a GraphQL query will be multiple times inside the bundle.
 * 3. It does not support dead code elimination, so it will add unused operations.
 *
 * Therefore it is highly recommended to use the babel or swc plugin for production.
 * Learn more about it here: https://the-guild.dev/graphql/codegen/plugins/presets/preset-client#reducing-bundle-size
 */
type Documents = {
    "\n  query GetUserSavedChats {\n    getUserSavedChats {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n": typeof types.GetUserSavedChatsDocument,
    "\n  query GetTelegramChats {\n    getTelegramChats {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n": typeof types.GetTelegramChatsDocument,
    "\n  query GetTelegramApiSecret {\n    getTelegramApiSecret {\n      apiSecret\n    }\n  }\n": typeof types.GetTelegramApiSecretDocument,
    "\n  query CheckTelegramApiHealth {\n    checkTelegramApiHealth {\n      status\n      error\n    }\n  }\n": typeof types.CheckTelegramApiHealthDocument,
    "\n  query GetChatPhoto($chatId: String!) {\n    getChatPhoto(chatId: $chatId)\n  }\n": typeof types.GetChatPhotoDocument,
    "\n  mutation SaveUserChats($input: SaveChatsInput!) {\n    saveUserChats(input: $input) {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n": typeof types.SaveUserChatsDocument,
    "\n  mutation UpdateTelegramApiLink($apiLink: String!) {\n    updateTelegramApiLink(apiLink: $apiLink)\n  }\n": typeof types.UpdateTelegramApiLinkDocument,
    "\n  mutation PrivyLogin {\n    privyLogin {\n      createdUser\n    }\n  }\n": typeof types.PrivyLoginDocument,
};
const documents: Documents = {
    "\n  query GetUserSavedChats {\n    getUserSavedChats {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n": types.GetUserSavedChatsDocument,
    "\n  query GetTelegramChats {\n    getTelegramChats {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n": types.GetTelegramChatsDocument,
    "\n  query GetTelegramApiSecret {\n    getTelegramApiSecret {\n      apiSecret\n    }\n  }\n": types.GetTelegramApiSecretDocument,
    "\n  query CheckTelegramApiHealth {\n    checkTelegramApiHealth {\n      status\n      error\n    }\n  }\n": types.CheckTelegramApiHealthDocument,
    "\n  query GetChatPhoto($chatId: String!) {\n    getChatPhoto(chatId: $chatId)\n  }\n": types.GetChatPhotoDocument,
    "\n  mutation SaveUserChats($input: SaveChatsInput!) {\n    saveUserChats(input: $input) {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n": types.SaveUserChatsDocument,
    "\n  mutation UpdateTelegramApiLink($apiLink: String!) {\n    updateTelegramApiLink(apiLink: $apiLink)\n  }\n": types.UpdateTelegramApiLinkDocument,
    "\n  mutation PrivyLogin {\n    privyLogin {\n      createdUser\n    }\n  }\n": types.PrivyLoginDocument,
};

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 *
 *
 * @example
 * ```ts
 * const query = gql(`query GetUser($id: ID!) { user(id: $id) { name } }`);
 * ```
 *
 * The query argument is unknown!
 * Please regenerate the types.
 */
export function gql(source: string): unknown;

/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetUserSavedChats {\n    getUserSavedChats {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetUserSavedChats {\n    getUserSavedChats {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetTelegramChats {\n    getTelegramChats {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  query GetTelegramChats {\n    getTelegramChats {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetTelegramApiSecret {\n    getTelegramApiSecret {\n      apiSecret\n    }\n  }\n"): (typeof documents)["\n  query GetTelegramApiSecret {\n    getTelegramApiSecret {\n      apiSecret\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query CheckTelegramApiHealth {\n    checkTelegramApiHealth {\n      status\n      error\n    }\n  }\n"): (typeof documents)["\n  query CheckTelegramApiHealth {\n    checkTelegramApiHealth {\n      status\n      error\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  query GetChatPhoto($chatId: String!) {\n    getChatPhoto(chatId: $chatId)\n  }\n"): (typeof documents)["\n  query GetChatPhoto($chatId: String!) {\n    getChatPhoto(chatId: $chatId)\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation SaveUserChats($input: SaveChatsInput!) {\n    saveUserChats(input: $input) {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n"): (typeof documents)["\n  mutation SaveUserChats($input: SaveChatsInput!) {\n    saveUserChats(input: $input) {\n      chats {\n        id\n        name\n        type\n        photoUrl\n      }\n    }\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation UpdateTelegramApiLink($apiLink: String!) {\n    updateTelegramApiLink(apiLink: $apiLink)\n  }\n"): (typeof documents)["\n  mutation UpdateTelegramApiLink($apiLink: String!) {\n    updateTelegramApiLink(apiLink: $apiLink)\n  }\n"];
/**
 * The gql function is used to parse GraphQL queries into a document that can be used by GraphQL clients.
 */
export function gql(source: "\n  mutation PrivyLogin {\n    privyLogin {\n      createdUser\n    }\n  }\n"): (typeof documents)["\n  mutation PrivyLogin {\n    privyLogin {\n      createdUser\n    }\n  }\n"];

export function gql(source: string) {
  return (documents as any)[source] ?? {};
}

export type DocumentType<TDocumentNode extends DocumentNode<any, any>> = TDocumentNode extends DocumentNode<  infer TType,  any>  ? TType  : never;