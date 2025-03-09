/**
 * Utility functions for managing caller photo URLs in localStorage
 */

const CALLER_PHOTOS_KEY = "kifi-caller-photos";

interface CallerPhotoCache {
	[callerId: string]: {
		url: string;
		timestamp: number;
	};
}

/**
 * Save a caller's photo URL to localStorage
 */
export function saveCallerPhoto(callerId: string, photoUrl: string): void {
	try {
		// Get existing photos from localStorage
		const existingPhotosJson = localStorage.getItem(CALLER_PHOTOS_KEY);
		const existingPhotos: CallerPhotoCache = existingPhotosJson ? JSON.parse(existingPhotosJson) : {};

		// Add or update the photo URL with a timestamp
		existingPhotos[callerId] = {
			url: photoUrl,
			timestamp: Date.now(),
		};

		// Save back to localStorage
		localStorage.setItem(CALLER_PHOTOS_KEY, JSON.stringify(existingPhotos));
	} catch (error) {
		console.error("Error saving caller photo to localStorage:", error);
	}
}

/**
 * Save multiple caller photos at once
 */
export function saveCallerPhotos(callers: Array<{ id: string; profileImageUrl: string }>): void {
	try {
		// Get existing photos from localStorage
		const existingPhotosJson = localStorage.getItem(CALLER_PHOTOS_KEY);
		const existingPhotos: CallerPhotoCache = existingPhotosJson ? JSON.parse(existingPhotosJson) : {};

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
export function getCallerPhoto(callerId: string): string | null {
	try {
		const photosJson = localStorage.getItem(CALLER_PHOTOS_KEY);
		if (!photosJson) return null;

		const photos: CallerPhotoCache = JSON.parse(photosJson);
		return photos[callerId]?.url || null;
	} catch (error) {
		console.error("Error getting caller photo from localStorage:", error);
		return null;
	}
}

/**
 * Clean up old photo entries (older than maxAge in milliseconds)
 */
export function cleanupCallerPhotos(maxAge: number = 7 * 24 * 60 * 60 * 1000): void {
	try {
		const photosJson = localStorage.getItem(CALLER_PHOTOS_KEY);
		if (!photosJson) return;

		const photos: CallerPhotoCache = JSON.parse(photosJson);
		const now = Date.now();

		// Filter out old entries
		const updatedPhotos: CallerPhotoCache = {};
		Object.entries(photos).forEach(([id, data]) => {
			if (now - data.timestamp < maxAge) {
				updatedPhotos[id] = data;
			}
		});

		// Save back to localStorage
		localStorage.setItem(CALLER_PHOTOS_KEY, JSON.stringify(updatedPhotos));
	} catch (error) {
		console.error("Error cleaning up caller photos in localStorage:", error);
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

		const photos: CallerPhotoCache = JSON.parse(photosJson);

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
export function getAllCallerPhotos(): CallerPhotoCache {
	try {
		const photosJson = localStorage.getItem(CALLER_PHOTOS_KEY);
		if (!photosJson) return {};

		return JSON.parse(photosJson) as CallerPhotoCache;
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
