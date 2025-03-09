export interface TwitterMessage {
  id: string;
  text: string;
  timestamp: string;
  author: string;
  metrics: {
    retweets: number;
    likes: number;
    replies: number;
    views: number;
    bookmarks: number;
    quotes: number;
  };
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