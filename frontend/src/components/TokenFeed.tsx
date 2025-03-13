"use client";
import React, { useState, useEffect, useRef, useCallback } from "react";
import Image from "next/image";
import styles from "./TokenFeed.module.css";
import { FaTelegramPlane, FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { Copy, Check } from "lucide-react";
import { formatCurrency, formatPercentage, abbreviateAge } from "../utils/formatters";
import { SortField, SortDirection, TokenWithDexInfo } from "../types/token.types";
import { TradingView } from "./TradingView";
import CallerFeed from "./CallerFeed";
import TwitterSentiment from "./TwitterSentiment";
import TelegramSentiment from "./TelegramSentiment";
import TradeModule from "./TradeModule";
import { usePrivy } from "@privy-io/react-auth";
import { useChain } from "../contexts/ChainContext";
import BlurredPreviewTable from "./BlurredPreviewTable";
import { useFeedFilter } from "../contexts/FeedFilterContext";

import { useGetCallsByTokenQuery, useGetChatPhotoLazyQuery, useGetPublicCallsQuery } from "@/generated/graphql";
import { GetCallsByTokenQuery } from "@/generated/graphql";
import { savePhoto, getPhoto } from "../utils/localStorage";

const TOKENS_PER_PAGE = 50;
const LOAD_MORE_COOLDOWN = 5000;
const CALLS_REFRESH_INTERVAL = 5000;
const DEX_REFRESH_INTERVAL = 30000;
const DEFAULT_PHOTO = "/assets/KiFi_LOGO.jpg";

const TokenFeed: React.FC = () => {
	const { ready, authenticated } = usePrivy();
	const { currentChain } = useChain();
	const { filterType } = useFeedFilter();

	// Core states
	const [processedTokens, setProcessedTokens] = useState<TokenWithDexInfo[]>([]);
	const [sortedTokens, setSortedTokens] = useState<TokenWithDexInfo[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [page, setPage] = useState(1);
	const [hasMore, setHasMore] = useState(true);

	// UI states
	const [isMobile, setIsMobile] = useState(false);
	const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
	const [sortField, setSortField] = useState<SortField>("callers");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [copiedTokenId, setCopiedTokenId] = useState<string | null>(null);
	const [showCheckmark, setShowCheckmark] = useState<string | null>(null);
	const [isLoadingCooldown, setIsLoadingCooldown] = useState(false);

	// Animation states
	const [newTokenIds, setNewTokenIds] = useState<Set<string>>(new Set());
	const [callerChangedIds, setCallerChangedIds] = useState<Set<string>>(new Set());

	// Refs
	const isInitialLoadComplete = useRef(false);
	const lastDexFetchTime = useRef<number>(0);
	const refreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const dexRefreshIntervalRef = useRef<NodeJS.Timeout | null>(null);
	const observerTarget = useRef<HTMLDivElement>(null);
	const processedTokensRef = useRef<TokenWithDexInfo[]>([]);

	const { refetch: refetchCallsByToken, data: callsByTokenData, loading: callsByTokenLoading } = useGetCallsByTokenQuery({});
	const { refetch: refetchPublicCalls, data: publicCallsData, loading: publicCallsLoading } = useGetPublicCallsQuery({});

	// Photo management
	const [photos, setPhotos] = useState<Record<string, string>>({});
	const [getChatPhoto] = useGetChatPhotoLazyQuery();

	// Add this before the useEffects
	const initializationRef = useRef(false);

	// Add this with the other state declarations at the top
	const [, setPreviousRanks] = useState<Map<string, number>>(new Map());

	// Function to merge callers without duplicates
	const mergeCallers = useCallback((existingCallers: TokenWithDexInfo["callers"] = [], newCallers: TokenWithDexInfo["callers"] = []) => {
		const uniqueCallers = new Map<string, NonNullable<TokenWithDexInfo["callers"]>[number]>();

		// Add existing callers first
		existingCallers?.forEach((caller) => {
			if (caller.chat?.id) {
				uniqueCallers.set(caller.chat.id, caller);
			}
		});

		// Add new callers, only if they don't exist
		newCallers?.forEach((caller) => {
			if (caller.chat?.id && !uniqueCallers.has(caller.chat.id)) {
				uniqueCallers.set(caller.chat.id, caller);
			}
		});

		return Array.from(uniqueCallers.values());
	}, []);

	// Function to fetch and process token data
	const fetchTokenInfo = useCallback(
		async (tokenCalls: NonNullable<GetCallsByTokenQuery["getCallsByToken"]>["tokenCalls"], isPolling = false) => {
			// Only check refresh interval if this is a polling operation and we've already processed initial data
			if (isPolling && isInitialLoadComplete.current && Date.now() - lastDexFetchTime.current < DEX_REFRESH_INTERVAL) {
				return;
			}

			const operation = isPolling ? "dex data refresh" : "initial load";

			try {
				// Filter tokens by current chain
				const chainName = currentChain.name.toUpperCase();
				const filteredTokenCalls = tokenCalls.filter((token) => token.chain === chainName);

				if (filteredTokenCalls.length === 0) {
					console.log("No tokens found for chain:", currentChain.name);
					return;
				}

				// Sort by call count first - using direct comparison for better performance
				filteredTokenCalls.sort((a, b) => b.chats.length - a.chats.length);
				console.log(`Starting ${operation} for ${tokenCalls.length} tokens`);

				// Calculate range for processing
				const startIndex = 0;
				const endIndex = isPolling ? 50 : page * TOKENS_PER_PAGE;
				const currentPageTokenCalls = filteredTokenCalls.slice(startIndex, endIndex);

				// For refreshes, only fetch DEX data for top 50 tokens
				const tokensNeedingDexData = isPolling
					? currentPageTokenCalls.slice(0, 50) // During refresh, only top 50
					: currentPageTokenCalls; // During load more or initial load, all tokens

				// Only fetch DEX data for tokens that need it
				const dexDataTokens = await Promise.all(
					tokensNeedingDexData.map(async (tokenCall) => {
						const address = tokenCall.address;
						let tokenDataEndpoint = "";

						switch (tokenCall.chain) {
							case "SOLANA":
								tokenDataEndpoint = `https://api.dexscreener.com/tokens/v1/solana/${address}`;
								break;
							case "BASE":
								tokenDataEndpoint = `https://api.dexscreener.com/tokens/v1/base/${address}`;
								break;
							case "MONAD":
								tokenDataEndpoint = `https://api.kuru.io/api/v2/markets/search?limit=100&q=${address}`;
								break;
							default:
								return null;
						}

						try {
							const response = await fetch(tokenDataEndpoint);
							const data = await response.json();

							if (tokenCall.chain === "MONAD") {
								if (data?.success && data?.data?.data?.[0]) {
									const monadData = data.data.data[0];
									const baseToken = monadData.basetoken;

									if (!baseToken || !monadData.lastPrice) return null;

									// If liquidity is null, fetch it from the additional endpoint
									let liquidity = monadData.liquidity;
									if (liquidity === null && monadData.market) {
										try {
											const marketResponse = await fetch(`https://api.kuru.io/api/v2/markets/address/${monadData.market}`);
											const marketData = await marketResponse.json();
											if (marketData?.success && marketData?.data?.data) {
												liquidity = marketData.data.data.liquidity || 0;
											}
										} catch (error) {
											console.error("Error fetching liquidity data:", error);
											liquidity = 0;
										}
									}

									const token: TokenWithDexInfo = {
										id: baseToken.address,
										name: baseToken.name,
										ticker: baseToken.ticker,
										price: monadData.lastPrice || 0,
										pair: monadData.market,
										marketCap: (parseFloat(baseToken.circulatingSupply) / Math.pow(10, baseToken.decimal || 18)) * (monadData.lastPrice || 0),
										change24h: monadData.priceChange24h || 0,
										volume: monadData.volume24h || 0,
										liquidity: liquidity || 0,
										imageUrl: baseToken.imageurl || "/assets/coin.png",
										createdAt: monadData.triggertime || "",
										callers: tokenCall.chats.map((chatWithCalls) => {
											const photo = photos[chatWithCalls.chat.id] || DEFAULT_PHOTO;
											const profileImageUrl = photo || DEFAULT_PHOTO;
											return {
												id: chatWithCalls.chat.id,
												name: chatWithCalls.chat.name,
												profileImageUrl,
												timestamp: Date.now(),
												callCount: chatWithCalls.chat.callCount,
												winRate: 0,
												chat: {
													...chatWithCalls.chat,
													type: chatWithCalls.chat.type as "Group" | "Channel" | "Private",
													photoUrl: profileImageUrl,
												},
												messages: chatWithCalls.calls.flatMap((call) =>
													call.messages.map((msg) => ({
														id: msg.id,
														createdAt: msg.createdAt ?? new Date().toISOString(),
														text: msg.text ?? "",
														fromId: msg.fromId ?? null,
														messageType: msg.messageType,
														reason: msg.reason ?? null,
														tgMessageId: msg.tgMessageId,
													}))
												),
											};
										}),
										tokenCallsData: tokenCall,
										dexData: {
											baseToken: {
												address: baseToken.address,
												name: baseToken.name,
												symbol: baseToken.ticker,
											},
											priceUsd: monadData.lastPrice?.toString() || "0",
											liquidity: {
												usd: monadData.liquidity || 0,
												base: 0,
												quote: 0,
											},
											volume: {
												h24: monadData.volume24h || 0,
												h6: monadData.volume6h || 0,
												h1: monadData.volume1h || 0,
												m5: monadData.volume5m || 0,
											},
											priceChange: {
												h24: monadData.priceChange24h || 0,
												h6: monadData.priceChange6h || 0,
												h1: monadData.priceChange1h || 0,
												m5: monadData.priceChange5m || 0,
											},
											marketCap: (parseFloat(baseToken.circulatingSupply) / Math.pow(10, baseToken.decimal || 18)) * (monadData.lastPrice || 0),
											info: {
												imageUrl: baseToken.imageurl || "/assets/coin.png",
											},
											pairCreatedAt: monadData.triggertime || "",
											chainId: "monad",
											dexId: "kuru",
											url: `https://kuru.io/tokens/${baseToken.address}`,
											pairAddress: monadData.market,
											priceNative: monadData.lastPrice?.toString() || "0",
											fdv: parseFloat(baseToken.circulatingSupply) * (monadData.lastPrice || 0),
											quoteToken: {
												address: monadData.quotetoken.address,
												name: monadData.quotetoken.name,
												symbol: monadData.quotetoken.ticker,
											},
											txns: {
												h24: {
													buys: monadData.buyCount24h || 0,
													sells: monadData.sellCount24h || 0,
												},
												h6: {
													buys: monadData.buyCount6h || 0,
													sells: monadData.sellCount6h || 0,
												},
												h1: {
													buys: monadData.buyCount1h || 0,
													sells: monadData.sellCount1h || 0,
												},
												m5: {
													buys: monadData.buyCount5m || 0,
													sells: monadData.sellCount5m || 0,
												},
											},
										},
									};

									return token;
								}
							} else if (data) {
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
									callers: tokenCall.chats.map((chatWithCalls) => {
										const photo = photos[chatWithCalls.chat.id] || DEFAULT_PHOTO;
										const profileImageUrl = photo || DEFAULT_PHOTO;
										return {
											id: chatWithCalls.chat.id,
											name: chatWithCalls.chat.name,
											profileImageUrl,
											timestamp: Date.now(),
											callCount: chatWithCalls.chat.callCount,
											winRate: 0,
											chat: {
												...chatWithCalls.chat,
												type: chatWithCalls.chat.type as "Group" | "Channel" | "Private",
												photoUrl: profileImageUrl,
											},
											messages: chatWithCalls.calls.flatMap((call) =>
												call.messages.map((msg) => ({
													id: msg.id,
													createdAt: msg.createdAt ?? new Date().toISOString(),
													text: msg.text ?? "",
													fromId: msg.fromId ?? null,
													messageType: msg.messageType,
													reason: msg.reason ?? null,
													tgMessageId: msg.tgMessageId,
												}))
											),
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
							if (isPolling) {
								const existingToken = processedTokens.find((t) => t.id === tokenCall.address);
								return existingToken || null;
							}
							return null;
						}
					})
				);

				// Filter out null values
				const validTokens = dexDataTokens.filter((token): token is NonNullable<typeof token> => token !== null);

				if (isPolling) {
					// Merge new data with existing tokens
					setProcessedTokens((prev) => {
						const uniqueTokens = new Map(prev.map((token) => [token.id, token]));

						// Update existing tokens and add new ones
						tokenCalls.forEach((newCall) => {
							const existingToken = uniqueTokens.get(newCall.address);

							if (existingToken) {
								// Remove the caller change animation since we're using it for rank improvements now
								uniqueTokens.set(newCall.address, {
									...existingToken,
									callers: newCall.chats.map((chat) => ({
										id: chat.chat.id,
										name: chat.chat.name,
										profileImageUrl: photos[chat.chat.id] || DEFAULT_PHOTO,
										timestamp: Date.now(),
										callCount: chat.chat.callCount,
										winRate: 0,
										chat: {
											...chat.chat,
											type: chat.chat.type as "Group" | "Channel" | "Private",
											photoUrl: photos[chat.chat.id] || DEFAULT_PHOTO,
										},
										messages: chat.calls.flatMap((call) =>
											call.messages.map((msg) => ({
												id: msg.id,
												createdAt: msg.createdAt ?? new Date().toISOString(),
												text: msg.text ?? "",
												fromId: msg.fromId ?? null,
												messageType: msg.messageType,
												reason: msg.reason ?? null,
												tgMessageId: msg.tgMessageId,
											}))
										),
									})),
									tokenCallsData: newCall,
								});
							}
						});

						// Update DEX data for tokens that have it
						validTokens.forEach((newToken) => {
							const existingToken = uniqueTokens.get(newToken.id);
							if (existingToken) {
								uniqueTokens.set(newToken.id, {
									...existingToken,
									...newToken,
									callers: existingToken.callers, // Preserve existing callers
								});
							} else {
								uniqueTokens.set(newToken.id, newToken);
								setNewTokenIds((prev) => new Set([...prev, newToken.id]));
							}
						});

						return Array.from(uniqueTokens.values());
					});
				} else {
					// Initial load or pagination - only add tokens with valid DEX data
					setProcessedTokens((prev) => {
						const uniqueTokens = new Map(prev.map((token) => [token.id, token]));

						// Add only tokens with DEX data
						validTokens.forEach((token) => {
							uniqueTokens.set(token.id, token);
							setNewTokenIds((prev) => new Set([...prev, token.id]));
						});

						return Array.from(uniqueTokens.values());
					});
				}
			} catch (error) {
				console.error("Error processing tokens:", error);
			} finally {
				if (isPolling && isInitialLoadComplete.current) {
					lastDexFetchTime.current = Date.now();
					console.log("✅ Dex Refresh complete", new Date().toLocaleTimeString());
				} else {
					setIsLoading(false);
				}
			}
		},
		// eslint-disable-next-line react-hooks/exhaustive-deps
		[currentChain, page]
	);

	// Setup refresh intervals
	const setupRefreshIntervals = useCallback(() => {
		const refreshTokenCalls = async () => {
			if (!isInitialLoadComplete.current) return;

			try {
				console.log("🔄 Refreshing token calls...");
				let data: NonNullable<GetCallsByTokenQuery["getCallsByToken"]>["tokenCalls"] | undefined;

				if (filterType === "saved") {
					const result = await refetchCallsByToken();
					data = result.data?.getCallsByToken?.tokenCalls;
				} else {
					const result = await refetchPublicCalls();
					data = result.data?.getPublicCalls?.tokenCalls;
				}

				if (!data) {
					console.log("❌ No data received from refresh");
					return;
				}

				const filteredCalls = data.filter((token) => token.chain === currentChain.name.toUpperCase()).sort((a, b) => b.chats.length - a.chats.length);

				console.log(`📊 Refreshing ${filteredCalls.length} tokens`);
				await fetchTokenInfo(filteredCalls, true);
				console.log("✅ Token refresh complete");
			} catch (error) {
				console.error("Error refreshing token calls:", error);
			}
		};

		// Clear existing intervals
		if (refreshIntervalRef.current) {
			clearInterval(refreshIntervalRef.current);
			refreshIntervalRef.current = null;
		}
		if (dexRefreshIntervalRef.current) {
			clearInterval(dexRefreshIntervalRef.current);
			dexRefreshIntervalRef.current = null;
		}

		// Set up new interval
		refreshIntervalRef.current = setInterval(refreshTokenCalls, CALLS_REFRESH_INTERVAL);

		// Perform initial refresh
		refreshTokenCalls();

		return () => {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
				refreshIntervalRef.current = null;
			}
			if (dexRefreshIntervalRef.current) {
				clearInterval(dexRefreshIntervalRef.current);
				dexRefreshIntervalRef.current = null;
			}
		};
	}, [filterType, currentChain.name, refetchCallsByToken, refetchPublicCalls, fetchTokenInfo]);

	// Replace the initial data loading effect
	useEffect(() => {
		const loadInitialData = async () => {
			// Reset initialization flags when filter type changes
			if (isInitialLoadComplete.current) {
				initializationRef.current = false;
				isInitialLoadComplete.current = false;
			}

			// Guard against multiple initializations in the same filter type
			if (initializationRef.current) return;
			initializationRef.current = true;

			setIsLoading(true);
			console.log("🚀 Starting initial data load...");

			let data: NonNullable<GetCallsByTokenQuery["getCallsByToken"]>["tokenCalls"] | undefined;
			if (filterType === "saved") {
				data = callsByTokenData?.getCallsByToken?.tokenCalls;
			} else {
				data = publicCallsData?.getPublicCalls?.tokenCalls;
			}

			if (data) {
				const tokenCalls = [...data].filter((token) => token.chain === currentChain.name.toUpperCase()).sort((a, b) => b.chats.length - a.chats.length);

				// Reset processed tokens when filter type changes
				setProcessedTokens([]);
				setSortedTokens([]);

				await fetchTokenInfo(tokenCalls, false);
				isInitialLoadComplete.current = true;
				setIsLoading(false);
				setupRefreshIntervals();
				console.log("✅ Initial data load complete");
			}
		};

		if (ready && authenticated && !callsByTokenLoading && !publicCallsLoading) {
			loadInitialData();
		}

		return () => {
			initializationRef.current = false;
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [ready, authenticated, filterType, currentChain.name, callsByTokenData, publicCallsData, callsByTokenLoading, publicCallsLoading, setupRefreshIntervals]);

	// Update processedTokensRef when processedTokens changes
	useEffect(() => {
		processedTokensRef.current = processedTokens;
	}, [processedTokens]);

	// Add this effect for photo fetching with improved handling
	useEffect(() => {
		if (!processedTokens.length) return;

		// Get all unique chat IDs from processed tokens
		const chatIds = new Set<string>();
		processedTokens.forEach((token: TokenWithDexInfo) => {
			token.callers?.forEach((caller) => {
				if (caller.chat?.id && !photos[caller.chat.id]) {
					// Only process if we don't have the photo
					chatIds.add(caller.chat.id);
				}
			});
		});

		// Process each chat ID
		chatIds.forEach((chatId) => {
			// First try to get from localStorage
			const cachedPhoto = getPhoto(chatId);

			if (cachedPhoto && cachedPhoto !== "no-photo") {
				// If found in cache, use it
				setPhotos((prev) => ({
					...prev,
					[chatId]: cachedPhoto,
				}));
			} else if (!photos[chatId]) {
				// Only fetch if we don't have the photo
				// If not in cache, fetch from API
				getChatPhoto({
					variables: { chatId },
					onCompleted: (data) => {
						if (data.getChatPhoto) {
							const photoUrl = data.getChatPhoto === "no-photo" || !data.getChatPhoto ? DEFAULT_PHOTO : data.getChatPhoto;

							// Update local state only if we don't have a photo for this chat
							setPhotos((prev) => {
								if (!prev[chatId]) {
									// Only update if we don't have a photo
									return {
										...prev,
										[chatId]: photoUrl,
									};
								}
								return prev;
							});

							// Save to localStorage if it's not the default image
							if (photoUrl !== DEFAULT_PHOTO) {
								savePhoto(chatId, photoUrl);
							}
						}
					},
					onError: () => {
						// Only set default photo if we don't have one
						setPhotos((prev) => {
							if (!prev[chatId]) {
								return {
									...prev,
									[chatId]: DEFAULT_PHOTO,
								};
							}
							return prev;
						});
					},
				});
			}
		});
	}, [processedTokens, getChatPhoto, photos]);

	// Effect to handle public calls data
	useEffect(() => {
		if (!publicCallsData?.getPublicCalls?.tokenCalls || !processedTokens.length || filterType === "saved") return;

		const publicTokenCalls = publicCallsData.getPublicCalls.tokenCalls.filter((token) => token.chain === currentChain.name.toUpperCase());

		setProcessedTokens((prevTokens) => {
			const updatedTokens = prevTokens.map((token) => {
				const publicToken = publicTokenCalls.find((t) => t.address === token.id);
				if (!publicToken) return token;

				// Convert public calls to the same format as private calls
				const publicCallers = publicToken.chats.map((chatWithCalls) => ({
					id: chatWithCalls.chat.id,
					name: chatWithCalls.chat.name,
					profileImageUrl: photos[chatWithCalls.chat.id] || DEFAULT_PHOTO,
					timestamp: Date.now(),
					callCount: chatWithCalls.chat.callCount,
					winRate: 0,
					chat: {
						...chatWithCalls.chat,
						type: chatWithCalls.chat.type as "Group" | "Channel" | "Private",
						photoUrl: photos[chatWithCalls.chat.id] || DEFAULT_PHOTO,
					},
					messages: chatWithCalls.calls.flatMap((call) =>
						call.messages.map((msg) => ({
							id: msg.id,
							createdAt: msg.createdAt ?? new Date().toISOString(),
							text: msg.text ?? "",
							fromId: msg.fromId ?? null,
							messageType: msg.messageType,
							reason: msg.reason ?? null,
							tgMessageId: msg.tgMessageId,
						}))
					),
				}));

				// Merge existing and public callers
				const mergedCallers = mergeCallers(token.callers, publicCallers);

				return {
					...token,
					callers: mergedCallers,
				};
			});

			return updatedTokens;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [publicCallsData, currentChain.name, photos, mergeCallers, filterType]);

	// Chain change handler - modify to respect initialization
	useEffect(() => {
		if (!ready || !authenticated) return;

		const resetAndReload = () => {
			setIsLoading(true);
			isInitialLoadComplete.current = false;
			initializationRef.current = false;

			// Store ref values in variables inside the effect
			const refreshInterval = refreshIntervalRef.current;
			const dexRefreshInterval = dexRefreshIntervalRef.current;

			// Clear existing intervals
			if (refreshInterval) clearInterval(refreshInterval);
			if (dexRefreshInterval) clearInterval(dexRefreshInterval);

			// Reset states
			setProcessedTokens([]);
			setSortedTokens([]);
			setPage(1);
			setHasMore(true);
			setNewTokenIds(new Set());
			setCallerChangedIds(new Set());
		};

		resetAndReload();

		return () => {
			const refreshInterval = refreshIntervalRef.current;
			const dexRefreshInterval = dexRefreshIntervalRef.current;
			if (refreshInterval) clearInterval(refreshInterval);
			if (dexRefreshInterval) clearInterval(dexRefreshInterval);
		};
	}, [currentChain, filterType, ready, authenticated]);

	// Effect to handle expanded token state changes
	useEffect(() => {
		// No need to clear or restart intervals when expanding/collapsing tokens
		// Just let the regular refresh continue in the background
		return;
	}, [expandedTokenId]);

	// Add mobile detection
	useEffect(() => {
		const checkMobile = () => {
			setIsMobile(window.innerWidth <= 768);
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);

		return () => {
			window.removeEventListener("resize", checkMobile);
		};
	}, []);

	// Intersection Observer for infinite scroll
	useEffect(() => {
		const observer = new IntersectionObserver(
			(entries: IntersectionObserverEntry[]) => {
				if (entries[0].isIntersecting && hasMore && !isLoading && !isLoadingCooldown) {
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
	}, [hasMore, isLoading, isLoadingCooldown]);

	// Update the useEffect for sorting tokens to track rank changes
	useEffect(() => {
		if (processedTokens.length > 0) {
			// Store current ranks before sorting
			const currentRanks = new Map(sortedTokens.map((token, index) => [token.id, index + 1]));
			const currentCallerCounts = new Map(sortedTokens.map((token) => [token.id, token.callers?.length || 0]));

			const newSortedTokens = [...processedTokens].sort((a, b) => {
				let comparison = 0;

				switch (sortField) {
					case "age":
						comparison = (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
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
						comparison = (a.callers?.length || 0) - (b.callers?.length || 0);
						if (comparison === 0) {
							comparison = (a.dexData?.liquidity?.usd || a.liquidity || 0) - (b.dexData?.liquidity?.usd || b.liquidity || 0);
						}
						break;
					case "createdAt":
						comparison = (a.createdAt ? new Date(a.createdAt).getTime() : 0) - (b.createdAt ? new Date(b.createdAt).getTime() : 0);
						break;
					default:
						return 0;
				}

				return sortDirection === "asc" ? comparison : -comparison;
			});

			// Compare new ranks with previous ranks and trigger animations
			const newRanks = new Map(newSortedTokens.map((token, index) => [token.id, index + 1]));

			// Clear existing animations
			setCallerChangedIds(new Set());

			// Only trigger animations for tokens that moved up in rank AND had an increase in caller count
			newSortedTokens.forEach((token) => {
				const previousRank = currentRanks.get(token.id) || Number.MAX_SAFE_INTEGER;
				const newRank = newRanks.get(token.id) || 0;
				const previousCallerCount = currentCallerCounts.get(token.id) || 0;
				const newCallerCount = token.callers?.length || 0;

				// Only animate if:
				// 1. The token moved up in rank
				// 2. The token's caller count increased
				// 3. We're sorting by callers
				if (newRank < previousRank && newCallerCount > previousCallerCount && sortField === "callers") {
					setCallerChangedIds((prev) => new Set([...prev, token.id]));
					// Clear the animation after a delay
					setTimeout(() => {
						setCallerChangedIds((prev) => {
							const next = new Set(prev);
							next.delete(token.id);
							return next;
						});
					}, 1500);
				}
			});

			setPreviousRanks(currentRanks);
			setSortedTokens(newSortedTokens);
		}
	}, [sortField, sortDirection, processedTokens]);

	// Cleanup effect for intervals when component unmounts
	useEffect(() => {
		return () => {
			// Clear all intervals on unmount
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
				refreshIntervalRef.current = null;
			}
			if (dexRefreshIntervalRef.current) {
				clearInterval(dexRefreshIntervalRef.current);
				dexRefreshIntervalRef.current = null;
			}
			// Clear any pending animation timeouts
			setCallerChangedIds(new Set());
			setNewTokenIds(new Set());
		};
	}, []);

	const handleSort = (field: SortField) => {
		// Clear all change indicators when sorting
		setNewTokenIds(new Set());
		setCallerChangedIds(new Set());

		if (field === sortField) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection(field === "name" || field === "age" ? "asc" : "desc");
		}
	};

	const handleRowClick = (tokenId: string) => {
		setExpandedTokenId(expandedTokenId === tokenId ? null : tokenId);
	};

	const handleCopyAddress = async (tokenId: string, event: React.MouseEvent) => {
		event.stopPropagation(); // Prevent row expansion when clicking copy
		try {
			await navigator.clipboard.writeText(tokenId);
			setCopiedTokenId(tokenId);
			setShowCheckmark(tokenId);
			setTimeout(() => {
				setCopiedTokenId(null);
				setShowCheckmark(null);
			}, 2000); // Reset after 2 seconds
		} catch (err) {
			console.error("Failed to copy address:", err);
		}
	};

	const getSortIcon = (field: SortField) => {
		if (field !== sortField) return <FaSort className={styles.sortIcon} />;
		return sortDirection === "asc" ? <FaSortUp className={styles.sortIcon} /> : <FaSortDown className={styles.sortIcon} />;
	};

	if (!ready) {
		return (
			<div className={styles.initialLoading}>
				<div className={styles.loadingSpinner}></div>
				<p>Loading...</p>
			</div>
		);
	}

	if (!authenticated) {
		return (
			<div className={styles.container}>
				<BlurredPreviewTable />
				<div className={styles.authOverlay}>
					<div className={styles.authContent}>
						<h2 className={styles.authTitle}>Sign In to Access Calls Feed</h2>
						<p className={styles.authDescription}>Connect your wallet or sign in with your preferred social method to gain access to KiSignals!</p>
					</div>
				</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.tableContainer}>
				{filterType === "saved" && !isLoading && !callsByTokenLoading && !publicCallsLoading && sortedTokens.length === 0 && (
					<>
						<BlurredPreviewTable />
						<div className={styles.authOverlay}>
							<div className={styles.authContent}>
								<h2 className={styles.authTitle}>No Saved Token Calls</h2>
								<p className={styles.authDescription}>Add your favorite Telegram channels and groups to start tracking token calls! Click top right to access Telegram Setup to get started.</p>
							</div>
						</div>
					</>
				)}
				{(isLoading || callsByTokenLoading || publicCallsLoading) && !processedTokens.length && (
					<div className={styles.initialLoading}>
						<div className={styles.loadingSpinner}></div>
						<p>Loading tokens...</p>
					</div>
				)}
				{!isLoading && !callsByTokenLoading && !publicCallsLoading && sortedTokens.length > 0 && (
					<>
						<table className={styles.tokenTable}>
							<thead>
								<tr className={styles.tableHeader}>
									<th className={`${styles.headerCell} ${styles.narrowColumn} ${styles.centerHeader}`}>
										<div onClick={() => handleSort("rank")} className={styles.sortableHeader}>
											<span>Rank</span>
										</div>
									</th>
									<th className={`${styles.headerCell} ${styles.wideColumn} ${styles.leftAligned}`}>
										<div onClick={() => handleSort("name")} className={styles.sortableHeader}>
											<span>Token</span>
											{getSortIcon("name")}
										</div>
									</th>
									{!isMobile && (
										<>
											<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
												<div onClick={() => handleSort("age")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
													<span>Age</span>
													{getSortIcon("age")}
												</div>
											</th>
											<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
												<div onClick={() => handleSort("price")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
													<span>Price</span>
													{getSortIcon("price")}
												</div>
											</th>
											<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
												<div onClick={() => handleSort("liquidity")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
													<span>Liquidity</span>
													{getSortIcon("liquidity")}
												</div>
											</th>
											<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
												<div onClick={() => handleSort("volume")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
													<span>Volume</span>
													{getSortIcon("volume")}
												</div>
											</th>
											<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
												<div onClick={() => handleSort("marketCap")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
													<span>Market Cap</span>
													{getSortIcon("marketCap")}
												</div>
											</th>
											<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>
												<div onClick={() => handleSort("change24h")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
													<span>24H %</span>
													{getSortIcon("change24h")}
												</div>
											</th>
										</>
									)}
									<th className={`${styles.headerCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.callersGroup}`}>
										<div onClick={() => handleSort("callers")} className={styles.sortableHeader}>
											<div className={styles.callersHeader}>
												<FaTelegramPlane className={styles.telegramIcon} />
												<span>Callers</span>
												{getSortIcon("callers")}
											</div>
										</div>
									</th>
								</tr>
							</thead>
							<tbody>
								{sortedTokens.map((token, index) => (
									<React.Fragment key={token.id}>
										<tr
											className={`${styles.tokenRow} 
												${expandedTokenId === token.id ? styles.expanded : ""} 
												${newTokenIds.has(token.id) ? styles.newToken : ""} 
												${callerChangedIds.has(token.id) ? styles.callerChanged : ""}`}
											onClick={() => handleRowClick(token.id)}
										>
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
																const target = e.target as HTMLImageElement;
																target.src = "/assets/coin.png";
															}}
														/>
													</div>
													<div className={styles.nameContainer}>
														<div className={styles.tokenNameWrapper}>
															<div className={styles.tokenName}>{token.dexData ? token.dexData.baseToken.name : token.name}</div>
															<div className={styles.tokenTicker} onClick={(e) => handleCopyAddress(token.id, e)} title="Copy token address">
																${token.dexData ? token.dexData.baseToken.symbol : token.ticker}
																<button className={`${styles.copyButton} ${copiedTokenId === token.id ? styles.copied : ""}`} title="Copy token address">
																	{showCheckmark === token.id ? <Check size={16} /> : <Copy size={16} />}
																</button>
															</div>
														</div>
													</div>
												</div>
											</td>
											{!isMobile && (
												<>
													<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>
														{(() => {
															try {
																if (token.dexData?.pairCreatedAt) {
																	const date = new Date(token.dexData.pairCreatedAt);
																	if (!isNaN(date.getTime())) {
																		return abbreviateAge(date.toISOString());
																	}
																}
																if (token.createdAt) {
																	const date = new Date(token.createdAt);
																	if (!isNaN(date.getTime())) {
																		return abbreviateAge(token.createdAt);
																	}
																}
																return "-";
															} catch {
																return "-";
															}
														})()}
													</td>
													<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{token.dexData ? formatCurrency(parseFloat(token.dexData.priceUsd), 10, true) : formatCurrency(token.price, 10, true)}</td>
													<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.liquidity || 0)}</td>
													<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{token.dexData ? formatCurrency(token.dexData.volume.h24) : token.volume ? formatCurrency(token.volume) : "-"}</td>
													<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{token.dexData ? formatCurrency(token.dexData.marketCap) : formatCurrency(token.marketCap)}</td>
													<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup} ${token.dexData ? (token.dexData.priceChange.h24 >= 0 ? styles.positive : styles.negative) : token.change24h >= 0 ? styles.positive : styles.negative}`}>
														{token.dexData ? (token.dexData.priceChange.h24 >= 0 ? "+" : "") : token.change24h >= 0 ? "+" : ""}
														{token.dexData ? formatPercentage(token.dexData.priceChange.h24) : formatPercentage(token.change24h)}
													</td>
												</>
											)}
											<td className={`${styles.cell} ${styles.callersCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.callersGroup}`}>
												<div className={styles.callersContainer}>
													{token.callers && token.callers.length > 0 ? (
														<>
															{token.callers.slice(0, isMobile ? 3 : 5).map((caller, i) => (
																<div key={caller.id} className={styles.callerImageWrapper} style={{ zIndex: (isMobile ? 3 : 5) - i }}>
																	<Image
																		src={caller.chat?.id ? photos[caller.chat.id] || DEFAULT_PHOTO : DEFAULT_PHOTO}
																		alt={caller.name || "Caller"}
																		width={42}
																		height={42}
																		className={styles.callerImage}
																		onError={(e) => {
																			const target = e.target as HTMLImageElement;
																			target.src = DEFAULT_PHOTO;
																		}}
																	/>
																</div>
															))}
															{token.callers.length > (isMobile ? 3 : 5) && <div className={styles.extraCallersCount}>+{token.callers.length - (isMobile ? 3 : 5)}</div>}
														</>
													) : (
														<span className={styles.noCallers}>-</span>
													)}
												</div>
											</td>
										</tr>
										{expandedTokenId === token.id && (
											<tr className={styles.expandedRow}>
												<td colSpan={isMobile ? 3 : 9} className={styles.expandedCell}>
													<div className={styles.expandedContent}>
														<div className={styles.expandedModules}>
															<div className={styles.moduleRow}>
																<div className={styles.module}>
																	<TradingView token={token} theme={document.documentElement.getAttribute("data-theme") === "light" ? "light" : "dark"} />
																</div>
																<div className={styles.module}>
																	<CallerFeed token={token} />
																</div>
																<div className={styles.module}>
																	<TradeModule token={token} />
																</div>
															</div>
															<div className={styles.moduleRow}>
																<div className={`${styles.module} ${styles.wideModule}`}>
																	<TwitterSentiment contractAddress={token.id} />
																</div>
																<div className={styles.module}>
																	<TelegramSentiment contractAddress={token.id} />
																</div>
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
						{hasMore && (
							<div ref={observerTarget} className={styles.loadingTrigger}>
								{isLoading ? (
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
