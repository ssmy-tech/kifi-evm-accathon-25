"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./TokenFeed.module.css";
import { FaTelegramPlane } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency, formatPercentage, abbreviateAge } from "../utils/formatters";
import { Token, TokenFeedProps, SortField, SortDirection, TokenWithDexInfo, DexScreenerToken, DexScreenerResponse } from "../types/token.types";
import { TradingView } from "./TradingView";
import CallerFeed from "./CallerFeed";
import TwitterSentiment from "./TwitterSentiment";
import TelegramSentiment from "./TelegramSentiment";
import TradeModule from "./TradeModule";
import { saveCallerPhoto, saveCallerPhotos, getCallerPhoto, cleanupCallerPhotos, getAllCallerPhotos } from "../utils/localStorage";

import { useGetCallsByTokenQuery, useGetChatPhotoLazyQuery, GetCallsByTokenQuery } from "@/generated/graphql";

// Storage key for chat photos in TokenFeed
const CHAT_PHOTOS_STORAGE_KEY = "token-feed-chat-photos";

const TokenFeed: React.FC = () => {
	const [sortField, setSortField] = useState<SortField>("callers");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [sortedTokens, setSortedTokens] = useState<TokenWithDexInfo[]>([]);
	const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
	const [closingTokenId, setClosingTokenId] = useState<string | null>(null);
	const [processedTokens, setProcessedTokens] = useState<TokenWithDexInfo[]>([]);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	// Initialize chatPhotos from localStorage if available
	const [chatPhotos, setChatPhotos] = useState<Record<string, string>>(() => {
		const storedPhotos = localStorage.getItem(CHAT_PHOTOS_STORAGE_KEY);
		return storedPhotos ? JSON.parse(storedPhotos) : {};
	});

	const { data: callsByTokenData, loading: callsByTokenLoading, error: callsByTokenError } = useGetCallsByTokenQuery({});
	const [getChatPhoto] = useGetChatPhotoLazyQuery();

	// Save chat photos to localStorage whenever they change
	useEffect(() => {
		localStorage.setItem(CHAT_PHOTOS_STORAGE_KEY, JSON.stringify(chatPhotos));
	}, [chatPhotos]);

	// Fetch chat photos for callers
	useEffect(() => {
		if (callsByTokenData?.getCallsByToken?.tokenCalls) {
			callsByTokenData.getCallsByToken.tokenCalls.forEach((tokenCall) => {
				tokenCall.calls.forEach((call) => {
					if (!chatPhotos[call.chat.id]) {
						// First try to get from our global caller photos cache
						const cachedPhoto = getCallerPhoto(call.chat.id);

						if (cachedPhoto) {
							// If found in global cache, use it and update local state
							setChatPhotos((prev) => ({
								...prev,
								[call.chat.id]: cachedPhoto,
							}));
						} else {
							// If not in global cache, fetch from API
							getChatPhoto({
								variables: { chatId: call.chat.id },
								onCompleted: (data) => {
									if (data.getChatPhoto) {
										const photoUrl = data.getChatPhoto === "no-photo" || !data.getChatPhoto ? "/assets/KiFi_LOGO.jpg" : data.getChatPhoto;

										setChatPhotos((prev) => ({
											...prev,
											[call.chat.id]: photoUrl,
										}));

										if (photoUrl !== "/assets/KiFi_LOGO.jpg") {
											saveCallerPhoto(call.chat.id, photoUrl);
										}
									}
								},
								onError: (error) => {
									console.error("Error fetching chat photo:", error);
									// Set default image on error
									setChatPhotos((prev) => ({
										...prev,
										[call.chat.id]: "/assets/KiFi_LOGO.jpg",
									}));
								},
							});
						}
					}
				});
			});
		}
	}, [callsByTokenData, getChatPhoto, chatPhotos]);

	// Process token calls data
	useEffect(() => {
		if (callsByTokenData?.getCallsByToken?.tokenCalls) {
			const tokenCalls = callsByTokenData.getCallsByToken.tokenCalls;
			console.log("Token calls data:", tokenCalls);

			const fetchTokenInfo = async () => {
				const enrichedTokens = await Promise.all(
					tokenCalls.map(async (tokenCall) => {
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
							console.log("DexScreener data:", data);

							if (data) {
								const dexData = data[0];

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
									createdAt: new Date(dexData.pairCreatedAt).toISOString(),
									callers: tokenCall.calls.map((call) => {
										// Use the photo from chatPhotos if available, otherwise use default
										const profileImageUrl = chatPhotos[call.chat.id] || "/assets/KiFi_LOGO.jpg";

										return {
											id: call.chat.id,
											name: call.chat.name,
											profileImageUrl,
											timestamp: Date.now(),
											callCount: call.callCount,
											winRate: 0, // Default value
										};
									}),
									tokenCallsData: tokenCall,
									dexData,
									// Default sentiment values
									twitterSentiment: {
										summary: "No sentiment data available",
										sentiment: "neutral",
										count: 0,
										positiveSplit: 0,
										negativeSplit: 0,
									},
									telegramSentiment: {
										summary: "No sentiment data available",
										sentiment: "neutral",
										count: 0,
										positiveSplit: 0,
										negativeSplit: 0,
									},
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
				const validTokens = enrichedTokens.filter((token): token is NonNullable<typeof token> => token !== null) as TokenWithDexInfo[];

				// Clean up old photo entries once a day (only do this once per session)
				cleanupCallerPhotos();

				setProcessedTokens(validTokens);
			};

			fetchTokenInfo();
		}
	}, [callsByTokenData, chatPhotos]);

	useEffect(() => {
		// Sort the processed tokens
		if (processedTokens.length > 0) {
			const sortedTokens = [...processedTokens].sort((a, b) => {
				let comparison = 0;

				switch (sortField) {
					case "age":
						const dateA = new Date(a.createdAt).getTime();
						const dateB = new Date(b.createdAt).getTime();
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
						break;
					case "createdAt":
						const createdA = new Date(a.createdAt).getTime();
						const createdB = new Date(b.createdAt).getTime();
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

	const getSortIndicator = (field: SortField) => {
		if (field === sortField) {
			return sortDirection === "asc" ? "↑" : "↓";
		}
		return null;
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

	// Loading state component
	const LoadingState = () => (
		<div className={styles.loadingContainer}>
			<div className={styles.loadingSpinner}></div>
			<p className={styles.loadingText}>Loading token data...</p>
		</div>
	);

	if (callsByTokenLoading) {
		return <LoadingState />;
	}

	if (callsByTokenError) {
		console.error("Error fetching token data:", callsByTokenError);
	}

	return (
		<div className={styles.container}>
			<div className={styles.tableContainer}>
				<table className={styles.tokenTable}>
					<thead>
						<tr className={styles.tableHeader}>
							<th className={` ${styles.headerCell} ${styles.narrowColumn} ${styles.centerAligned}`}>Rank</th>
							<th className={` ${styles.headerCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.sortableHeader}`} onClick={() => handleSort("name")}>
								Token {getSortIndicator("name")}
							</th>
							<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup} ${styles.sortableHeader}`} onClick={() => handleSort("age")}>
								Age {getSortIndicator("age")}
							</th>
							<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup} ${styles.sortableHeader}`} onClick={() => handleSort("price")}>
								Price {getSortIndicator("price")}
							</th>
							<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup} ${styles.sortableHeader}`} onClick={() => handleSort("liquidity")}>
								Liquidity {getSortIndicator("liquidity")}
							</th>
							<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup} ${styles.sortableHeader}`} onClick={() => handleSort("volume")}>
								Volume {getSortIndicator("volume")}
							</th>
							<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup} ${styles.sortableHeader}`} onClick={() => handleSort("marketCap")}>
								Market Cap {getSortIndicator("marketCap")}
							</th>
							<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup} ${styles.sortableHeader}`} onClick={() => handleSort("change24h")}>
								24H % {getSortIndicator("change24h")}
							</th>
							<th className={`${styles.headerCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.callersGroup} ${styles.sortableHeader}`} onClick={() => handleSort("callers")}>
								<div className={styles.callersHeader}>
									<FaTelegramPlane className={styles.telegramIcon} />
									<span>Callers {getSortIndicator("callers")}</span>
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
														target.src = "/default-token.png";
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
									<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{token.dexData ? formatCurrency(parseFloat(token.dexData.priceUsd)) : formatCurrency(token.price)}</td>
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
																	target.src = "/default-profile.png";
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
														<TwitterSentiment
															summary={token.twitterSentiment?.summary || "No sentiment data available"}
															sentiment={token.twitterSentiment?.sentiment || "neutral"}
															count={token.twitterSentiment?.count || 0}
															positiveSplit={token.twitterSentiment?.positiveSplit || 0}
															negativeSplit={token.twitterSentiment?.negativeSplit || 0}
														/>
													</div>
													<div className={`${styles.module} ${closingTokenId === token.id ? styles.closing : ""}`}>
														<TelegramSentiment
															summary={token.telegramSentiment?.summary || "No sentiment data available"}
															sentiment={token.telegramSentiment?.sentiment || "neutral"}
															count={token.telegramSentiment?.count || 0}
															positiveSplit={token.telegramSentiment?.positiveSplit || 0}
															negativeSplit={token.telegramSentiment?.negativeSplit || 0}
														/>
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
			</div>
		</div>
	);
};

export default TokenFeed;
