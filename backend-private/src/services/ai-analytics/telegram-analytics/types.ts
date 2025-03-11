export interface TelegramMessage {
  id: string;
  text: string;
  timestamp: string;
  sender: string;
  chatId: string;
}

export interface TelegramCall {
  id: string;
  timestamp: string;
  messages: TelegramMessage[];
}

export interface AnalysisResult {
  summary: string;
  sentiment: {
    overall: string;
    communityMood: 'positive' | 'negative' | 'neutral' | 'mixed';
    details: string[];
  };
  keyTopics: {
    topic: string;
    frequency: number;  // 1-100
    context: string;
  }[];
  nextSteps: {
    suggestion: string;
    context: string;
  }[];
}

export interface TokenInfo {
  address: string;
  name: string;
  ticker: string;
  chain: string;
}

export interface MessageInfo {
  id: number;
  text: string;
  fromId: {
    _: string;
    userId: string;
  };
  date: string;
  messageType: string;
}

export interface ContextCall {
  callId: string;
  token: TokenInfo;
  contextType: 'initial' | 'future';
  callMessage: MessageInfo;
  messages: MessageInfo[];
}

export interface AnalyzeContextRequest {
  initial: ContextCall;
  future: ContextCall;
}

export interface AnalyzeContextResponse {
  relatedMessageIds: number[];
  matchReason: {
    messageId: number;
    reason: 'token_address' | 'token_name' | 'token_ticker' | 'call_message_text';
    matchedTerm: string;
  }[];
} 