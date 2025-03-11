import React, { useState, useEffect } from "react";
import Image from "next/image";
import { useGetTelegramChatsQuery, useGetUserSavedChatsQuery, useSaveUserChatsMutation, useUpdateTelegramApiLinkMutation, useGetChatPhotoLazyQuery } from "../../generated/graphql";
import styles from "./TelegramChatsManager.module.css";
import { FaSearch } from "react-icons/fa";

// Storage key for chat photos
const CHAT_PHOTOS_STORAGE_KEY = "global-chat-photos-cache";

// Maximum number of saved chats allowed
const MAX_SAVED_CHATS = 20;

// Helper function to check if we need to fetch the photo
function needsPhotoFetch(photoUrl: string | undefined | null) {
	return photoUrl && photoUrl.startsWith("/api/telegram/photo/");
}

// Helper to check if we already tried to fetch this photo
function hasPhotoBeenFetched(chatId: string, photos: Record<string, string>) {
	return photos[chatId] !== undefined;
}

// Add a helper function to validate photo URL
const getValidPhotoUrl = (url: string | undefined | null): string => {
	if (!url || url === "" || url.startsWith("/api/telegram/photo/")) {
		return "/assets/KiFi_LOGO.jpg";
	}
	return url;
};

export const TelegramChatsManager = () => {
	// Add loading state tracking
	const [loadingPhotos, setLoadingPhotos] = useState<Set<string>>(new Set());

	// Helper to handle photo fetching with timeout
	const fetchChatPhoto = async (chatId: string, getChatPhoto: any, setChatPhotos: React.Dispatch<React.SetStateAction<Record<string, string>>>, setLoadingPhotos: React.Dispatch<React.SetStateAction<Set<string>>>) => {
		try {
			setLoadingPhotos((prev) => new Set([...prev, chatId]));
			const result = await Promise.race([getChatPhoto({ variables: { chatId } }), new Promise((_, reject) => setTimeout(() => reject(new Error("Photo fetch timeout")), 30000))]);

			if (result?.data?.getChatPhoto) {
				const shouldUseDefaultLogo = result.data.getChatPhoto === "no-photo" || !result.data.getChatPhoto;
				const photoUrl = shouldUseDefaultLogo ? "/assets/KiFi_LOGO.jpg" : result.data.getChatPhoto;

				setChatPhotos((prev) => ({
					...prev,
					[chatId]: photoUrl,
				}));
			} else {
				throw new Error("No photo data received");
			}
		} catch (error) {
			console.error(`Error fetching photo for chat ${chatId}:`, error);
			setChatPhotos((prev) => ({
				...prev,
				[chatId]: "/assets/KiFi_LOGO.jpg",
			}));
		} finally {
			setLoadingPhotos((prev) => {
				const next = new Set(prev);
				next.delete(chatId);
				return next;
			});
		}
	};

	const [, setSelectedChats] = useState<string[]>([]);
	const [apiLink, setApiLink] = useState("");
	// Pagination state
	const [availableChatsPage, setAvailableChatsPage] = useState(1);
	const [savedChatsPage, setSavedChatsPage] = useState(1);
	// Error message state
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	// Pending changes state
	const [pendingSavedChats, setPendingSavedChats] = useState<string[]>([]);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	// Search state
	const [searchTerm, setSearchTerm] = useState("");
	const [isMobileView, setIsMobileView] = useState(false);
	// Page limit state
	const [pageLimit, setPageLimit] = useState(15); // Default to desktop view
	const [savedChatsPageLimit, setSavedChatsPageLimit] = useState(5); // Make this dynamic

	// Initialize chatPhotos from localStorage if available
	const [chatPhotos, setChatPhotos] = useState<Record<string, string>>(() => {
		try {
			const storedPhotos = localStorage.getItem(CHAT_PHOTOS_STORAGE_KEY);
			return storedPhotos ? JSON.parse(storedPhotos) : {};
		} catch (error) {
			console.error("Error loading chat photos from localStorage:", error);
			return {};
		}
	});

	// Queries
	const { data: telegramChats, loading: loadingTelegram, error: telegramError } = useGetTelegramChatsQuery();
	const { data: savedChats, loading: loadingSaved, refetch: refetchSavedChats } = useGetUserSavedChatsQuery();
	const [getChatPhoto, {}] = useGetChatPhotoLazyQuery();

	// Mutations
	const [saveChats, { loading: savingChats }] = useSaveUserChatsMutation({
		onCompleted: () => {
			refetchSavedChats();
			setSelectedChats([]);
			setPendingSavedChats([]);
			setErrorMessage(null);
			setHasUnsavedChanges(false);
		},
	});

	const [updateApiLink, { loading: updatingLink }] = useUpdateTelegramApiLinkMutation({
		onCompleted: () => {
			setErrorMessage(null);
		},
		onError: (error) => {
			setErrorMessage(`Error updating API link: ${error.message}`);
		},
	});

	// Save chat photos to localStorage whenever they change
	useEffect(() => {
		try {
			localStorage.setItem(CHAT_PHOTOS_STORAGE_KEY, JSON.stringify(chatPhotos));
		} catch (error) {
			console.error("Error saving chat photos to localStorage:", error);
		}
	}, [chatPhotos]);

	// Check for mobile view on mount and window resize
	useEffect(() => {
		const checkMobileView = () => {
			const isMobile = window.innerWidth < 640;
			setIsMobileView(isMobile);
		};

		// Initial check
		checkMobileView();

		// Update on resize
		window.addEventListener("resize", checkMobileView);
		return () => window.removeEventListener("resize", checkMobileView);
	}, []);

	// Update page limit on resize
	useEffect(() => {
		const getPageLimit = () => {
			if (isMobileView) {
				return 4;
			}
			const width = window.innerWidth;
			if (width < 640) {
				return 4;
			} else if (width < 780) {
				return 6;
			} else if (width < 1100) {
				return 5;
			} else if (width < 1800) {
				return 10;
			}
			return 15;
		};

		const getSavedChatsLimit = () => {
			const width = window.innerWidth;
			if (width < 640) {
				return 2;
			} else if (width < 780) {
				return 3;
			} else if (width < 1280) {
				return 5;
			}
			return 5;
		};

		const handleResize = () => {
			const newLimit = getPageLimit();
			const newSavedLimit = getSavedChatsLimit();
			setPageLimit(newLimit);
			setSavedChatsPageLimit(newSavedLimit);

			// Reset to first page if current page would be out of bounds with new limit
			const availableTotal = telegramChats?.getTelegramChats.chats.length || 0;
			const availablePages = Math.ceil(availableTotal / newLimit);
			if (availableChatsPage > availablePages) {
				setAvailableChatsPage(1);
			}

			// For saved chats, adjust based on new saved chats limit
			const savedTotal = pendingSavedChats.length;
			const savedPages = Math.ceil(savedTotal / newSavedLimit);
			if (savedChatsPage > savedPages && savedPages > 0) {
				setSavedChatsPage(savedPages);
			}
		};

		// Initial setup
		handleResize();

		// Update on resize
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [telegramChats, pendingSavedChats.length, availableChatsPage, savedChatsPage, isMobileView]);

	// Filter chats based on search term
	const filteredChats =
		telegramChats?.getTelegramChats.chats.filter((chat) => {
			return chat.name.toLowerCase().includes(searchTerm.toLowerCase());
		}) || [];

	// Calculate pagination values for available chats
	const availableChatsTotal = searchTerm ? filteredChats.length : telegramChats?.getTelegramChats.chats.length || 0;
	const availableChatsPages = Math.ceil(availableChatsTotal / pageLimit);
	const availableChatsStart = (availableChatsPage - 1) * pageLimit;
	const availableChatsEnd = availableChatsStart + pageLimit;

	// Calculate pagination values for saved chats - always 5 per page
	const pendingSavedChatsTotal = pendingSavedChats.length;
	const savedChatsPages = Math.max(1, Math.ceil(pendingSavedChatsTotal / savedChatsPageLimit));
	const savedChatsStart = (savedChatsPage - 1) * savedChatsPageLimit;
	const savedChatsEnd = Math.min(savedChatsStart + savedChatsPageLimit, pendingSavedChatsTotal);

	// Update the useEffect that fetches photos
	useEffect(() => {
		const visibleChats = [...(telegramChats?.getTelegramChats.chats?.slice(availableChatsStart, availableChatsEnd) || []), ...(savedChats?.getUserSavedChats.chats?.slice(savedChatsStart, savedChatsEnd) || [])];

		// Only fetch photos for chats that:
		// 1. Are not already in the cache
		// 2. Have a photo URL that needs to be fetched from the API
		const chatIdsToFetch = visibleChats
			.filter((chat) => {
				const needsFetch = needsPhotoFetch(chat.photoUrl);
				const notInCache = !hasPhotoBeenFetched(chat.id, chatPhotos);
				return needsFetch && notInCache;
			})
			.map((chat) => chat.id);

		if (chatIdsToFetch.length > 0) {
			const fetchPhotos = async () => {
				try {
					await Promise.all(chatIdsToFetch.map((chatId) => fetchChatPhoto(chatId, getChatPhoto, setChatPhotos, setLoadingPhotos)));
				} catch (error) {
					console.error("Error fetching chat photos:", error);
				}
			};

			fetchPhotos();
		}
	}, [availableChatsStart, availableChatsEnd, savedChatsStart, savedChatsEnd, telegramChats?.getTelegramChats.chats, savedChats?.getUserSavedChats.chats, getChatPhoto]); // Remove chatPhotos from dependencies as it's used in hasPhotoBeenFetched

	// Initialize pendingSavedChats when savedChats data is loaded
	useEffect(() => {
		if (savedChats?.getUserSavedChats.chats && !hasUnsavedChanges) {
			const savedChatIds = savedChats.getUserSavedChats.chats.map((chat) => chat.id);
			setPendingSavedChats(savedChatIds);
		}
	}, [savedChats, hasUnsavedChanges]);

	// Reset pagination when search term changes
	useEffect(() => {
		setAvailableChatsPage(1);
	}, [searchTerm]);

	// Reset saved chats pagination when the number of saved chats changes
	useEffect(() => {
		const maxValidPage = Math.max(1, Math.ceil(pendingSavedChats.length / savedChatsPageLimit));

		if (savedChatsPage > maxValidPage) {
			setSavedChatsPage(maxValidPage);
		}
	}, [pendingSavedChats.length, savedChatsPage, savedChatsPageLimit]);

	// Handle API link update
	const handleApiLinkSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		try {
			await updateApiLink({
				variables: {
					apiLink,
				},
			});
		} catch (error) {
			console.error("Failed to update API link:", error);
		}
	};

	// Handle chat selection for available chats
	const handleChatSelect = (chatId: string) => {
		// If the chat is already in pendingSavedChats, remove it
		if (pendingSavedChats.includes(chatId)) {
			setPendingSavedChats((prev) => prev.filter((id) => id !== chatId));
			setHasUnsavedChanges(true);
			setErrorMessage(null);
			return;
		}

		if (pendingSavedChats.length < MAX_SAVED_CHATS) {
			setPendingSavedChats((prev) => [...prev, chatId]);
			setHasUnsavedChanges(true);
			setErrorMessage(null);
		} else {
			setErrorMessage(`You can only save up to ${MAX_SAVED_CHATS} chats. Please remove some chats first.`);
		}
	};

	// Handle chat toggle for saved chats
	const handleSavedChatToggle = (chatId: string) => {
		setPendingSavedChats((prev) => prev.filter((id) => id !== chatId));
		setHasUnsavedChanges(true);
		setErrorMessage(null);
	};

	// Save pending changes to saved chats
	const handleSaveChanges = async () => {
		try {
			await saveChats({
				variables: {
					input: {
						chatIds: pendingSavedChats,
					},
				},
			});
		} catch (error) {
			console.error("Failed to save chats:", error);
			setErrorMessage("Failed to save chats. Please try again.");
		}
	};

	// Reset pending changes to match current saved chats
	const handleCancelChanges = () => {
		if (savedChats?.getUserSavedChats.chats) {
			const savedChatIds = savedChats.getUserSavedChats.chats.map((chat) => chat.id);
			setPendingSavedChats(savedChatIds);
			setHasUnsavedChanges(false);
			setErrorMessage(null);
		}
	};

	// Pagination handlers
	const handleAvailableChatsPageChange = (newPage: number) => {
		if (newPage >= 1 && newPage <= availableChatsPages) {
			setAvailableChatsPage(newPage);
		}
	};

	const handleSavedChatsPageChange = (newPage: number) => {
		if (newPage >= 1 && newPage <= savedChatsPages) {
			setSavedChatsPage(newPage);
		}
	};

	// Pagination component
	const Pagination = ({ currentPage, totalPages, onPageChange }: { currentPage: number; totalPages: number; onPageChange: (page: number) => void }) => {
		if (totalPages <= 1) return null;

		return (
			<div className={styles.pagination}>
				<button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className={styles.paginationButton} aria-label="Previous page">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M15 18l-6-6 6-6" />
					</svg>
				</button>
				<span className={styles.paginationInfo}>
					Page {currentPage} of {totalPages}
				</span>
				<button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className={styles.paginationButton} aria-label="Next page">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M9 18l6-6-6-6" />
					</svg>
				</button>
			</div>
		);
	};

	// Check if a chat is in the pending saved chats
	const isPendingSaved = (chatId: string) => pendingSavedChats.includes(chatId);

	// Handle search input change
	const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		setSearchTerm(e.target.value);
	};

	const ChatAvatar = ({ chatId, photoUrl, name }: { chatId: string; photoUrl?: string | null; name: string }) => {
		const isLoading = loadingPhotos.has(chatId);
		const hasPhoto = chatPhotos[chatId];

		// If we have a cached photo, use it
		if (hasPhoto) {
			return <Image src={hasPhoto} alt={name} className={styles.chatAvatar} width={50} height={50} priority={false} />;
		}

		// If we're loading or it's an API URL that needs fetching, show loading state
		if (isLoading || (photoUrl && needsPhotoFetch(photoUrl))) {
			return (
				<div className={styles.chatAvatarLoading}>
					<div className={styles.chatAvatarSpinner}></div>
				</div>
			);
		}

		// Otherwise use the validated photo URL or default logo
		const validPhotoUrl = getValidPhotoUrl(photoUrl);
		return <Image src={validPhotoUrl} alt={name} className={styles.chatAvatar} width={50} height={50} priority={false} />;
	};

	if (loadingTelegram || loadingSaved) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Loading chats...</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			{(savingChats || updatingLink) && (
				<div className={styles.loadingContainer}>
					<div className={styles.loadingSpinner}></div>
					<p className={styles.loadingText}>{savingChats ? "Saving chats..." : updatingLink ? "Updating API link..." : "Loading..."}</p>
				</div>
			)}
			<form onSubmit={handleApiLinkSubmit} className={styles.apiForm}>
				<div className={styles.formGroup}>
					<input type="text" placeholder="Enter Telegram API Link" className={styles.input} value={apiLink} onChange={(e) => setApiLink(e.target.value)} />
					<button type="submit" disabled={updatingLink} className={`${styles.button} ${styles.buttonPrimary}`}>
						{updatingLink ? "Updating..." : "Update API Link"}
					</button>
				</div>
			</form>

			{errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

			{telegramError ? (
				<div className={styles.loadingContainer}>
					<p className={styles.errorText}>Error: {telegramError.message}</p>
				</div>
			) : (
				<div className={styles.contentWrapper}>
					<div className={styles.section}>
						<div className={styles.sectionHeader}>
							<h2 className={styles.sectionTitle}>Telegram Chats Manager</h2>
							<div className={styles.searchContainer}>
								<FaSearch className={styles.searchIcon} />
								<input type="text" placeholder="Search chats..." value={searchTerm} onChange={handleSearchChange} className={styles.searchInput} />
							</div>
						</div>
						<div className={`${styles.chatGrid} ${styles.availableChatsRow}`}>
							{(searchTerm ? filteredChats : telegramChats?.getTelegramChats.chats || []).slice(availableChatsStart, availableChatsEnd).map((chat) => (
								<div key={chat.id} className={`${styles.chatCard} ${isPendingSaved(chat.id) ? styles.chatCardSaved : ""}`} onClick={() => handleChatSelect(chat.id)}>
									<ChatAvatar chatId={chat.id} photoUrl={chat.photoUrl} name={chat.name} />
									<h1 className={styles.chatName}>{chat.name}</h1>
									<p className={styles.chatType}>{chat.type}</p>
									{isPendingSaved(chat.id) && <div className={styles.savedBadge}>Selected</div>}
								</div>
							))}
							{availableChatsTotal === 0 && searchTerm && <p className={styles.emptyState}>No chats found matching &quot;{searchTerm}&quot;</p>}
						</div>
						{/* Pagination outside of scrollable area */}
						<Pagination key={`available-pagination-${availableChatsPage}-${availableChatsPages}`} currentPage={availableChatsPage} totalPages={availableChatsPages} onPageChange={handleAvailableChatsPageChange} />
					</div>

					{/* Saved Chats Section - Fixed at bottom */}
					<div className={styles.section}>
						<div className={styles.sectionHeader}>
							<h2 className={styles.sectionTitle}>
								Saved Chats ({pendingSavedChats.length}/{MAX_SAVED_CHATS})
							</h2>
							<div className={styles.savedCountInfo}>{pendingSavedChatsTotal > 0 ? `Showing ${savedChatsEnd - savedChatsStart} of ${pendingSavedChatsTotal} saved chats` : "No saved chats"}</div>
						</div>

						{pendingSavedChats.length === 0 ? (
							<p className={styles.emptyState}>No chats saved yet. Select chats from above to save them.</p>
						) : (
							<>
								<div className={`${styles.chatGrid} ${styles.savedChatsRow}`}>
									{pendingSavedChats.slice(savedChatsStart, savedChatsEnd).map((chatId) => {
										const chat = telegramChats?.getTelegramChats.chats.find((c) => c.id === chatId) || savedChats?.getUserSavedChats.chats.find((c) => c.id === chatId);

										if (!chat) return null;

										return (
											<div key={chat.id} className={`${styles.chatCard} ${styles.savedChatCard}`} onClick={() => handleSavedChatToggle(chat.id)}>
												<ChatAvatar chatId={chat.id} photoUrl={chat.photoUrl} name={chat.name} />
												<h3 className={styles.chatName}>{chat.name}</h3>
												<p className={styles.chatType}>{chat.type}</p>
												<div
													className={styles.removeOverlay}
													onClick={(e) => {
														e.stopPropagation();
														handleSavedChatToggle(chat.id);
													}}
												>
													Remove
												</div>
											</div>
										);
									})}
								</div>
								<Pagination key={`saved-pagination-${savedChatsPage}-${savedChatsPages}`} currentPage={savedChatsPage} totalPages={savedChatsPages} onPageChange={handleSavedChatsPageChange} />

								<div className={styles.actionButtonsContainer}>
									<button onClick={handleCancelChanges} className={`${styles.button} ${styles.buttonSecondary} ${hasUnsavedChanges ? styles.buttonVisible : styles.buttonHidden}`}>
										Cancel
									</button>
									<button onClick={handleSaveChanges} disabled={savingChats} className={`${styles.button} ${styles.buttonSuccess} ${hasUnsavedChanges ? styles.buttonVisible : styles.buttonHidden}`}>
										{savingChats ? "Saving..." : "Save Changes"}
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			)}
		</div>
	);
};
