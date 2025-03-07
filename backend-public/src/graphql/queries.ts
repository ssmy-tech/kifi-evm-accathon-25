import { gql } from '@apollo/client';

export const GET_USER_SAVED_CHATS = gql`
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

export const GET_TELEGRAM_CHATS = gql`
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

export const SAVE_USER_CHATS = gql`
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