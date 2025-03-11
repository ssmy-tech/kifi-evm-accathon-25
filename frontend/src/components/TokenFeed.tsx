"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import styles from "./TokenFeed.module.css";
import { FaTelegramPlane, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { formatCurrency, formatPercentage, abbreviateAge } from "../utils/formatters";
import { SortField, SortDirection, TokenWithDexInfo } from "../types/token.types";
import { TradingView } from "./TradingView";
import CallerFeed from "./CallerFeed";
import TwitterSentiment from "./TwitterSentiment";
import TelegramSentiment from "./TelegramSentiment";
import TradeModule from "./TradeModule";

import { useGetCallsByTokenQuery, useGetChatPhotoLazyQuery } from "@/generated/graphql";
import { GetCallsByTokenQuery } from "@/generated/graphql";
import { savePhoto, getAllPhotos } from "../utils/localStorage";

const TOKENS_PER_PAGE = 50;
const LOAD_MORE_COOLDOWN = 5000;
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

const TokenFeed: React.FC = () => {
	const [sortField, setSortField] = useState<SortField>("callers");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [sortedTokens, setSortedTokens] = useState<TokenWithDexInfo[]>([]);
	const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
	const [closingTokenId, setClosingTokenId] = useState<string | null>(null);
	const [processedTokens, setProcessedTokens] = useState<TokenWithDexInfo[]>([]);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);
	const [isLoadingMore, setIsLoadingMore] = useState(false);
	const [isLoadingCooldown, setIsLoadingCooldown] = useState(false);
	const observerTarget = useRef<HTMLDivElement>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);
	const [photos, setPhotos] = useState<PhotoCache>(photoCache.get());
	const [tokenCallsData, setTokenCallsData] = useState<NonNullable<GetCallsByTokenQuery["getCallsByToken"]>["tokenCalls"]>([]);
	const processedDataRef = useRef(false);

	const { data: callsByTokenData, loading: callsByTokenLoading } = useGetCallsByTokenQuery({});
	const [getChatPhoto] = useGetChatPhotoLazyQuery();

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

	// Process token calls data once when it's available
	useEffect(() => {
		if (callsByTokenData?.getCallsByToken?.tokenCalls && !processedDataRef.current) {
			const tokenCalls = callsByTokenData.getCallsByToken.tokenCalls;
			setTokenCallsData(tokenCalls);
			processedDataRef.current = true;

			// Process photos in one pass
			const chatIdsToFetch = new Set<string>();
			const chatMap = new Map<string, { chat: (typeof tokenCalls)[0]["calls"][0]["chat"] }>();

			tokenCalls.forEach((tokenCall) => {
				tokenCall.calls.forEach((call) => {
					if (!photos[call.chat.id] || photos[call.chat.id]?.error) {
						chatIdsToFetch.add(call.chat.id);
						chatMap.set(call.chat.id, { chat: call.chat });
					}
				});
			});

			// Fetch photos in batches
			Array.from(chatIdsToFetch).forEach((chatId) => {
				const chatData = chatMap.get(chatId);
				if (chatData) {
					fetchPhoto(chatId, chatData.chat.photoUrl);
				}
			});
		}
	}, [callsByTokenData, photos, fetchPhoto]);

	// Intersection Observer for infinite scroll
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries: IntersectionObserverEntry[]) => {
				if (entries[0].isIntersecting && hasMore && !isLoadingMore && !isLoadingCooldown) {
					setPage((prevPage) => prevPage + 1);
					setIsLoadingCooldown(true);
					setTimeout(() => {
						setIsLoadingCooldown(false);
					}, LOAD_MORE_COOLDOWN);
				}
			},
			{ threshold: 0.1 }
		);

		const currentTarget = observerTarget.current;
		if (currentTarget) {
			observer.observe(currentTarget);
		}

		return () => {
			if (currentTarget) {
				observer.unobserve(currentTarget);
			}
		};
	}, [hasMore, isLoadingMore, isLoadingCooldown]);

	useEffect(() => {
		if (tokenCallsData.length > 0) {
			const fetchTokenInfo = async () => {
				setIsLoadingMore(true);

				// Sort token calls by call count before processing
				const sortedTokenCalls = [...tokenCallsData].sort((a, b) => {
					const aCallCount = a.calls.reduce((sum: number, call) => sum + call.callCount, 0);
					const bCallCount = b.calls.reduce((sum: number, call) => sum + call.callCount, 0);
					return bCallCount - aCallCount;
				});

				// Calculate start and end indices for the current page
				const startIndex = 0;
				const endIndex = page * TOKENS_PER_PAGE;
				const currentPageTokenCalls = sortedTokenCalls.slice(startIndex, endIndex);

				const dexDataTokens = await Promise.all(
					currentPageTokenCalls.map(async (tokenCall) => {
						const address = tokenCall.address;
						let dexAPI = "";

						switch (tokenCall.chain) {
							case "SOLANA":
								dexAPI = `https://api.dexscreener.com/tokens/v1/solana/${address}`;
								break;
							case "ETH":
								dexAPI = `https://api.dexscreener.com/tokens/v1/ethereum/${address}`;
								break;
							default:
								return null;
						}

						try {
							const response = await fetch(dexAPI);
							const data = await response.json();
							// console.log("DexScreener data:", data);

							if (data) {
								const dexData = data[0];

								if (!dexData?.baseToken) {
									return null;
								}

								// Check liquidity threshold
								const liquidity = dexData.liquidity?.usd || 0;
								if (liquidity < 1000) {
									return null;
								}

								// Only use the date if it's valid, otherwise omit it
								let validCreatedAt: string | undefined;
								if (dexData.pairCreatedAt) {
									const pairCreatedAt = new Date(dexData.pairCreatedAt);
									if (!isNaN(pairCreatedAt.getTime())) {
										validCreatedAt = pairCreatedAt.toISOString();
									} else {
										return null;
									}
								}

								// Create a token object from the DexScreener data
								const token: TokenWithDexInfo = {
									id: dexData.baseToken.address,
									name: dexData.baseToken.name,
									ticker: dexData.baseToken.symbol,
									price: parseFloat(dexData.priceUsd),
									marketCap: dexData.marketCap,
									change24h: dexData.priceChange.h24,
									volume: dexData.volume.h24,
									liquidity: dexData.liquidity?.usd || 0,
									imageUrl: dexData.info?.imageUrl || "/assets/coin.png",
									createdAt: validCreatedAt || "",
									callers: tokenCall.calls.map((call) => {
										const photo = photos[call.chat.id];
										const profileImageUrl = photo?.url || DEFAULT_PHOTO;
										return {
											id: call.chat.id,
											name: call.chat.name,
											profileImageUrl,
											timestamp: Date.now(),
											callCount: call.callCount,
											winRate: 0,
											chat: {
												...call.chat,
												type: call.chat.type as "Group" | "Channel" | "Private",
												photoUrl: profileImageUrl,
											},
											messages:
												call.messages?.map((msg) => ({
													id: msg.id,
													createdAt: msg.createdAt ? new Date(msg.createdAt).toISOString() : new Date().toISOString(),
													text: msg.text || "",
													fromId: msg.fromId || null,
												})) || [],
										};
									}),
									tokenCallsData: tokenCall,
									dexData,
								};

								return token;
							}

							return null;
						} catch (error) {
							console.error("Error fetching token data:", error);
							return null;
						}
					})
				);

				// Filter out null values
				const validTokens = dexDataTokens.filter((token): token is NonNullable<typeof token> => token !== null) as TokenWithDexInfo[];

				// Update hasMore based on whether we've loaded all tokens
				setHasMore(validTokens.length < sortedTokenCalls.length);

				setIsLoadingMore(false);
				setProcessedTokens(validTokens);
			};

			fetchTokenInfo();
		}
	}, [tokenCallsData, photos, page]);

	useEffect(() => {
		// Sort the processed tokens
		if (processedTokens.length > 0) {
			const sortedTokens = [...processedTokens].sort((a, b) => {
				let comparison = 0;

				switch (sortField) {
					case "age":
						const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
						const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
						comparison = dateA - dateB;
						break;
					case "name":
						comparison = a.name.localeCompare(b.name);
						break;
					case "price":
						comparison = a.price - b.price;
						break;
					case "liquidity":
						comparison = (a.liquidity || 0) - (b.liquidity || 0);
						break;
					case "marketCap":
						comparison = a.marketCap - b.marketCap;
						break;
					case "change24h":
						comparison = a.change24h - b.change24h;
						break;
					case "volume":
						comparison = (a.volume || 0) - (b.volume || 0);
						break;
					case "callers":
						const aCallers = a.callers?.length || 0;
						const bCallers = b.callers?.length || 0;
						comparison = aCallers - bCallers;
						// If caller counts are equal, use volume as tiebreaker
						if (comparison === 0) {
							const aVolume = a.dexData?.volume?.h24 || a.volume || 0;
							const bVolume = b.dexData?.volume?.h24 || b.volume || 0;
							comparison = aVolume - bVolume;
						}
						break;
					case "createdAt":
						const createdA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
						const createdB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
						comparison = createdA - createdB;
						break;
					default:
						return 0;
				}

				return sortDirection === "asc" ? comparison : -comparison;
			});

			setSortedTokens(sortedTokens);
		}
	}, [sortField, sortDirection, processedTokens]);

	const handleSort = (field: SortField) => {
		if (field === sortField) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			if (field === "name" || field === "age") {
				setSortDirection("asc");
			} else {
				setSortDirection("desc");
			}
		}
	};

	const getSortIcon = (field: SortField) => {
		if (field !== sortField) return <FaSort className={styles.sortIcon} />;
		return sortDirection === "asc" ? <FaSortUp className={styles.sortIcon} /> : <FaSortDown className={styles.sortIcon} />;
	};

	const handleRowClick = (tokenId: string) => {
		if (expandedTokenId === tokenId) {
			// Start closing animation
			setClosingTokenId(tokenId);

			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			timeoutRef.current = setTimeout(() => {
				setExpandedTokenId(null);
				setClosingTokenId(null);
			}, 200);
		} else {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}

			if (closingTokenId) {
				setClosingTokenId(null);
			}

			setExpandedTokenId(tokenId);
		}
	};

	// Clean up timeout on unmount
	useEffect(() => {
		return () => {
			if (timeoutRef.current) {
				clearTimeout(timeoutRef.current);
			}
		};
	}, []);

	// Loading state component moved to the return statement
	return (
		<div className={styles.container}>
			<div className={styles.tableContainer}>
				{(callsByTokenLoading || (!callsByTokenData && !processedTokens.length) || isLoadingMore) && !sortedTokens.length ? (
					<div className={styles.initialLoading}>
						<div className={styles.loadingSpinner}></div>
						<p>Loading tokens...</p>
					</div>
				) : (
					<>
						<table className={styles.tokenTable}>
							<thead>
								<tr className={styles.tableHeader}>
									<th className={` ${styles.headerCell} ${styles.narrowColumn} ${styles.centerHeader}`}>Rank</th>
									<th className={` ${styles.headerCell} ${styles.wideColumn} ${styles.leftAligned}`}>
										<div onClick={() => handleSort("name")} className={styles.sortableHeader}>
											Token {getSortIcon("name")}
										</div>
									</th>
									<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
										<div onClick={() => handleSort("age")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
											Age {getSortIcon("age")}
										</div>
									</th>
									<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
										<div onClick={() => handleSort("price")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
											Price {getSortIcon("price")}
										</div>
									</th>
									<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
										<div onClick={() => handleSort("liquidity")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
											Liquidity {getSortIcon("liquidity")}
										</div>
									</th>
									<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
										<div onClick={() => handleSort("volume")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
											Volume {getSortIcon("volume")}
										</div>
									</th>
									<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
										<div onClick={() => handleSort("marketCap")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
											Market Cap {getSortIcon("marketCap")}
										</div>
									</th>
									<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
										<div onClick={() => handleSort("change24h")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
											24H % {getSortIcon("change24h")}
										</div>
									</th>
									<th className={`${styles.headerCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.callersGroup}`}>
										<div onClick={() => handleSort("callers")} className={styles.sortableHeader}>
											<div className={styles.callersHeader}>
												<FaTelegramPlane className={styles.telegramIcon} />
												<span>Callers {getSortIcon("callers")}</span>
											</div>
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								{sortedTokens.map((token, index) => (
									<React.Fragment key={token.id}>
										<tr className={`${styles.tokenRow} ${expandedTokenId === token.id ? styles.expanded : ""}`} onClick={() => handleRowClick(token.id)}>
											<td className={`${styles.cell} ${styles.indexCell} ${styles.narrowColumn} ${styles.centerAligned}`}>{index + 1}</td>
											<td className={`${styles.cell} ${styles.tokenCell} ${styles.wideColumn} ${styles.leftAligned}`}>
												<div className={styles.tokenInfo}>
													<div className={styles.imageContainer}>
														<Image
															src={token.dexData?.info?.imageUrl || token.imageUrl}
															alt={token.name}
															width={42}
															height={42}
															className={styles.tokenImage}
															onError={(e) => {
																// Fallback to default image if the token image fails to load
																const target = e.target as HTMLImageElement;
																target.src = "/assets/coin.png";
															}}
														/>
													</div>
													<div className={styles.nameContainer}>
														<div className={styles.tokenName}>{token.dexData ? token.dexData.baseToken.name : token.name}</div>
														<div className={styles.tokenTicker}>{token.dexData ? token.dexData.baseToken.symbol : token.ticker}</div>
													</div>
												</div>
											</td>
											<td className={`${styles.cell}  ${styles.regularColumn} ${styles.metricsGroup}`}>{token.dexData ? abbreviateAge(new Date(token.dexData.pairCreatedAt).toISOString()) : abbreviateAge(token.createdAt)}</td>
											<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{token.dexData ? formatCurrency(parseFloat(token.dexData.priceUsd), 10, true) : formatCurrency(token.price, 10, true)}</td>
											<td className={`${styles.cell}  ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.liquidity || 0)}</td>
											<td className={`${styles.cell}  ${styles.regularColumn} ${styles.metricsGroup}`}>{token.dexData ? formatCurrency(token.dexData.volume.h24) : token.volume ? formatCurrency(token.volume) : "-"}</td>
											<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{token.dexData ? formatCurrency(token.dexData.marketCap) : formatCurrency(token.marketCap)}</td>
											<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup} ${token.dexData ? (token.dexData.priceChange.h24 >= 0 ? styles.positive : styles.negative) : token.change24h >= 0 ? styles.positive : styles.negative}`}>
												{token.dexData ? (token.dexData.priceChange.h24 >= 0 ? "+" : "") : token.change24h >= 0 ? "+" : ""}
												{token.dexData ? formatPercentage(token.dexData.priceChange.h24) : formatPercentage(token.change24h)}
											</td>
											<td className={`${styles.cell} ${styles.callersCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.callersGroup}`}>
												<div className={styles.callersContainer}>
													{token.callers && token.callers.length > 0 ? (
														<>
															{token.callers.slice(0, 5).map((caller, i) => (
																<div key={caller.id} className={styles.callerImageWrapper} style={{ zIndex: 5 - i }}>
																	<Image
																		src={caller.profileImageUrl}
																		alt={caller.name || "Caller"}
																		width={42}
																		height={42}
																		className={styles.callerImage}
																		onError={(e) => {
																			// Fallback to default image if the profile image fails to load
																			const target = e.target as HTMLImageElement;
																			target.src = "/assets/KiFi_LOGO.jpg";
																		}}
																	/>
																</div>
															))}
															{token.callers.length > 5 && <div className={styles.extraCallersCount}>+{token.callers.length - 5}</div>}
														</>
													) : (
														<span className={styles.noCallers}>-</span>
													)}
												</div>
											</td>
										</tr>
										{(expandedTokenId === token.id || closingTokenId === token.id) && (
											<tr className={`${styles.expandedContent} ${closingTokenId === token.id ? styles.closing : ""}`}>
												<td colSpan={9}>
													<div className={`${styles.expandedModules} ${closingTokenId === token.id ? styles.closing : ""}`}>
														<div className={styles.moduleRow}>
															<div className={`${styles.module} ${closingTokenId === token.id ? styles.closing : ""}`}>
																<TradingView symbol={token.dexData ? `${token.dexData.baseToken.symbol}USD` : `${token.ticker}USD`} />
															</div>
															<div className={`${styles.module} ${closingTokenId === token.id ? styles.closing : ""}`}>
																<CallerFeed callers={token.callers || []} />
															</div>
															<div className={`${styles.module} ${closingTokenId === token.id ? styles.closing : ""}`}>
																<TradeModule />
															</div>
														</div>
														<div className={styles.moduleRow}>
															<div className={`${styles.module} ${styles.wideModule} ${closingTokenId === token.id ? styles.closing : ""}`}>
																<TwitterSentiment contractAddress={token.id} />
															</div>
															<div className={`${styles.module} ${closingTokenId === token.id ? styles.closing : ""}`}>
																<TelegramSentiment contractAddress={token.id} />
															</div>
														</div>
													</div>
												</td>
											</tr>
										)}
									</React.Fragment>
								))}
							</tbody>
						</table>
						{/* Loading indicator and intersection observer target */}
						{hasMore && (
							<div ref={observerTarget} className={styles.loadingTrigger}>
								{isLoadingMore ? (
									<div className={styles.loadingMore}>
										<div className={styles.loadingSpinner}></div>
										<p>Loading more tokens...</p>
									</div>
								) : isLoadingCooldown ? (
									<div className={styles.loadingMore}>
										<p>Please wait...</p>
									</div>
								) : null}
							</div>
						)}
					</>
				)}
			</div>
		</div>
	);
};

export default TokenFeed;
