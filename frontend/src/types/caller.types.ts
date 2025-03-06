/**
 * Interface representing a caller in the system
 */
export interface Caller {
	id: string;
	name: string;
	profileImageUrl: string;
	address?: string;
	timestamp: number;
	callCount?: number;
	lastCallTimestamp?: number;
	winRate: number;
	message?: string;
}
