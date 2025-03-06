import { Caller } from "./caller.types";

export interface TwitterSentiment {
	summary: string;
	sentiment: "positive" | "negative" | "neutral";
	count: number;
	positiveSplit: number;
	negativeSplit: number;
}

export interface TelegramSentiment {
	summary: string;
	sentiment: "positive" | "negative" | "neutral";
	count: number;
	positiveSplit: number;
	negativeSplit: number;
}

export interface Token {
	id: string;
	name: string;
	ticker: string;
	marketCap: number;
	price: number;
	change24h: number;
	imageUrl: string;
	liquidity?: number;
	volume?: number;
	callers?: Caller[];
	createdAt: string;
	twitterSentiment?: TwitterSentiment;
	telegramSentiment?: TelegramSentiment;
}

export type SortField = "rank" | "age" | "name" | "price" | "liquidity" | "marketCap" | "change24h" | "callers" | "volume" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface TokenFeedProps {
	tokens: Token[];
}
