import React, { useState, useRef, useEffect } from "react";
import { FaUsers, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styles from "./CallerFeed.module.css";
import { formatTimestamp } from "@/utils/formatters";
import Image from "next/image";
import { Caller } from "@/types/caller.types";
import { saveCallerPhoto, getCallerPhoto } from "@/utils/localStorage";
import { useGetChatPhotoLazyQuery } from "@/generated/graphql";

// Storage key for caller photos in CallerFeed
const CALLER_FEED_PHOTOS_KEY = "caller-feed-photos";

const MESSAGES_PER_PAGE = 1;

interface CallerFeedProps {
	callers: Caller[];
	title?: string;
	isLoading?: boolean;
}

export default function CallerFeed({ callers, title = "Token Callers", isLoading = false }: CallerFeedProps) {
	const [sortField, setSortField] = useState<"callCount" | "timestamp">("timestamp");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [expandedCallerId, setExpandedCallerId] = useState<string | null>(null);
	const [closingCallerId, setClosingCallerId] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
	const tableContainerRef = useRef<HTMLDivElement>(null);

	// Initialize local photo cache from localStorage
	const [callerPhotos, setCallerPhotos] = useState<Record<string, string>>(() => {
		try {
			const storedPhotos = localStorage.getItem(CALLER_FEED_PHOTOS_KEY);
			return storedPhotos ? JSON.parse(storedPhotos) : {};
		} catch (error) {
			console.error("Error loading caller photos from localStorage:", error);
			return {};
		}
	});

	// Get the chat photo query hook
	const [getChatPhoto] = useGetChatPhotoLazyQuery();

	// Save caller photos to localStorage whenever they change
	useEffect(() => {
		try {
			localStorage.setItem(CALLER_FEED_PHOTOS_KEY, JSON.stringify(callerPhotos));
		} catch (error) {
			console.error("Error saving caller photos to localStorage:", error);
		}
	}, [callerPhotos]);

	// Fetch photos for callers
	useEffect(() => {
		if (callers && callers.length > 0) {
			callers.forEach((caller) => {
				const chatId = caller.chat.id;
				// Only fetch if we don't already have the photo in local state
				if (!callerPhotos[chatId]) {
					// First try to get from global caller photos cache
					const cachedPhoto = getCallerPhoto(chatId);

					if (cachedPhoto) {
						// If found in global cache, use it and update local state
						setCallerPhotos((prev) => ({
							...prev,
							[chatId]: cachedPhoto,
						}));
					} else if (caller.chat.photoUrl === "no-photo") {
						// If using default image, try to fetch from API
						getChatPhoto({
							variables: { chatId },
							onCompleted: (data) => {
								if (data.getChatPhoto) {
									const photoUrl = data.getChatPhoto === "no-photo" || !data.getChatPhoto ? "/assets/KiFi_LOGO.jpg" : data.getChatPhoto;

									// Update local state
									setCallerPhotos((prev) => ({
										...prev,
										[chatId]: photoUrl,
									}));

									// Also save to global cache if it's not the default image
									if (photoUrl !== "/assets/KiFi_LOGO.jpg") {
										saveCallerPhoto(chatId, photoUrl);
									}
								}
							},
							onError: (error) => {
								console.error("Error fetching chat photo:", error);
								// Set default image on error
								setCallerPhotos((prev) => ({
									...prev,
									[chatId]: "/assets/KiFi_LOGO.jpg",
								}));
							},
						});
					} else if (caller.chat.photoUrl && caller.chat.photoUrl !== "no-photo") {
						// If caller already has a non-default photo, save it to both caches
						setCallerPhotos((prev) => ({
							...prev,
							[chatId]: caller.chat.photoUrl,
						}));
						saveCallerPhoto(chatId, caller.chat.photoUrl);
					}
				}
			});
		}
	}, [callers, getChatPhoto, callerPhotos]);

	const handleSort = (field: "callCount" | "timestamp") => {
		if (field === sortField) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
	};

	const toggleExpandCaller = (callerId: string) => {
		if (expandedCallerId === callerId) {
			setClosingCallerId(callerId);
			setTimeout(() => {
				setExpandedCallerId(null);
				setClosingCallerId(null);
			}, 200);
		} else {
			setExpandedCallerId(callerId);
		}
	};

	useEffect(() => {
		if (expandedCallerId && tableContainerRef.current) {
			const expandedRow = tableContainerRef.current.querySelector(`[data-caller-id="${expandedCallerId}"]`);
			if (expandedRow) {
				expandedRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
		}
	}, [expandedCallerId]);

	const sortedCallers = [...(callers || [])].sort((a, b) => {
		if (sortField === "timestamp") {
			const aTime = a.messages?.[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0;
			const bTime = b.messages?.[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0;
			return sortDirection === "desc" ? bTime - aTime : aTime - bTime;
		}

		// Sort by callCount
		return sortDirection === "desc" ? b.callCount - a.callCount : a.callCount - b.callCount;
	});

	const handlePageChange = (chatId: string, newPage: number, totalPages: number) => {
		if (newPage >= 0 && newPage < totalPages) {
			setCurrentPage((prev) => ({
				...prev,
				[chatId]: newPage,
			}));
		}
	};

	return (
		<div className={`${styles.container} ${styles.callerFeedContainer}`}>
			<h2 className={styles.title}>
				<FaUsers className={styles.titleIcon} />
				{title} ({callers?.length})
			</h2>

			<div className={styles.scrollContainer}>
				{isLoading ? (
					<div className={styles.loading}>Loading callers...</div>
				) : sortedCallers.length === 0 ? (
					<div className={styles.empty}>No callers found</div>
				) : (
					<div className={styles.tableContainer} ref={tableContainerRef}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th className={`${styles.sortable} ${styles.nameColumn}`}>Chat</th>
									<th onClick={() => handleSort("timestamp")} className={`${styles.sortable} ${styles.timestampColumn}`}>
										Timestamp
										{sortField === "timestamp" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
									</th>
									<th onClick={() => handleSort("callCount")} className={`${styles.sortable} ${styles.callColumn}`}>
										Calls
										{sortField === "callCount" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
									</th>
									<th className={`${styles.sortable} ${styles.messageHeader}`}>Message(s)</th>
								</tr>
							</thead>
							<tbody className={styles.tableBody}>
								{sortedCallers.map((caller) => {
									const chatId = caller.chat.id;
									const profileImageUrl = callerPhotos[chatId] || "/assets/KiFi_LOGO.jpg";
									const latestMessage = caller.messages[0];

									return (
										<React.Fragment key={chatId}>
											<tr className={`${styles.callerRow} ${caller.messages.length ? styles.hasMessage : ""}`} onClick={() => caller.messages.length && toggleExpandCaller(chatId)} style={caller.messages.length ? { cursor: "pointer" } : {}}>
												<td className={styles.nameColumn}>
													<div className={styles.profileImage}>
														<Image
															src={profileImageUrl}
															alt={`Chat ${caller.chat.name}`}
															width={38}
															height={38}
															className={styles.avatar}
															onError={(e) => {
																const target = e.target as HTMLImageElement;
																target.src = "/assets/KiFi_LOGO.jpg";
															}}
														/>
													</div>
													<div className={styles.nameText}>{caller.chat.name}</div>
												</td>
												<td className={styles.timestampColumn}>{latestMessage ? <span className={styles.timestamp}>{formatTimestamp(new Date(latestMessage.createdAt).getTime(), false, true)}</span> : "-"}</td>
												<td className={styles.callColumn}>{caller.callCount}</td>
												<td className={styles.messageCell}>{caller.messages.length ? <div className={styles.viewButton}>{expandedCallerId === chatId ? "Hide" : "View"}</div> : "None"}</td>
											</tr>
											{expandedCallerId === chatId && caller.messages.length > 0 && (
												<tr className={`${styles.messageRow} ${closingCallerId === chatId ? styles.closing : ""}`} data-caller-id={chatId}>
													<td colSpan={4}>
														{(() => {
															const totalPages = Math.ceil(caller.messages.length / MESSAGES_PER_PAGE);
															const currentPageIndex = currentPage[chatId] || 0;
															const startIndex = currentPageIndex * MESSAGES_PER_PAGE;
															const visibleMessages = caller.messages.slice(startIndex, startIndex + MESSAGES_PER_PAGE);

															return (
																<div className={styles.messageContentWrapper}>
																	{totalPages > 1 && (
																		<div className={styles.paginationControls}>
																			<button
																				onClick={(e) => {
																					e.stopPropagation();
																					handlePageChange(chatId, currentPageIndex - 1, totalPages);
																				}}
																				disabled={currentPageIndex === 0}
																				className={styles.pageButton}
																				title="Previous message"
																			>
																				<FaChevronLeft />
																			</button>
																			<span className={styles.pageInfo}>
																				Message {currentPageIndex + 1} of {totalPages}
																			</span>
																			<button
																				onClick={(e) => {
																					e.stopPropagation();
																					handlePageChange(chatId, currentPageIndex + 1, totalPages);
																				}}
																				disabled={currentPageIndex === totalPages - 1}
																				className={styles.pageButton}
																				title="Next message"
																			>
																				<FaChevronRight />
																			</button>
																		</div>
																	)}
																	<div className={styles.messageContent}>
																		<div className={styles.messagesContainer}>
																			{visibleMessages.map((msg) => (
																				<div key={msg.id} className={styles.messageItem}>
																					<div>{msg.text}</div>
																					<div className={styles.messageTimestamp}>{formatTimestamp(new Date(msg.createdAt).getTime(), true, true)}</div>
																				</div>
																			))}
																		</div>
																	</div>
																</div>
															);
														})()}
													</td>
												</tr>
											)}
										</React.Fragment>
									);
								})}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
