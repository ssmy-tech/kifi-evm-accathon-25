import React, { useState, useEffect } from "react";
import { useGetTelegramChatsQuery, useGetUserSavedChatsQuery, useSaveUserChatsMutation, useUpdateTelegramApiLinkMutation, useCheckTelegramApiHealthQuery, useGetChatPhotoLazyQuery } from "../../generated/graphql";
import styles from "./TelegramChatsManager.module.css";
import { FaSearch } from "react-icons/fa";

// Storage key for chat photos
const CHAT_PHOTOS_STORAGE_KEY = "telegram-chat-photos";

// Maximum number of saved chats allowed
const MAX_SAVED_CHATS = 5;

export const TelegramChatsManager: React.FC = () => {
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

	// Initialize chatPhotos from localStorage if available
	const [chatPhotos, setChatPhotos] = useState<Record<string, string>>(() => {
		const storedPhotos = localStorage.getItem(CHAT_PHOTOS_STORAGE_KEY);
		return storedPhotos ? JSON.parse(storedPhotos) : {};
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
			setErrorMessage(null);
			setHasUnsavedChanges(false);
		},
	});

	// Initialize pendingSavedChats from savedChats when data is loaded
	useEffect(() => {
		if (savedChats?.getUserSavedChats.chats) {
			const savedChatIds = savedChats.getUserSavedChats.chats.map((chat) => chat.id);
			setPendingSavedChats(savedChatIds);
		}
	}, [savedChats]);

	const [updateApiLink, { data: updateApiLinkData, loading: updatingLink }] = useUpdateTelegramApiLinkMutation({
		onCompleted: () => {
			refetchSavedChats();
		},
	});

	const pageLimit = 15;
	const savedChatsLimit = MAX_SAVED_CHATS;

	// Filter chats based on search term
	const filteredChats = telegramChats?.getTelegramChats.chats?.filter((chat) => chat.name.toLowerCase().includes(searchTerm.toLowerCase())) || [];

	// Calculate pagination values with filtered chats
	const availableChatsTotal = searchTerm ? filteredChats.length : telegramChats?.getTelegramChats.chats.length || 0;
	const availableChatsPages = Math.ceil(availableChatsTotal / pageLimit);
	const availableChatsStart = (availableChatsPage - 1) * pageLimit;
	const availableChatsEnd = availableChatsStart + pageLimit;

	const savedChatsTotal = savedChats?.getUserSavedChats.chats.length || 0;
	const savedChatsPages = Math.ceil(savedChatsTotal / savedChatsLimit);
	const savedChatsStart = (savedChatsPage - 1) * savedChatsLimit;
	const savedChatsEnd = savedChatsStart + savedChatsLimit;

	// Save chatPhotos to localStorage whenever it changes
	useEffect(() => {
		localStorage.setItem(CHAT_PHOTOS_STORAGE_KEY, JSON.stringify(chatPhotos));
	}, [chatPhotos]);

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
						getChatPhoto({
							variables: { chatId: chat.id },
							onCompleted: (data) => {
								if (data.getChatPhoto) {
									console.log(data.getChatPhoto);
									setChatPhotos((prev) => ({
										...prev,
										[chat.id]: data.getChatPhoto === "no-photo" || !data.getChatPhoto ? "/assets/KiFi_LOGO.jpg" : data.getChatPhoto,
									}));
								}
							},
							onError: (error) => {
								console.error("Error fetching saved chat photo:", error);
							},
						});
					}
				});
		}
	}, [savedChats, getChatPhoto, chatPhotos, savedChatsStart, savedChatsEnd]);

	// Reset pagination when search term changes
	useEffect(() => {
		setAvailableChatsPage(1);
	}, [searchTerm]);

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
				<button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1} className={styles.paginationButton} aria-label="Previous page">
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
						<path d="M15 18l-6-6 6-6" />
					</svg>
				</button>
				<span className={styles.paginationInfo}>
					Page {currentPage} of {totalPages}
				</span>
				<button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages} className={styles.paginationButton} aria-label="Next page">
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
			{/* API Link Form */}
			<form onSubmit={handleApiLinkSubmit} className={styles.apiForm}>
				<div className={styles.formGroup}>
					<input type="text" value={apiLink} onChange={(e) => setApiLink(e.target.value)} placeholder="Enter Telegram API Link" className={styles.input} />
					<button type="submit" disabled={updatingLink} className={`${styles.button} ${styles.buttonPrimary}`}>
						{updatingLink ? "Updating..." : "Update API Link"}
					</button>
				</div>
			</form>

			{errorMessage && <div className={styles.errorMessage}>{errorMessage}</div>}

			{telegramError ? (
				<div className={styles.loadingContainer}>Error: {telegramError.message}</div>
			) : (
				<>
					{/* Available Chats Section */}
					<div className={styles.section}>
						<div className={styles.sectionHeader}>
							<h2 className={styles.sectionTitle}>Available Telegram Chats</h2>
							<div className={styles.searchContainer}>
								<input type="text" value={searchTerm} onChange={handleSearchChange} placeholder="Search chats by name..." className={styles.searchInput} />
								<div className={styles.searchIcon}>
									<FaSearch />
								</div>
							</div>
						</div>
						<div className={styles.chatGrid}>
							{(searchTerm ? filteredChats : telegramChats?.getTelegramChats.chats || []).slice(availableChatsStart, availableChatsEnd).map((chat) => (
								<div key={chat.id} className={`${styles.chatCard} ${isPendingSaved(chat.id) ? styles.chatCardSaved : ""}`} onClick={() => handleChatSelect(chat.id)}>
									{chatPhotos[chat.id] && <img src={chatPhotos[chat.id]} alt={chat.name} className={styles.chatAvatar} loading="lazy" />}
									<h3 className={styles.chatName}>{chat.name}</h3>
									<p className={styles.chatType}>{chat.type}</p>
									{isPendingSaved(chat.id) && <div className={styles.savedBadge}>Selected</div>}
								</div>
							))}
						</div>
						{availableChatsTotal === 0 && searchTerm && <p className={styles.emptyState}>No chats found matching "{searchTerm}"</p>}
						<Pagination currentPage={availableChatsPage} totalPages={availableChatsPages} onPageChange={handleAvailableChatsPageChange} />
					</div>

					{/* Saved Chats */}
					<div className={styles.section}>
						<h2 className={styles.sectionTitle}>
							Saved Chats ({pendingSavedChats.length}/{MAX_SAVED_CHATS})
						</h2>

						{pendingSavedChats.length === 0 ? (
							<p className={styles.emptyState}>No chats saved yet. Select chats from above to save them.</p>
						) : (
							<>
								<div className={styles.chatGrid}>
									{pendingSavedChats
										.map((chatId) => {
											// Find the chat in either available or saved chats
											const chat = telegramChats?.getTelegramChats.chats.find((c) => c.id === chatId) || savedChats?.getUserSavedChats.chats.find((c) => c.id === chatId);

											if (!chat) return null;

											return (
												<div key={chat.id} className={`${styles.chatCard} ${styles.savedChatCard}`} onClick={() => handleSavedChatToggle(chat.id)}>
													{chatPhotos[chat.id] && <img src={chatPhotos[chat.id]} alt={chat.name} className={styles.chatAvatar} loading="lazy" />}
													<h3 className={styles.chatName}>{chat.name}</h3>
													<p className={styles.chatType}>{chat.type}</p>
													<div className={styles.removeOverlay}>
														<span>Remove</span>
													</div>
												</div>
											);
										})
										.filter(Boolean)}
								</div>
							</>
						)}
					</div>

					{/* Save/Cancel Actions - Bottom right of container */}
					{hasUnsavedChanges && (
						<div className={styles.actionButtonsContainer}>
							<button onClick={handleCancelChanges} className={`${styles.button} ${styles.buttonSecondary}`}>
								Cancel
							</button>
							<button onClick={handleSaveChanges} disabled={savingChats} className={`${styles.button} ${styles.buttonSuccess}`}>
								{savingChats ? "Saving..." : "Save Changes"}
							</button>
						</div>
					)}
				</>
			)}
		</div>
	);
};
