import { Caller } from "./caller.types";
import { GetCallsByTokenQuery } from "@/generated/graphql";

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
	liquidity: number;
	volume: number;
	callers: Array<{
		id: string;
		name: string;
		profileImageUrl: string;
		timestamp: number;
		lastCallTimestamp?: number;
		callCount: number;
		winRate: number;
		message?: string;
	}>;
	createdAt: string;
	twitterSentiment: TwitterSentiment;
	telegramSentiment: TelegramSentiment;
}

export type SortField = "rank" | "age" | "name" | "price" | "liquidity" | "marketCap" | "change24h" | "callers" | "volume" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface TokenFeedProps {
	tokens: Token[];
}

export interface DexScreenerToken {
	chainId: string;
	dexId: string;
	url: string;
	pairAddress: string;
	baseToken: {
		address: string;
		name: string;
		symbol: string;
	};
	quoteToken: {
		address: string;
		name: string;
		symbol: string;
	};
	priceNative: string;
	priceUsd: string;
	txns: {
		m5: { buys: number; sells: number };
		h1: { buys: number; sells: number };
		h6: { buys: number; sells: number };
		h24: { buys: number; sells: number };
	};
	volume: {
		h24: number;
		h6: number;
		h1: number;
		m5: number;
	};
	priceChange: {
		m5: number;
		h1: number;
		h6: number;
		h24: number;
	};
	liquidity?: {
		usd: number;
		base: number;
		quote: number;
	};
	fdv: number;
	marketCap: number;
	pairCreatedAt: number;
	info?: {
		imageUrl?: string;
		header?: string;
		openGraph?: string;
		websites?: Array<{
			label: string;
			url: string;
		}>;
		socials?: Array<{
			label: string;
			url: string;
		}>;
	};
}

export interface DexScreenerResponse {
	pairs: DexScreenerToken[];
}

export interface TokenWithDexInfo extends Token {
	tokenCallsData?: GetCallsByTokenQuery["getCallsByToken"]["tokenCalls"][0];
	dexData?: DexScreenerToken;
}
