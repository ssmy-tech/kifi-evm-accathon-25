/**
 * Utility functions for managing photo URLs in localStorage
 */

// Private constant - not exported
const STORAGE_KEY = "global-chat-photos-cache";

interface GlobalPhotoCache {
	[chatId: string]: {
		url: string;
		timestamp: number;
	};
}

function migrateOldCache(): void {
	try {
		const cache = localStorage.getItem(STORAGE_KEY);
		if (!cache) return;

		const photos = JSON.parse(cache);
		let hasChanges = false;

		// Check if any entries are in the old format (direct string instead of object)
		Object.entries(photos).forEach(([chatId, data]) => {
			if (typeof data === "string") {
				photos[chatId] = {
					url: data,
					timestamp: Date.now(),
				};
				hasChanges = true;
			}
		});

		if (hasChanges) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
			console.log("Migrated old cache format to new format");
		}
	} catch (error) {
		console.error("Error migrating old cache format:", error);
	}
}

/**
 * Save a photo URL to localStorage
 */
export function savePhoto(chatId: string, photoUrl: string): void {
	try {
		const cache = localStorage.getItem(STORAGE_KEY);
		const photos: GlobalPhotoCache = cache ? JSON.parse(cache) : {};
		photos[chatId] = {
			url: photoUrl,
			timestamp: Date.now(),
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
	} catch (error) {
		console.error("Error saving to photos cache:", error);
	}
}

/**
 * Get a photo URL from localStorage
 */
export function getPhoto(chatId: string): string | null {
	try {
		migrateOldCache(); // Ensure cache is in correct format
		const cache = localStorage.getItem(STORAGE_KEY);
		const photos: GlobalPhotoCache = cache ? JSON.parse(cache) : {};
		const photo = photos[chatId];

		// Handle both old and new format
		if (typeof photo === "string") {
			return photo;
		}
		return photo?.url || null;
	} catch (error) {
		console.error("Error reading from photos cache:", error);
		return null;
	}
}

/**
 * Clean up old photo entries (older than maxAge in milliseconds)
 */
export function cleanupPhotos(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
	try {
		const cache = localStorage.getItem(STORAGE_KEY);
		if (!cache) return;

		const photos: GlobalPhotoCache = JSON.parse(cache);
		const now = Date.now();
		let hasChanges = false;

		// Remove entries older than maxAge
		Object.entries(photos).forEach(([chatId, data]) => {
			if (now - data.timestamp > maxAge) {
				delete photos[chatId];
				hasChanges = true;
			}
		});

		if (hasChanges) {
			localStorage.setItem(STORAGE_KEY, JSON.stringify(photos));
		}
	} catch (error) {
		console.error("Error cleaning up photos cache:", error);
	}
}

/**
 * Get all cached photos
 */
export function getAllPhotos(): GlobalPhotoCache {
	try {
		const cache = localStorage.getItem(STORAGE_KEY);
		if (!cache) return {};

		return JSON.parse(cache) as GlobalPhotoCache;
	} catch (error) {
		console.error("Error getting all photos from localStorage:", error);
		return {};
	}
}

/**
 * Clear all photos from localStorage
 */
export function clearPhotos(): void {
	try {
		localStorage.removeItem(STORAGE_KEY);
		console.log("Photos cleared from localStorage");
	} catch (error) {
		console.error("Error clearing photos from localStorage:", error);
	}
}
