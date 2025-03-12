import React, { useState, useRef, useEffect } from "react";
import { FaUsers } from "react-icons/fa";
import styles from "./CallerFeed.module.css";
import { formatCurrency, formatTimestamp } from "@/utils/formatters";
import Image from "next/image";
import { savePhoto, getAllPhotos } from "@/utils/localStorage";
import { useGetChatPhotoLazyQuery } from "@/generated/graphql";
import { CallContextChat } from "./CallContextChat";
import { TokenWithDexInfo } from "@/types/token.types";
import { useChain } from "@/contexts/ChainContext";

const DEFAULT_PHOTO = "/assets/KiFi_LOGO.jpg";

interface CallerFeedProps {
	token: TokenWithDexInfo;
}

// Photo management types
interface PhotoState {
	url: string;
	isLoading: boolean;
	error?: string;
}

type PhotoCache = Record<string, PhotoState>;

// Historical market data types
interface MarketData {
	time: number;
	open: number;
	high: number;
	low: number;
	close: number;
	volume: number;
}

interface CallerMarketData {
	callerId: string;
	marketCap: number;
}

export default function CallerFeed({ token }: CallerFeedProps) {
	const [sortField, setSortField] = useState<"callCount" | "timestamp">("timestamp");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
	const [expandedCallerId, setExpandedCallerId] = useState<string | null>(null);
	const [closingCallerId, setClosingCallerId] = useState<string | null>(null);
	const tableContainerRef = useRef<HTMLDivElement>(null);
	const { currentChain } = useChain();

	const callers = token.callers;

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

	// Historical market data state
	const [callerMarketData, setCallerMarketData] = useState<CallerMarketData[]>([]);
	const [isLoadingMarketData, setIsLoadingMarketData] = useState(false);

	// Fetch historical market data
	useEffect(() => {
		async function fetchHistoricalData() {
			if (!token.id || !currentChain.id || !callers.length) return;

			setIsLoadingMarketData(true);
			try {
				// Get the earliest caller timestamp
				const earliestTimestamp = Math.min(...callers.map((caller) => new Date(caller.messages[0]?.createdAt || Date.now()).getTime()));

				const response = await fetch(`https://api.mobula.io/api/1/market/history/pair?blockchain=${currentChain.id}&from=${Math.floor(earliestTimestamp / 1000)}&period=1m&amount=5000&asset=${token.id}`);
				const data = await response.json();

				if (data.data && Array.isArray(data.data)) {
					// Calculate market cap for each caller at their timestamp
					const callerData = callers.map((caller) => {
						const callTimestamp = new Date(caller.messages[0]?.createdAt || Date.now()).getTime();
						const closestDataPoint = data.data.reduce((prev: MarketData, curr: MarketData) => {
							return Math.abs(curr.time - callTimestamp) < Math.abs(prev.time - callTimestamp) ? curr : prev;
						});

						// Calculate market cap at time of call using price ratio
						const priceRatio = closestDataPoint.close / token.price;
						return {
							callerId: caller.id,
							marketCap: priceRatio * token.marketCap,
						};
					});

					setCallerMarketData(callerData);
				}
			} catch (error) {
				console.error("Error fetching historical market data:", error);
			} finally {
				setIsLoadingMarketData(false);
			}
		}

		fetchHistoricalData();
	}, [token.id, currentChain.id, callers, token.marketCap, token.price]);

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
			{isLoadingMarketData ? (
				<div className={styles.loadingOverlay}>
					<div className={styles.loadingSpinner}></div>
					Loading caller data...
				</div>
			) : (
				<>
					<h2 className={styles.title}>
						<FaUsers className={styles.titleIcon} />
						Caller Feed ({callers?.length})
					</h2>
					<div className={styles.scrollContainer}>
						{sortedCallers.length === 0 ? (
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
														<td className={styles.mcapColumn}>{callerMarketData.find((data) => data.callerId === caller.id)?.marketCap ? formatCurrency(callerMarketData.find((data) => data.callerId === caller.id)?.marketCap || 0) : "-"}</td>
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
				</>
			)}
		</div>
	);
}
