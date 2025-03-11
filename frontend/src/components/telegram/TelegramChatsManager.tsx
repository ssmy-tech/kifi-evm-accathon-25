import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useGetTelegramChatsQuery, useGetUserSavedChatsQuery, useSaveUserChatsMutation, useUpdateTelegramApiLinkMutation, useGetChatPhotoLazyQuery } from "../../generated/graphql";
import styles from "./TelegramChatsManager.module.css";
import { FaSearch } from "react-icons/fa";
import { savePhoto, getAllPhotos } from "../../utils/localStorage";

// Constants
const MAX_SAVED_CHATS = 20;
const DEFAULT_PHOTO = "/assets/KiFi_LOGO.jpg";

// Photo management types
interface PhotoState {
	url: string;
	isLoading: boolean;
	error?: string;
}

type PhotoCache = Record<string, PhotoState>;

// Helper to manage photo cache in localStorage
const photoCache = {
	get: (): PhotoCache => {
		try {
			const photos: PhotoCache = {};
			const cached = getAllPhotos();

			Object.entries(cached).forEach(([id, data]) => {
				if (data && typeof data.url === "string" && data.url !== "" && data.url !== "no-photo") {
					photos[id] = { url: data.url, isLoading: false };
				}
			});
			return photos;
		} catch {
			return {};
		}
	},
	set: (id: string, url: string) => {
		try {
			savePhoto(id, url);
		} catch (error) {
			console.error("Error saving to photo cache:", error);
		}
	},
};

export const TelegramChatsManager = () => {
	// State
	const [photos, setPhotos] = useState<PhotoCache>(photoCache.get());
	const [apiLink, setApiLink] = useState("");
	const [searchTerm, setSearchTerm] = useState("");
	const [errorMessage, setErrorMessage] = useState<string | null>(null);
	const [pendingSavedChats, setPendingSavedChats] = useState<string[]>([]);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [isMobileView, setIsMobileView] = useState(false);

	// Pagination state
	const [availableChatsPage, setAvailableChatsPage] = useState(1);
	const [savedChatsPage, setSavedChatsPage] = useState(1);
	const [pageLimit, setPageLimit] = useState(15);
	const [savedChatsPageLimit, setSavedChatsPageLimit] = useState(5);

	// Queries and mutations
	const { data: telegramChats, loading: loadingTelegram, error: telegramError } = useGetTelegramChatsQuery();
	const { data: savedChats, loading: loadingSaved, refetch: refetchSavedChats } = useGetUserSavedChatsQuery();
	const [getChatPhoto] = useGetChatPhotoLazyQuery();
	const [saveChats, { loading: savingChats }] = useSaveUserChatsMutation({
		onCompleted: () => {
			refetchSavedChats();
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

	// Filter chats based on search term
	const filteredChats =
		telegramChats?.getTelegramChats.chats.filter((chat) => {
			return chat.name.toLowerCase().includes(searchTerm.toLowerCase());
		}) || [];

	// Calculate pagination values
	const availableChatsTotal = searchTerm ? filteredChats.length : telegramChats?.getTelegramChats.chats.length || 0;
	const availableChatsPages = Math.ceil(availableChatsTotal / pageLimit);
	const availableChatsStart = (availableChatsPage - 1) * pageLimit;
	const availableChatsEnd = availableChatsStart + pageLimit;

	const pendingSavedChatsTotal = pendingSavedChats.length;
	const savedChatsPages = Math.max(1, Math.ceil(pendingSavedChatsTotal / savedChatsPageLimit));
	const savedChatsStart = (savedChatsPage - 1) * savedChatsPageLimit;
	const savedChatsEnd = Math.min(savedChatsStart + savedChatsPageLimit, pendingSavedChatsTotal);

	// Photo fetching logic
	const fetchPhoto = useCallback(
		async (chatId: string, photoUrl?: string | null) => {
			// Skip if no need to fetch
			if (!photoUrl?.startsWith("/api/telegram/photo/")) return;
			if (photos[chatId]?.isLoading || (photos[chatId]?.url && !photos[chatId]?.error)) return;

			setPhotos((prev) => ({
				...prev,
				[chatId]: { url: DEFAULT_PHOTO, isLoading: true },
			}));

			try {
				const result = await getChatPhoto({ variables: { chatId } });
				const url = result.data?.getChatPhoto;
				const finalUrl = !url || url === "no-photo" ? DEFAULT_PHOTO : url;

				setPhotos((prev) => ({
					...prev,
					[chatId]: { url: finalUrl, isLoading: false },
				}));

				if (finalUrl !== DEFAULT_PHOTO) {
					photoCache.set(chatId, finalUrl);
				}
			} catch (error) {
				console.error("Error fetching photo:", error);
				setPhotos((prev) => ({
					...prev,
					[chatId]: { url: DEFAULT_PHOTO, isLoading: false, error: "Failed to load" },
				}));
			}
		},
		[getChatPhoto, photos]
	);

	// Fetch photos for visible chats
	useEffect(() => {
		const visibleChats = [...(telegramChats?.getTelegramChats.chats?.slice(availableChatsStart, availableChatsEnd) || []), ...(savedChats?.getUserSavedChats.chats?.slice(savedChatsStart, savedChatsEnd) || [])];

		visibleChats.forEach((chat) => {
			if (!photos[chat.id] || photos[chat.id]?.error) {
				fetchPhoto(chat.id, chat.photoUrl);
			}
		});
	}, [telegramChats?.getTelegramChats.chats, savedChats?.getUserSavedChats.chats, availableChatsStart, availableChatsEnd, savedChatsStart, savedChatsEnd, fetchPhoto, photos]);

	// ChatAvatar component
	const ChatAvatar = ({ chatId, name }: { chatId: string; name: string; photoUrl?: string | null }) => {
		const photo = photos[chatId] || { url: DEFAULT_PHOTO, isLoading: false };

		return (
			<div className={photo.isLoading ? styles.chatAvatarLoading : undefined}>
				{photo.isLoading && <div className={styles.chatAvatarSpinner} />}
				<Image src={photo.url} alt={name} className={`${styles.chatAvatar} ${photo.isLoading ? styles.hidden : ""}`} width={50} height={50} priority={false} />
			</div>
		);
	};

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
									<ChatAvatar chatId={chat.id} name={chat.name} />
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
												<ChatAvatar chatId={chat.id} name={chat.name} />
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
