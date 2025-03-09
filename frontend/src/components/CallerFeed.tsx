import React, { useState, useRef, useEffect } from "react";
import { FaUsers } from "react-icons/fa";
import styles from "./CallerFeed.module.css";
import { formatTimestamp } from "@/utils/formatters";
import Image from "next/image";
import { Caller } from "@/types/caller.types";
import { saveCallerPhoto, getCallerPhoto } from "@/utils/localStorage";
import { useGetChatPhotoLazyQuery } from "@/generated/graphql";

// Storage key for caller photos in CallerFeed
const CALLER_FEED_PHOTOS_KEY = "caller-feed-photos";

interface CallerFeedProps {
	callers: Caller[];
	title?: string;
	isLoading?: boolean;
}

export default function CallerFeed({ callers, title = "Token Callers", isLoading = false }: CallerFeedProps) {
	const [sortField, setSortField] = useState<keyof Caller>("timestamp");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [expandedCallerId, setExpandedCallerId] = useState<string | null>(null);
	const [closingCallerId, setClosingCallerId] = useState<string | null>(null);
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
				// Only fetch if we don't already have the photo in local state
				if (!callerPhotos[caller.id]) {
					// First try to get from global caller photos cache
					const cachedPhoto = getCallerPhoto(caller.id);

					if (cachedPhoto) {
						// If found in global cache, use it and update local state
						setCallerPhotos((prev) => ({
							...prev,
							[caller.id]: cachedPhoto,
						}));
					} else if (caller.profileImageUrl === "/assets/KiFi_LOGO.jpg") {
						// If using default image, try to fetch from API
						getChatPhoto({
							variables: { chatId: caller.id },
							onCompleted: (data) => {
								if (data.getChatPhoto) {
									const photoUrl = data.getChatPhoto === "no-photo" || !data.getChatPhoto ? "/assets/KiFi_LOGO.jpg" : data.getChatPhoto;

									// Update local state
									setCallerPhotos((prev) => ({
										...prev,
										[caller.id]: photoUrl,
									}));

									// Also save to global cache if it's not the default image
									if (photoUrl !== "/assets/KiFi_LOGO.jpg") {
										saveCallerPhoto(caller.id, photoUrl);
									}
								}
							},
							onError: (error) => {
								console.error("Error fetching chat photo:", error);
								// Set default image on error
								setCallerPhotos((prev) => ({
									...prev,
									[caller.id]: "/assets/KiFi_LOGO.jpg",
								}));
							},
						});
					} else if (caller.profileImageUrl && caller.profileImageUrl !== "/assets/KiFi_LOGO.jpg") {
						// If caller already has a non-default photo, save it to both caches
						setCallerPhotos((prev) => ({
							...prev,
							[caller.id]: caller.profileImageUrl,
						}));
						saveCallerPhoto(caller.id, caller.profileImageUrl);
					}
				}
			});
		}
	}, [callers, getChatPhoto, callerPhotos]);

	const handleSort = (field: keyof Caller) => {
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
		// Special case for message field - sort by presence of message first, then by timestamp
		if (sortField === "message") {
			// If one has a message and the other doesn't
			if (Boolean(a.message) !== Boolean(b.message)) {
				// If descending, messages first; if ascending, non-messages first
				return sortDirection === "desc" ? (a.message ? -1 : 1) : a.message ? 1 : -1;
			}

			// If both have messages or both don't, sort by timestamp as secondary criteria
			const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
			const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
			return sortDirection === "desc" ? aTime - bTime : bTime - aTime;
		}

		const aValue = a[sortField];
		const bValue = b[sortField];

		if (!aValue && !bValue) return 0;
		if (!aValue) return sortDirection === "asc" ? -1 : 1;
		if (!bValue) return sortDirection === "asc" ? 1 : -1;

		if (typeof aValue === "number" && typeof bValue === "number") {
			return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
		}

		const aString = String(aValue);
		const bString = String(bValue);
		return sortDirection === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString);
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
									<th className={styles.imageHeader}></th>
									{callers?.some((caller) => caller.name) && (
										<th onClick={() => handleSort("name")} className={`${styles.sortable} ${styles.nameColumn}`}>
											Caller
											{sortField === "name" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
									{callers?.some((caller) => caller.timestamp) && (
										<th onClick={() => handleSort("timestamp")} className={`${styles.sortable} ${styles.timestampColumn}`}>
											Timestamp
											{sortField === "timestamp" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
									{callers?.some((caller) => caller.winRate !== undefined) && (
										<th onClick={() => handleSort("winRate")} className={`${styles.sortable} ${styles.rateColumn}`}>
											Win Rate
											{sortField === "winRate" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
									{callers?.some((caller) => caller.message) && (
										<th onClick={() => handleSort("message")} className={`${styles.sortable} ${styles.messageHeader}`}>
											Message(s)
											{sortField === "message" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
								</tr>
							</thead>
							<tbody className={styles.tableBody}>
								{sortedCallers.map((caller) => {
									// Get the best available photo for this caller
									// Priority: 1. Local cache, 2. Caller object, 3. Global cache, 4. Default
									const profileImageUrl = callerPhotos[caller.id] || (caller.profileImageUrl !== "/assets/KiFi_LOGO.jpg" ? caller.profileImageUrl : getCallerPhoto(caller.id) || "/assets/KiFi_LOGO.jpg");

									return (
										<React.Fragment key={caller.id}>
											<tr className={`${styles.callerRow} ${caller.message ? styles.hasMessage : ""}`} onClick={() => caller.message && toggleExpandCaller(caller.id)} style={caller.message ? { cursor: "pointer" } : {}}>
												<td className={styles.imageCell}>
													<div className={styles.profileImage}>
														<Image
															src={profileImageUrl}
															alt={`Caller ${caller.id}`}
															width={32}
															height={32}
															className={styles.avatar}
															onError={(e) => {
																// Fallback to default image if the profile image fails to load
																const target = e.target as HTMLImageElement;
																target.src = "/assets/KiFi_LOGO.jpg";
															}}
														/>
													</div>
												</td>
												{callers?.some((caller) => caller.name) && <td className={styles.nameColumn}>{caller.name || "-"}</td>}
												{callers?.some((caller) => caller.timestamp) && <td className={styles.timestampColumn}>{caller.timestamp ? <span className={styles.timestamp}>{formatTimestamp(caller.timestamp, false, true)}</span> : "-"}</td>}
												{callers?.some((caller) => caller.winRate !== undefined) && <td className={styles.rateColumn}>{caller.winRate !== undefined ? `${caller.winRate}%` : "-"}</td>}
												{callers?.some((caller) => caller.message) && <td className={styles.messageCell}>{caller.message ? <div className={styles.viewButton}>{expandedCallerId === caller.id ? "Hide" : "View"}</div> : "None"}</td>}
											</tr>
											{expandedCallerId === caller.id && caller.message && (
												<tr className={`${styles.messageRow} ${closingCallerId === caller.id ? styles.closing : ""}`} data-caller-id={caller.id}>
													<td colSpan={5}>
														<div className={styles.messageContentWrapper}>
															<div className={styles.messageContent}>{caller.message}</div>
														</div>
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
