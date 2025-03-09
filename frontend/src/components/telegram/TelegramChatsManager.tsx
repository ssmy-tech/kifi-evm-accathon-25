import React, { useState, useEffect } from "react";
import { useGetTelegramChatsQuery, useGetUserSavedChatsQuery, useSaveUserChatsMutation, useUpdateTelegramApiLinkMutation, useCheckTelegramApiHealthQuery, useGetChatPhotoLazyQuery } from "../../generated/graphql";
import styles from "./TelegramChatsManager.module.css";
import { FaSearch } from "react-icons/fa";

// Storage key for chat photos
const CHAT_PHOTOS_STORAGE_KEY = "telegram-chat-photos";

// Maximum number of saved chats allowed
const MAX_SAVED_CHATS = 20;

interface TelegramChatsManagerProps {}

export const TelegramChatsManager: React.FC<TelegramChatsManagerProps> = () => {
	const [selectedChats, setSelectedChats] = useState<string[]>([]);
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
	const [pageLimit, setPageLimit] = useState(16); // Default to desktop view
	const [savedChatsPageLimit, setSavedChatsPageLimit] = useState(5); // Fixed 5 per page for saved chats

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
	const [getChatPhoto, { loading: loadingChatPhoto }] = useGetChatPhotoLazyQuery();

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

	// Function to determine page limit based on screen size
	const getPageLimit = () => {
		if (isMobileView) {
			return 4;
		}
		const width = window.innerWidth;
		if (width < 640) {
			return 4;
		} else if (width < 780) {
			return 6;
		} else if (width < 1280) {
			return 10;
		}
		return 15;
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
		const handleResize = () => {
			const newLimit = getPageLimit();
			setPageLimit(newLimit);

			// Reset to first page if current page would be out of bounds with new limit
			const availableTotal = telegramChats?.getTelegramChats.chats.length || 0;
			const availablePages = Math.ceil(availableTotal / newLimit);
			if (availableChatsPage > availablePages) {
				setAvailableChatsPage(1);
			}

			// For saved chats, we use a fixed limit of 5, so we don't need to adjust based on screen size
			const savedTotal = pendingSavedChats.length;
			const savedPages = Math.ceil(savedTotal / savedChatsPageLimit);
			if (savedChatsPage > savedPages && savedPages > 0) {
				console.log(`Resize: Adjusting saved chats page from ${savedChatsPage} to ${savedPages}`);
				setSavedChatsPage(savedPages);
			}
		};

		// Initial setup
		handleResize();

		// Update on resize
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, [telegramChats, pendingSavedChats.length, availableChatsPage, savedChatsPage, savedChatsPageLimit]);

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
	const displayedSavedChatsCount = pendingSavedChatsTotal > 0 ? Math.min(savedChatsEnd - savedChatsStart, pendingSavedChatsTotal) : 0;

	// Fetch photos for visible available chats
	useEffect(() => {
		if (telegramChats?.getTelegramChats.chats) {
			telegramChats.getTelegramChats.chats
				.slice(availableChatsStart, availableChatsEnd)
				.reverse()
				.forEach((chat) => {
					if (!chatPhotos[chat.id]) {
						getChatPhoto({
							variables: { chatId: chat.id },
							onCompleted: (data) => {
								if (data.getChatPhoto) {
									setChatPhotos((prev) => ({
										...prev,
										[chat.id]: data.getChatPhoto === "no-photo" || !data.getChatPhoto ? "/assets/KiFi_LOGO.jpg" : data.getChatPhoto,
									}));
								}
							},
							onError: (error) => {
								console.error("Error fetching chat photo:", error);
							},
						});
					}
				});
		}
	}, [telegramChats, getChatPhoto, chatPhotos, availableChatsStart, availableChatsEnd]);

	// Fetch saved chats photos if they aren't in local storage
	useEffect(() => {
		if (savedChats?.getUserSavedChats.chats) {
			savedChats.getUserSavedChats.chats
				.slice(savedChatsStart, savedChatsEnd)
				.reverse()
				.forEach((chat) => {
					if (!chatPhotos[chat.id]) {
						chatPhotos[chat.id] = chat.photoUrl == "no-photo" || !chat.photoUrl ? "/assets/KiFi_LOGO.jpg" : chat.photoUrl;
					}
				});
		}
	}, [savedChats, getChatPhoto, chatPhotos, savedChatsStart, savedChatsEnd]);

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
		// Don't render pagination if there's only one page or no pages
		if (totalPages <= 1) return null;

		// Ensure current page is within valid range
		const validCurrentPage = Math.max(1, Math.min(currentPage, totalPages));

		const handlePrevClick = () => {
			onPageChange(validCurrentPage - 1);
		};

		const handleNextClick = () => {
			onPageChange(validCurrentPage + 1);
		};

		return (
			<div className={styles.pagination}>
				<button onClick={handlePrevClick} disabled={validCurrentPage === 1} className={styles.paginationButton} aria-label="Previous page">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M15 18l-6-6 6-6" />
					</svg>
				</button>
				<span className={styles.paginationInfo}>
					Page {validCurrentPage} of {totalPages}
				</span>
				<button onClick={handleNextClick} disabled={validCurrentPage === totalPages} className={styles.paginationButton} aria-label="Next page">
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
									{chatPhotos[chat.id] ? (
										<img src={chatPhotos[chat.id]} alt={chat.name} className={styles.chatAvatar} loading="lazy" />
									) : (
										<div className={styles.chatAvatarLoading}>
											<div className={styles.chatAvatarSpinner}></div>
										</div>
									)}
									<h2 className={styles.chatName}>{chat.name}</h2>
									<p className={styles.chatType}>{chat.type}</p>
									{isPendingSaved(chat.id) && <div className={styles.savedBadge}>Selected</div>}
								</div>
							))}
							{availableChatsTotal === 0 && searchTerm && <p className={styles.emptyState}>No chats found matching "{searchTerm}"</p>}
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
							<div className={styles.savedCountInfo}>{pendingSavedChatsTotal > 0 ? `Showing ${displayedSavedChatsCount} of ${pendingSavedChatsTotal} saved chats` : "No saved chats"}</div>
						</div>

						{pendingSavedChats.length === 0 ? (
							<p className={styles.emptyState}>No chats saved yet. Select chats from above to save them.</p>
						) : (
							<>
								<div className={`${styles.chatGrid} ${styles.savedChatsRow}`}>
									{pendingSavedChats.slice(savedChatsStart, savedChatsEnd).map((chatId) => {
										// Find the chat in either available or saved chats
										const chat = telegramChats?.getTelegramChats.chats.find((c) => c.id === chatId) || savedChats?.getUserSavedChats.chats.find((c) => c.id === chatId);

										if (!chat) return null;

										return (
											<div key={chat.id} className={`${styles.chatCard} ${styles.savedChatCard}`} onClick={() => handleSavedChatToggle(chat.id)}>
												{chatPhotos[chat.id] ? (
													<img src={chatPhotos[chat.id]} alt={chat.name} className={styles.chatAvatar} loading="lazy" />
												) : (
													<div className={styles.chatAvatarLoading}>
														<div className={styles.chatAvatarSpinner}></div>
													</div>
												)}
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
								{/* Pagination for saved chats */}
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
