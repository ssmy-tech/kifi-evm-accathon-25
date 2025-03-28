/**
 * Interface representing a message in the system
 */
export interface Message {
	id: string;
	createdAt: string;
	text: string;
	fromId: string | null;
	messageType: string;
	reason: string | null;
	tgMessageId: string;
	mcap?: number;
}

/**
 * Interface representing a chat in the system
 */
export interface Chat {
	id: string;
	name: string;
	type: "Group" | "Channel" | "Private";
	photoUrl: string | "no-photo";
}

/**
 * Interface representing a caller in the system
 */
export interface Caller {
	id: string;
	name: string;
	profileImageUrl: string;
	timestamp: number;
	lastCallTimestamp?: number;
	callCount: number;
	winRate: number;
	chat: Chat;
	messages: Message[];
}
