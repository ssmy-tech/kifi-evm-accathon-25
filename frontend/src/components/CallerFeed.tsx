import React, { useState, useRef, useEffect } from "react";
import { FaUsers } from "react-icons/fa";
import styles from "./CallerFeed.module.css";
import { formatCurrency, formatTimestamp } from "@/utils/formatters";
import Image from "next/image";
import { Caller } from "@/types/caller.types";
import { savePhoto, getAllPhotos } from "@/utils/localStorage";
import { useGetChatPhotoLazyQuery } from "@/generated/graphql";
import { CallContextChat } from "./CallContextChat";

const DEFAULT_PHOTO = "/assets/KiFi_LOGO.jpg";

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
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [expandedCallerId, setExpandedCallerId] = useState<string | null>(null);
	const [closingCallerId, setClosingCallerId] = useState<string | null>(null);
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
			return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
		}

		// Sort by callCount
		return sortDirection === "desc" ? b.callCount - a.callCount : a.callCount - b.callCount;
	});

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
									<th className={`${styles.sortable} ${styles.mcapColumn}`}>MCAP Called</th>
									<th className={`${styles.sortable} ${styles.messageHeader}`}>Message(s)</th>
								</tr>
							</thead>
							<tbody className={styles.tableBody}>
								{sortedCallers.map((caller) => {
									const chatId = caller.chat.id;
									const photo = photos[chatId] || { url: DEFAULT_PHOTO, isLoading: false };
									const firstCall = caller.messages.filter((msg) => msg.messageType === "Call").sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())[0];
									const contextMessages = caller.messages;
									const mcapCalled = formatCurrency(1800000);

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
												<td className={styles.timestampColumn}>{firstCall ? <span className={styles.timestamp}>{formatTimestamp(new Date(firstCall.createdAt).getTime(), false, true)}</span> : "-"}</td>

												<td className={styles.mcapColumn}>{mcapCalled}</td>
												<td className={styles.messageCell}>{caller.messages.length ? <div className={styles.viewButton}>{expandedCallerId === chatId ? "Hide" : "View"}</div> : "None"}</td>
											</tr>
											{expandedCallerId === chatId && caller.messages.length > 0 && (
												<tr className={`${styles.messageRow} ${closingCallerId === chatId ? styles.closing : ""}`} data-caller-id={chatId}>
													<td colSpan={4}>
														{(() => {
															return (
																<div className={styles.messageContentWrapper}>
																	<CallContextChat messages={contextMessages} />
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
