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
