import React, { useState, useRef, useEffect, memo, useMemo } from "react";
import { FaUsers } from "react-icons/fa";
import styles from "./CallerFeed.module.css";
import { formatCurrency, formatTimestamp } from "@/utils/formatters";
import Image from "next/image";
import { getAllPhotos } from "@/utils/localStorage";
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

// Helper function to transform Kuru API candlestick data
function transformCandlestickData(data: { t: number[]; o: number[]; h: number[]; l: number[]; c: number[]; v: number[] }): MarketData[] {
	return data.t.map((time, index) => ({
		time: time * 1000, // Convert to milliseconds
		open: data.o[index],
		high: data.h[index],
		low: data.l[index],
		close: data.c[index],
		volume: data.v[index],
	}));
}

// Helper function to check if callers have actually changed
function areCallersEqual(prevCallers: TokenWithDexInfo["callers"] = [], nextCallers: TokenWithDexInfo["callers"] = []): boolean {
	if (prevCallers?.length !== nextCallers?.length) return false;

	const prevCallerIds = new Set(prevCallers?.map((c) => c.chat?.id));
	const nextCallerIds = new Set(nextCallers?.map((c) => c.chat?.id));

	if (prevCallerIds.size !== nextCallerIds.size) return false;

	return Array.from(prevCallerIds).every((id) => nextCallerIds.has(id));
}

// Memoize the component with custom equality check
const CallerFeed = memo(
	function CallerFeed({ token }: CallerFeedProps) {
		const [sortField, setSortField] = useState<"callCount" | "timestamp">("timestamp");
		const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
		const [expandedCallerId, setExpandedCallerId] = useState<string | null>(null);
		const [closingCallerId, setClosingCallerId] = useState<string | null>(null);
		const tableContainerRef = useRef<HTMLDivElement>(null);
		const { currentChain } = useChain();

		// Memoize callers to prevent unnecessary re-renders
		const callers = useMemo(() => token.callers || [], [token.callers]);

		// Initialize photo cache from localStorage
		const [photos] = useState<PhotoCache>(() => {
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

		// Memoize the market data fetch function
		const fetchHistoricalData = useMemo(
			() => async () => {
				if (!token.id || !currentChain.id || !callers.length) return;

				setIsLoadingMarketData(true);
				try {
					// Get the earliest caller timestamp
					const earliestTimestamp = Math.min(...callers.map((caller) => new Date(caller.messages[0]?.createdAt || Date.now()).getTime()));

					let historicalData;

					if (currentChain.name === "Monad") {
						const response = await fetch(`https://api.kuru.io/api/v1/${token.pair}/trades/history?countback=10000&from=${Math.floor(earliestTimestamp / 1000)}&to=${Math.floor(Date.now() / 1000)}&resolution=1m`);
						const responseData = await response.json();

						if (responseData.s === "ok") {
							historicalData = transformCandlestickData(responseData);
						} else {
							console.error("Invalid Kuru API response:", responseData);
							return;
						}
					} else {
						const response = await fetch(`https://api.mobula.io/api/1/market/history/pair?blockchain=${currentChain.id}&from=${Math.floor(earliestTimestamp / 1000)}&period=1m&amount=5000&asset=${token.id}`);
						const data = await response.json();
						historicalData = data.data;
					}

					if (historicalData && Array.isArray(historicalData)) {
						if (historicalData.length === 0) {
							console.warn("No historical data points available");
							return;
						}

						console.log("Historical data:", historicalData.slice(0, 3), "...", historicalData.length, "total points");

						const callerData = callers.map((caller) => {
							const callTimestamp = new Date(caller.messages[0]?.createdAt || Date.now()).getTime();
							console.log("Processing caller:", caller.id, "timestamp:", new Date(callTimestamp).toISOString());

							const closestDataPoint = historicalData.reduce((prev: MarketData, curr: MarketData) => {
								const prevDiff = Math.abs(prev.time - callTimestamp);
								const currDiff = Math.abs(curr.time - callTimestamp);
								return currDiff < prevDiff ? curr : prev;
							}, historicalData[0]);

							console.log("Found closest data point:", {
								time: new Date(closestDataPoint.time).toISOString(),
								close: closestDataPoint.close,
								currentPrice: token.price,
							});

							// Ensure we're not dividing by zero
							if (!token.price || token.price === 0) {
								console.warn("Token price is zero or undefined");
								return {
									callerId: caller.id,
									marketCap: 0,
								};
							}

							const priceRatio = closestDataPoint.close / token.price;
							const calculatedMarketCap = priceRatio * token.marketCap;

							console.log("Calculated values:", {
								priceRatio,
								calculatedMarketCap,
								tokenMarketCap: token.marketCap,
							});

							return {
								callerId: caller.id,
								marketCap: calculatedMarketCap,
							};
						});

						console.log("Final caller data:", callerData);
						setCallerMarketData(callerData);
					}
				} catch (error) {
					console.error("Error fetching historical market data:", error);
				} finally {
					setIsLoadingMarketData(false);
				}
			},
			[token.id, token.pair, token.price, token.marketCap, currentChain.id, currentChain.name, callers]
		);

		// Fetch historical data only when necessary
		useEffect(() => {
			fetchHistoricalData();
		}, [fetchHistoricalData]);

		// Memoize the sorted callers
		const sortedCallers = useMemo(() => {
			return [...callers].sort((a, b) => {
				if (sortField === "timestamp") {
					const aTime = a.messages?.[0]?.createdAt ? new Date(a.messages[0].createdAt).getTime() : 0;
					const bTime = b.messages?.[0]?.createdAt ? new Date(b.messages[0].createdAt).getTime() : 0;
					return sortDirection === "asc" ? aTime - bTime : bTime - aTime;
				}
				return sortDirection === "desc" ? b.callCount - a.callCount : a.callCount - b.callCount;
			});
		}, [callers, sortField, sortDirection]);

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
	},
	(prevProps, nextProps) => {
		// Custom equality check for the memo
		if (prevProps.token.id !== nextProps.token.id) return false;
		if (prevProps.token.price !== nextProps.token.price) return false;
		if (prevProps.token.marketCap !== nextProps.token.marketCap) return false;
		if (prevProps.token.pair !== nextProps.token.pair) return false;

		// Deep compare callers
		return areCallersEqual(prevProps.token.callers, nextProps.token.callers);
	}
);

export default CallerFeed;
