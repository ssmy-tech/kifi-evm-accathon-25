"use client";

import { useEffect } from "react";
import { preloadCachedImages, cleanupCallerPhotos } from "@/utils/localStorage";

/**
 * Component that preloads cached images when mounted
 * This should be included early in the app lifecycle
 */
export default function ImagePreloader() {
	useEffect(() => {
		// Preload cached images from localStorage
		preloadCachedImages();

		// Clean up old entries
		cleanupCallerPhotos();

		// Set up periodic cleanup (once a day)
		const cleanupInterval = setInterval(() => {
			cleanupCallerPhotos();
		}, 24 * 60 * 60 * 1000);

		return () => {
			clearInterval(cleanupInterval);
		};
	}, []);

	// This component doesn't render anything
	return null;
}
