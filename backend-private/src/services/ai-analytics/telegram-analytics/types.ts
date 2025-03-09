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