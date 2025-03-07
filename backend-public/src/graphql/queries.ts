import { gql } from '@apollo/client';

// Fragments
export const CHAT_FIELDS = gql`
  fragment ChatFields on TelegramChat {
    id
    name
    type
    photoUrl
  }
`;

// Queries
export const GET_USER_SAVED_CHATS = gql`
  query GetUserSavedChats {
    getUserSavedChats {
      chats {
        ...ChatFields
      }
    }
  }
  ${CHAT_FIELDS}
`;

export const GET_TELEGRAM_CHATS = gql`
  query GetTelegramChats {
    getTelegramChats {
      chats {
        ...ChatFields
      }
    }
  }
  ${CHAT_FIELDS}
`;

export const GET_TELEGRAM_API_SECRET = gql`
  query GetTelegramApiSecret {
    getTelegramApiSecret {
      apiSecret
    }
  }
`;

export const CHECK_TELEGRAM_API_HEALTH = gql`
  query CheckTelegramApiHealth {
    checkTelegramApiHealth {
      status
      error
    }
  }
`;

export const GET_CHAT_PHOTO = gql`
  query GetChatPhoto($chatId: String!) {
    getChatPhoto(chatId: $chatId)
  }
`;

// Mutations
export const SAVE_USER_CHATS = gql`
  mutation SaveUserChats($input: SaveChatsInput!) {
    saveUserChats(input: $input) {
      chats {
        ...ChatFields
      }
    }
  }
  ${CHAT_FIELDS}
`;

export const UPDATE_TELEGRAM_API_LINK = gql`
  mutation UpdateTelegramApiLink($apiLink: String!) {
    updateTelegramApiLink(apiLink: $apiLink)
  }
`;

export const PRIVY_LOGIN = gql`
  mutation PrivyLogin {
    privyLogin {
      createdUser
    }
  }
`; 