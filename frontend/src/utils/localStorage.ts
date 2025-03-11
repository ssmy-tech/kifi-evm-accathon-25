/**
 * Utility functions for managing caller photo URLs in localStorage
 */

const CALLER_PHOTOS_KEY = "kifi-caller-photos";

// Global storage key for all chat photos
const GLOBAL_CHAT_PHOTOS_KEY = "global-chat-photos-cache";

interface GlobalPhotoCache {
	[chatId: string]: {
		url: string;
		timestamp: number;
	};
}

function migrateOldCache(): void {
	try {
		const cache = localStorage.getItem(GLOBAL_CHAT_PHOTOS_KEY);
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
			localStorage.setItem(GLOBAL_CHAT_PHOTOS_KEY, JSON.stringify(photos));
			console.log("Migrated old cache format to new format");
		}
	} catch (error) {
		console.error("Error migrating old cache format:", error);
	}
}

/**
 * Save a caller's photo URL to localStorage
 */
export function saveCallerPhoto(chatId: string, photoUrl: string): void {
	try {
		const cache = localStorage.getItem(GLOBAL_CHAT_PHOTOS_KEY);
		const photos: GlobalPhotoCache = cache ? JSON.parse(cache) : {};
		photos[chatId] = {
			url: photoUrl,
			timestamp: Date.now(),
		};
		localStorage.setItem(GLOBAL_CHAT_PHOTOS_KEY, JSON.stringify(photos));
	} catch (error) {
		console.error("Error saving to chat photos cache:", error);
	}
}

/**
 * Save multiple caller photos at once
 */
export function saveCallerPhotos(callers: Array<{ id: string; profileImageUrl: string }>): void {
	try {
		// Get existing photos from localStorage
		const existingPhotosJson = localStorage.getItem(CALLER_PHOTOS_KEY);
		const existingPhotos: GlobalPhotoCache = existingPhotosJson ? JSON.parse(existingPhotosJson) : {};

		// Current timestamp for all entries
		const now = Date.now();

		// Add or update each photo URL
		callers.forEach((caller) => {
			// Skip default images
			if (caller.profileImageUrl !== "/assets/KiFi_LOGO.jpg") {
				existingPhotos[caller.id] = {
					url: caller.profileImageUrl,
					timestamp: now,
				};
			}
		});

		// Save back to localStorage
		localStorage.setItem(CALLER_PHOTOS_KEY, JSON.stringify(existingPhotos));
	} catch (error) {
		console.error("Error saving caller photos to localStorage:", error);
	}
}

/**
 * Get a caller's photo URL from localStorage
 */
export function getCallerPhoto(chatId: string): string | null {
	try {
		migrateOldCache(); // Ensure cache is in correct format
		const cache = localStorage.getItem(GLOBAL_CHAT_PHOTOS_KEY);
		const photos: GlobalPhotoCache = cache ? JSON.parse(cache) : {};
		const photo = photos[chatId];

		// Handle both old and new format
		if (typeof photo === "string") {
			return photo;
		}
		return photo?.url || null;
	} catch (error) {
		console.error("Error reading from chat photos cache:", error);
		return null;
	}
}

/**
 * Clean up old photo entries (older than maxAge in milliseconds)
 */
export function cleanupCallerPhotos(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
	try {
		const cache = localStorage.getItem(GLOBAL_CHAT_PHOTOS_KEY);
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
			localStorage.setItem(GLOBAL_CHAT_PHOTOS_KEY, JSON.stringify(photos));
		}
	} catch (error) {
		console.error("Error cleaning up chat photos cache:", error);
	}
}

/**
 * Preload images from localStorage cache
 * This can be called early in the app lifecycle to ensure images are ready
 */
export function preloadCachedImages(): void {
	try {
		const photosJson = localStorage.getItem(CALLER_PHOTOS_KEY);
		if (!photosJson) return;

		const photos: GlobalPhotoCache = JSON.parse(photosJson);

		// Preload each image by creating an Image object
		Object.values(photos).forEach((photoData) => {
			if (photoData.url && !photoData.url.includes("/assets/")) {
				const img = new Image();
				img.src = photoData.url;
			}
		});
	} catch (error) {
		console.error("Error preloading cached images:", error);
	}
}

/**
 * Get all cached caller photos
 */
export function getAllCallerPhotos(): GlobalPhotoCache {
	try {
		const photosJson = localStorage.getItem(CALLER_PHOTOS_KEY);
		if (!photosJson) return {};

		return JSON.parse(photosJson) as GlobalPhotoCache;
	} catch (error) {
		console.error("Error getting all caller photos from localStorage:", error);
		return {};
	}
}

/**
 * Clear all caller photos from localStorage
 * This is useful for debugging purposes
 */
export function clearCallerPhotos(): void {
	try {
		localStorage.removeItem(CALLER_PHOTOS_KEY);
		console.log("Caller photos cleared from localStorage");
	} catch (error) {
		console.error("Error clearing caller photos from localStorage:", error);
	}
}

/**
 * Clear all chat photos from TokenFeed
 * This is useful for debugging purposes
 */
export function clearTokenFeedPhotos(): void {
	try {
		localStorage.removeItem("token-feed-chat-photos");
		console.log("Token feed photos cleared from localStorage");
	} catch (error) {
		console.error("Error clearing token feed photos from localStorage:", error);
	}
}

/**
 * Clear all Telegram chat photos
 * This is useful for debugging purposes
 */
export function clearTelegramChatPhotos(): void {
	try {
		localStorage.removeItem("telegram-chat-photos");
		console.log("Telegram chat photos cleared from localStorage");
	} catch (error) {
		console.error("Error clearing telegram chat photos from localStorage:", error);
	}
}

/**
 * Clear all CallerFeed photos from localStorage
 * This is useful for debugging purposes
 */
export function clearCallerFeedPhotos(): void {
	try {
		localStorage.removeItem("caller-feed-photos");
		console.log("CallerFeed photos cleared from localStorage");
	} catch (error) {
		console.error("Error clearing CallerFeed photos from localStorage:", error);
	}
}

/**
 * Clear all photo-related items from localStorage
 * This is useful for debugging purposes
 */
export function clearAllPhotoCache(): void {
	try {
		clearCallerPhotos();
		clearTokenFeedPhotos();
		clearTelegramChatPhotos();
		clearCallerFeedPhotos();
		console.log("All photo caches cleared from localStorage");
	} catch (error) {
		console.error("Error clearing all photo caches from localStorage:", error);
	}
}
