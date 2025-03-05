// Type Declarations
declare global {
  var codeCallback: ((code: string) => void) | undefined;
}

declare module 'express-serve-static-core' {
  interface Request {
    user?: any;
  }
}

// Types
export namespace Types {
  export interface Config {
    port: string;
    telegramApiId: number;
    telegramApiHash: string;
    telegramPhone: string;
    jwtSecret: string;
  }

  export interface ApiRequest {
    chatId: number | string;
    limit?: number;
    offset?: number;
  }

  export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    retryAfter?: number;  // Number of seconds to wait before retrying when rate limited
  }

  export interface TelegramCredentials {
    apiId: number;
    apiHash: string;
    phoneNumber?: string;
    password?: string;
  }

  export interface TelegramSession {
    sessionString: string;
    phoneNumber: string;
    createdAt: Date;
    lastUsed: Date;
  }

  export interface Chat {
    id: string;
    name: string;
    type: 'user' | 'group' | 'channel';
    unreadCount: number;
    avatar?: string; // Base64 encoded image or null if no avatar
  }

  export interface Message {
    id: number;
    text: string;
    date: string;
    fromId: string;
    replyTo?: number;
  }
} 