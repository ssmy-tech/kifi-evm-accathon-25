import React, { useState, useRef, useEffect } from "react";
import { FaUsers, FaChevronLeft, FaChevronRight } from "react-icons/fa";
import styles from "./CallerFeed.module.css";
import { formatTimestamp } from "@/utils/formatters";
import Image from "next/image";
import { Caller } from "@/types/caller.types";
import { savePhoto, getAllPhotos } from "@/utils/localStorage";
import { useGetChatPhotoLazyQuery } from "@/generated/graphql";

const DEFAULT_PHOTO = "/assets/KiFi_LOGO.jpg";
const MESSAGES_PER_PAGE = 1;

interface CallerFeedProps {
	callers: Caller[];
	title?: string;
	isLoading?: boolean;
}

// Photo management types
interface PhotoState {
	url: string;
	isLoading: boolean;
	error?: string;
}

type PhotoCache = Record<string, PhotoState>;

export default function CallerFeed({ callers, title = "Token Callers", isLoading = false }: CallerFeedProps) {
	const [sortField, setSortField] = useState<"callCount" | "timestamp">("timestamp");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [expandedCallerId, setExpandedCallerId] = useState<string | null>(null);
	const [closingCallerId, setClosingCallerId] = useState<string | null>(null);
	const [currentPage, setCurrentPage] = useState<Record<string, number>>({});
	const tableContainerRef = useRef<HTMLDivElement>(null);

	// Initialize photo cache from localStorage
	const [photos, setPhotos] = useState<PhotoCache>(() => {
		try {
			const photos: PhotoCache = {};
			const cached = getAllPhotos();

			Object.entries(cached).forEach(([id, data]) => {
				if (data && typeof data.url === "string" && data.url !== "" && data.url !== "no-photo") {
					photos[id] = { url: data.url, isLoading: false };
				}
			});
			return photos;
		} catch (error) {
			console.error("Error loading photos from localStorage:", error);
			return {};
		}
	});

	// Get the chat photo query hook
	const [getChatPhoto] = useGetChatPhotoLazyQuery();

	// Fetch photos for callers
	useEffect(() => {
		if (callers && callers.length > 0) {
			callers.forEach((caller) => {
				const chatId = caller.chat.id;
				// Skip if already loading or loaded successfully
				if (photos[chatId]?.isLoading || (photos[chatId]?.url && !photos[chatId]?.error)) return;

				// Set loading state
				setPhotos((prev) => ({
					...prev,
					[chatId]: { url: DEFAULT_PHOTO, isLoading: true },
				}));

				if (caller.chat.photoUrl && caller.chat.photoUrl !== "no-photo") {
					// If caller already has a valid photo URL, use it
					setPhotos((prev) => ({
						...prev,
						[chatId]: { url: caller.chat.photoUrl, isLoading: false },
					}));
					savePhoto(chatId, caller.chat.photoUrl);
				} else {
					// Try to fetch from API
					getChatPhoto({
						variables: { chatId },
						onCompleted: (data) => {
							const photoUrl = !data.getChatPhoto || data.getChatPhoto === "no-photo" ? DEFAULT_PHOTO : data.getChatPhoto;

							setPhotos((prev) => ({
								...prev,
								[chatId]: { url: photoUrl, isLoading: false },
							}));

							if (photoUrl !== DEFAULT_PHOTO) {
								savePhoto(chatId, photoUrl);
							}
						},
						onError: (error) => {
							console.error("Error fetching chat photo:", error);
							setPhotos((prev) => ({
								...prev,
								[chatId]: { url: DEFAULT_PHOTO, isLoading: false, error: "Failed to load" },
							}));
						},
					});
				}
			});
		}
	}, [callers, photos, getChatPhoto]);

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
									const photo = photos[chatId] || { url: DEFAULT_PHOTO, isLoading: false };
									const latestMessage = caller.messages[0];

									return (
										<React.Fragment key={chatId}>
											<tr className={`${styles.callerRow} ${caller.messages.length ? styles.hasMessage : ""}`} onClick={() => caller.messages.length && toggleExpandCaller(chatId)} style={caller.messages.length ? { cursor: "pointer" } : {}}>
												<td className={styles.nameColumn}>
													<div className={styles.profileImage}>
														<Image
															src={photo.url}
															alt={`Chat ${caller.chat.name}`}
															width={38}
															height={38}
															className={styles.avatar}
															onError={(e) => {
																const target = e.target as HTMLImageElement;
																target.src = DEFAULT_PHOTO;
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
