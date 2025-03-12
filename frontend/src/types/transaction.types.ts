export interface TokenData {
	name: string;
	ticker: string;
	imageUrl: string;
	decimals: number;
}

export interface Trade {
	__typename?: "Trade";
	entryTxHash?: string | null;
	tokenAddress: string;
	amount: string;
}

export type TransactionType = "BUY" | "SELL";
export type TransactionCondition = "Manual" | "Auto Alpha Buy";
export type TransactionStatus = "completed" | "pending" | "failed";

export interface Transaction {
	txHash: string;
	timestamp: Date;
	type: TransactionType;
	token: string;
	tokenData?: TokenData;
	amount: string;
	formattedAmount?: string;
	condition: TransactionCondition;
	status: TransactionStatus;
	callers?: {
		id: string;
		profileImageUrl: string;
	}[];
}
