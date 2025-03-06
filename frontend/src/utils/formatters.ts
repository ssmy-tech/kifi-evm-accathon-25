/**
 * Utility functions for formatting values in the application
 */

/**
 * Formats a number as currency with appropriate suffix (K, M, B)
 * @param value - The number to format
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted currency string
 */
export const formatCurrency = (value: number, decimals: number = 2): string => {
	if (!value && value !== 0) return "-";

	if (value >= 1_000_000_000) {
		return `$${(value / 1_000_000_000).toFixed(decimals)}B`;
	} else if (value >= 1_000_000) {
		return `$${(value / 1_000_000).toFixed(decimals)}M`;
	} else if (value >= 1_000) {
		return `$${(value / 1_000).toFixed(decimals)}K`;
	}

	return `$${value.toFixed(decimals)}`;
};

/**
 * Formats a number as a percentage
 * @param value - The number to format (e.g., 0.05 for 5%)
 * @param decimals - Number of decimal places (default: 2)
 * @returns Formatted percentage string
 */
export const formatPercentage = (value: number, decimals: number = 2): string => {
	if (!value && value !== 0) return "-";

	return `${value.toFixed(decimals)}%`;
};

/**
 * Abbreviates the age of a token based on the date it was created
 * @param createdAt - The date the token was created
 * @returns Abbreviated age string (e.g., "1y" for 1 year)
 */
export const abbreviateAge = (createdAt: string): string => {
	const now = new Date();
	const created = new Date(createdAt);
	const diffYears = now.getFullYear() - created.getFullYear();

	if (diffYears > 0) {
		return `${diffYears}y`;
	}

	const diffMonths = now.getMonth() - created.getMonth() + 12 * (now.getFullYear() - created.getFullYear());
	if (diffMonths > 0) {
		return `${diffMonths}m`;
	}

	const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
	if (diffDays > 0) {
		return `${diffDays}d`;
	}

	const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
	if (diffHours > 0) {
		return `${diffHours}h`;
	}

	const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
	if (diffMinutes > 0) {
		return `${diffMinutes}m`;
	}

	return `${Math.floor((now.getTime() - created.getTime()) / 1000)}s`;
};

/**
 * Formats an Ethereum address for display by shortening it
 */
export function formatAddress(address: string): string {
	if (!address) return "";
	return `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
}

/**
 * Formats a timestamp into a human-readable date/time
 * @param timestamp - The timestamp to format
 * @param compact - Whether to use compact format (relative time) or not
 * @param alwaysAbsolute - Force absolute date format (mm/dd/yy hh:mm:ss) regardless of compact setting
 * @returns Formatted timestamp string
 */
export function formatTimestamp(timestamp: string | number | Date, compact = false, alwaysAbsolute = false): string {
	const date = new Date(timestamp);

	// If alwaysAbsolute is true, we always use the full date format
	if (alwaysAbsolute) {
		return formatAbsoluteTimestamp(date);
	}

	if (compact) {
		// For compact display, use a shorter format
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 60) {
			return `${diffMins}m ago`;
		}

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours < 24) {
			return `${diffHours}h ago`;
		}

		const diffDays = Math.floor(diffHours / 24);
		if (diffDays < 7) {
			return `${diffDays}d ago`;
		}

		// For older dates, show mm/dd/yy format
		return date.toLocaleDateString("en-US", {
			month: "2-digit",
			day: "2-digit",
			year: "2-digit",
		});
	}

	return formatAbsoluteTimestamp(date);
}

/**
 * Helper function to format a date in mm/dd/yy hh:mm:ss format
 */
function formatAbsoluteTimestamp(date: Date): string {
	const dateStr = date.toLocaleDateString("en-US", {
		month: "2-digit",
		day: "2-digit",
		year: "2-digit",
	});

	const timeStr = date.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		second: "2-digit",
		hour12: false,
	});

	return `${dateStr} ${timeStr}`;
}
