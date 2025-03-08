export interface TelegramChat {
  tgChatId: string;
  tgChatName?: string;
  tgChatImageUrl?: string;
  tgChatType: 'Channel' | 'Group' | 'User';
}

export interface TelegramMessage {
  id: number;
  text?: string;
  date: string;
  fromId?: string | null;
  views?: number;
  editDate?: string;
  chatId: string;
}

export interface TelegramApiResponse<T> {
  success: boolean;
  data: T[];
}

export interface ChatProcessingState {
  lastProcessedMessageId: string;
  lastProcessedTimestamp: Date;
} 