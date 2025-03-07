import { Caller } from "./caller.types";

export interface Transaction {
	txHash: string;
	timestamp: Date;
	amount: string;
	token: string;
	status: "pending" | "completed" | "failed";
	condition: "Manual" | "Auto Alpha Buy";
	type: "Buy" | "Sell";
	callers?: Caller[];
}
