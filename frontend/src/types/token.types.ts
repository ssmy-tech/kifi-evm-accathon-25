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
	callers?: {
		id: string;
		profileImageUrl: string;
	}[];
	createdAt: string;
}

export type SortField = "rank" | "age" | "name" | "price" | "liquidity" | "marketCap" | "change24h" | "callers" | "volume" | "createdAt";
export type SortDirection = "asc" | "desc";

export interface TokenFeedProps {
	tokens: Token[];
}
