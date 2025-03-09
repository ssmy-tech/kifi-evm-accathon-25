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

export const GET_TWITTER_CONTRACT_ANALYTICS = gql`
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

export const GET_TELEGRAM_CONTRACT_ANALYTICS = gql`
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

export const GET_CALLS_BY_TOKEN = gql`
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
          messages {
            id
            createdAt
            text
            fromId
          }
        }
      }
    }
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