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

import { useGetCallsByTokenQuery, useGetChatPhotoLazyQuery, useGetPublicCallsQuery } from "@/generated/graphql";
import { GetCallsByTokenQuery } from "@/generated/graphql";
import { savePhoto, getAllPhotos } from "../utils/localStorage";

const TOKENS_PER_PAGE = 50;
const LOAD_MORE_COOLDOWN = 5000;
const CALLS_REFRESH_INTERVAL = 5000;
const DEX_REFRESH_INTERVAL = 30000;
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
	const { ready, authenticated } = usePrivy();
	const { currentChain } = useChain();

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
	const [photos, setPhotos] = useState<PhotoCache>(photoCache.get());
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
	const photoBatchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
	const pendingPhotoFetchesRef = useRef<Set<string>>(new Set());

	const { refetch: refetchCallsByToken, data: callsByTokenData, loading: callsByTokenLoading } = useGetCallsByTokenQuery({});
	const { refetch: refetchPublicCalls, data: publicCallsData, loading: publicCallsLoading } = useGetPublicCallsQuery({});
	const [getChatPhoto] = useGetChatPhotoLazyQuery();

	// Add a ref to track latest processedTokens
	const processedTokensRef = useRef<TokenWithDexInfo[]>([]);

	// Function to merge callers without duplicates
	const mergeCallers = useCallback((existingCallers: TokenWithDexInfo["callers"] = [], newCallers: TokenWithDexInfo["callers"] = []) => {
		const uniqueCallers = new Map();

		// Add existing callers first
		existingCallers.forEach((caller) => {
			if (caller.chat?.id) {
				uniqueCallers.set(caller.chat.id, caller);
			}
		});

		// Add new callers, only if they don't exist
		newCallers.forEach((caller) => {
			if (caller.chat?.id && !uniqueCallers.has(caller.chat.id)) {
				uniqueCallers.set(caller.chat.id, caller);
			}
		});

		return Array.from(uniqueCallers.values());
	}, []);

	// Effect to handle public calls data
	useEffect(() => {
		if (!publicCallsData?.getPublicCalls?.tokenCalls || !processedTokens.length) return;

		const publicTokenCalls = publicCallsData.getPublicCalls.tokenCalls.filter((token) => token.chain === currentChain.name.toUpperCase());

		setProcessedTokens((prevTokens) => {
			const updatedTokens = prevTokens.map((token) => {
				const publicToken = publicTokenCalls.find((t) => t.address === token.id);
				if (!publicToken) return token;

				// Convert public calls to the same format as private calls
				const publicCallers = publicToken.chats.map((chatWithCalls) => ({
					id: chatWithCalls.chat.id,
					name: chatWithCalls.chat.name,
					profileImageUrl: photos[chatWithCalls.chat.id]?.url || DEFAULT_PHOTO,
					timestamp: Date.now(),
					callCount: chatWithCalls.chat.callCount,
					winRate: 0,
					chat: {
						...chatWithCalls.chat,
						type: chatWithCalls.chat.type as "Group" | "Channel" | "Private",
						photoUrl: photos[chatWithCalls.chat.id]?.url || DEFAULT_PHOTO,
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

				// Get current caller IDs for comparison
				const currentCallerIds = new Set(token.callers?.map((c) => c.chat?.id) || []);

				// Merge existing and public callers
				const mergedCallers = mergeCallers(token.callers, publicCallers);

				// Only trigger animation if we have actual new callers
				const hasNewCallers = publicCallers.some((caller) => caller.chat?.id && !currentCallerIds.has(caller.chat.id));

				if (hasNewCallers) {
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

				return {
					...token,
					callers: mergedCallers,
				};
			});

			return updatedTokens;
		});
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [publicCallsData, currentChain.name, photos, mergeCallers]);

	// Batched photo fetching logic
	const fetchPhotoBatch = useCallback(async () => {
		const pendingFetches = Array.from(pendingPhotoFetchesRef.current);
		if (pendingFetches.length === 0) return;

		// Clear the pending set
		pendingPhotoFetchesRef.current.clear();

		// Process in smaller batches to avoid overwhelming the server
		const BATCH_SIZE = 5;
		for (let i = 0; i < pendingFetches.length; i += BATCH_SIZE) {
			const batch = pendingFetches.slice(i, i + BATCH_SIZE);
			await Promise.all(
				batch.map(async (chatId) => {
					try {
						// Skip if already loading or loaded successfully
						if (photos[chatId]?.isLoading || (photos[chatId]?.url && !photos[chatId]?.error)) return;

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
						console.error("Error fetching photo for chat", chatId, ":", error);
						setPhotos((prev) => ({
							...prev,
							[chatId]: { url: DEFAULT_PHOTO, isLoading: false, error: "Failed to load" },
						}));
					}
				})
			);

			// Add a small delay between batches to prevent rate limiting
			if (i + BATCH_SIZE < pendingFetches.length) {
				await new Promise((resolve) => setTimeout(resolve, 100));
			}
		}
	}, [getChatPhoto, photos]);

	// Queue photo fetch with debouncing
	const queuePhotoFetch = useCallback(
		(chatId: string, photoUrl?: string | null) => {
			// Skip if no need to fetch
			if (!photoUrl?.startsWith("/api/telegram/photo/")) return;
			if (photos[chatId]?.isLoading || (photos[chatId]?.url && !photos[chatId]?.error)) return;

			// Set initial loading state
			setPhotos((prev) => ({
				...prev,
				[chatId]: { url: DEFAULT_PHOTO, isLoading: true },
			}));

			// Add to pending fetches
			pendingPhotoFetchesRef.current.add(chatId);

			// Clear existing timeout
			if (photoBatchTimeoutRef.current) {
				clearTimeout(photoBatchTimeoutRef.current);
			}

			// Set new timeout for batch processing
			photoBatchTimeoutRef.current = setTimeout(() => {
				fetchPhotoBatch();
			}, 100); // Adjust this delay as needed
		},
		[photos, fetchPhotoBatch]
	);

	// Effect to fetch photos for visible callers
	useEffect(() => {
		const visibleTokens = sortedTokens.slice(0, page * TOKENS_PER_PAGE);
		const chatIds = new Set<string>();

		visibleTokens.forEach((token) => {
			token.callers?.forEach((caller) => {
				if (caller.chat?.id) {
					chatIds.add(caller.chat.id);
				}
			});
		});

		chatIds.forEach((chatId) => {
			const caller = visibleTokens.find((token) => token.callers?.some((c) => c.chat?.id === chatId))?.callers?.find((c) => c.chat?.id === chatId);
			if (caller) {
				queuePhotoFetch(chatId, caller.chat.photoUrl);
			}
		});

		// Cleanup function
		return () => {
			if (photoBatchTimeoutRef.current) {
				clearTimeout(photoBatchTimeoutRef.current);
			}
		};
	}, [sortedTokens, page, queuePhotoFetch]);

	// Chain change handler
	useEffect(() => {
		setIsLoading(true);
		isInitialLoadComplete.current = false;

		// Clear existing intervals
		if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
		if (dexRefreshIntervalRef.current) clearInterval(dexRefreshIntervalRef.current);

		// Reset states
		setProcessedTokens([]);
		setSortedTokens([]);
		setPage(1);
		setHasMore(true);
		setNewTokenIds(new Set());
		setCallerChangedIds(new Set());

		// Initial load for new chain
		if (callsByTokenData?.getCallsByToken?.tokenCalls) {
			const tokenCalls = [...callsByTokenData.getCallsByToken.tokenCalls].filter((token) => token.chain === currentChain.name.toUpperCase()).sort((a, b) => b.chats.length - a.chats.length);

			// Process initial data
			fetchTokenInfo(tokenCalls, false).then(() => {
				isInitialLoadComplete.current = true;
				setIsLoading(false);
				setupRefreshIntervals();
			});
		} else if (!callsByTokenLoading) {
			setIsLoading(false);
		}

		return () => {
			if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current);
			if (dexRefreshIntervalRef.current) clearInterval(dexRefreshIntervalRef.current);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [currentChain, callsByTokenData]);

	// Add a separate effect to handle initial data load
	useEffect(() => {
		if (!callsByTokenLoading && callsByTokenData?.getCallsByToken?.tokenCalls && !isInitialLoadComplete.current) {
			const tokenCalls = [...callsByTokenData.getCallsByToken.tokenCalls].filter((token) => token.chain === currentChain.name.toUpperCase()).sort((a, b) => b.chats.length - a.chats.length);

			fetchTokenInfo(tokenCalls, false).then(() => {
				isInitialLoadComplete.current = true;
				setIsLoading(false);
				setupRefreshIntervals();
			});
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [callsByTokenLoading, callsByTokenData]);

	// Function to fetch and process token data
	const fetchTokenInfo = useCallback(
		async (tokenCalls: NonNullable<GetCallsByTokenQuery["getCallsByToken"]>["tokenCalls"], isPolling = false) => {
			// Only check refresh interval if this is a polling operation and we've already processed initial data
			if (isPolling && isInitialLoadComplete.current && Date.now() - lastDexFetchTime.current < CALLS_REFRESH_INTERVAL) {
				return; // Prevent too frequent refreshes
			}

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

				// Calculate range for processing
				const startIndex = 0;
				const endIndex = isPolling ? filteredTokenCalls.length : page * TOKENS_PER_PAGE;
				const currentPageTokenCalls = filteredTokenCalls.slice(startIndex, endIndex);

				console.log(`Processing ${currentPageTokenCalls.length} tokens during ${isPolling ? "dex data refresh" : "initial load"}`);

				// For refreshes, only fetch DEX data for top 50 tokens
				// For load more or initial load, fetch DEX data for all new tokens in the current page
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
											const photo = photos[chatWithCalls.chat.id];
											const profileImageUrl = photo?.url || DEFAULT_PHOTO;
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
										const photo = photos[chatWithCalls.chat.id];
										const profileImageUrl = photo?.url || DEFAULT_PHOTO;
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
								// Update caller data for existing token
								const currentCallerCount = existingToken.callers?.length || 0;
								const newCallerCount = newCall.chats.length;

								if (currentCallerCount !== newCallerCount) {
									setCallerChangedIds((prev) => new Set([...prev, newCall.address]));
								}

								uniqueTokens.set(newCall.address, {
									...existingToken,
									callers: newCall.chats.map((chat) => ({
										id: chat.chat.id,
										name: chat.chat.name,
										profileImageUrl: photos[chat.chat.id]?.url || DEFAULT_PHOTO,
										timestamp: Date.now(),
										callCount: chat.chat.callCount,
										winRate: 0,
										chat: {
											...chat.chat,
											type: chat.chat.type as "Group" | "Channel" | "Private",
											photoUrl: photos[chat.chat.id]?.url || DEFAULT_PHOTO,
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

	const setupRefreshIntervals = useCallback(() => {
		// Token calls refresh interval
		const refreshTokenCalls = async () => {
			if (!isInitialLoadComplete.current || expandedTokenId) return;

			try {
				const [privateResult, publicResult] = await Promise.all([refetchCallsByToken(), refetchPublicCalls()]);

				if (!privateResult.data?.getCallsByToken?.tokenCalls) return;

				const tokenCalls = privateResult.data.getCallsByToken.tokenCalls.filter((token) => token.chain === currentChain.name.toUpperCase()).sort((a, b) => b.chats.length - a.chats.length);

				setProcessedTokens((prev) => {
					const updatedTokens = new Map(prev.map((token) => [token.id, token]));
					const newIds = new Set<string>();
					const callerChanges = new Set<string>();

					tokenCalls.forEach((newCall) => {
						const existingToken = updatedTokens.get(newCall.address);

						if (!existingToken) {
							if (!prev.some((t) => t.id === newCall.address)) {
								newIds.add(newCall.address);
							}
						} else {
							// Convert new calls to caller format
							const newCallers = newCall.chats.map((chat) => ({
								id: chat.chat.id,
								name: chat.chat.name,
								profileImageUrl: photos[chat.chat.id]?.url || DEFAULT_PHOTO,
								timestamp: Date.now(),
								callCount: chat.chat.callCount,
								winRate: 0,
								chat: {
									...chat.chat,
									type: chat.chat.type as "Group" | "Channel" | "Private",
									photoUrl: photos[chat.chat.id]?.url || DEFAULT_PHOTO,
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
							}));

							// Get current caller IDs for comparison
							const currentCallerIds = new Set(existingToken.callers?.map((c) => c.chat?.id) || []);

							// Check for actual new callers
							const hasNewCallers = newCallers.some((caller) => caller.chat?.id && !currentCallerIds.has(caller.chat.id));

							if (hasNewCallers) {
								callerChanges.add(newCall.address);
							}

							// Merge with existing callers
							const mergedCallers = mergeCallers(existingToken.callers, newCallers);

							updatedTokens.set(newCall.address, {
								...existingToken,
								callers: mergedCallers,
								tokenCallsData: newCall,
							});
						}
					});

					if (newIds.size > 0) {
						setNewTokenIds(newIds);
						setTimeout(() => setNewTokenIds(new Set()), 2000);
					}

					if (callerChanges.size > 0) {
						setCallerChangedIds(callerChanges);
						setTimeout(() => setCallerChangedIds(new Set()), 1500);
					}

					return Array.from(updatedTokens.values());
				});

				// Process public calls if available
				if (publicResult.data?.getPublicCalls?.tokenCalls) {
					const publicTokenCalls = publicResult.data.getPublicCalls.tokenCalls.filter((token) => token.chain === currentChain.name.toUpperCase());

					setProcessedTokens((prev) => {
						return prev.map((token) => {
							const publicToken = publicTokenCalls.find((t) => t.address === token.id);
							if (!publicToken) return token;

							const publicCallers = publicToken.chats.map((chatWithCalls) => ({
								id: chatWithCalls.chat.id,
								name: chatWithCalls.chat.name,
								profileImageUrl: photos[chatWithCalls.chat.id]?.url || DEFAULT_PHOTO,
								timestamp: Date.now(),
								callCount: chatWithCalls.chat.callCount,
								winRate: 0,
								chat: {
									...chatWithCalls.chat,
									type: chatWithCalls.chat.type as "Group" | "Channel" | "Private",
									photoUrl: photos[chatWithCalls.chat.id]?.url || DEFAULT_PHOTO,
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

							return {
								...token,
								callers: mergeCallers(token.callers, publicCallers),
							};
						});
					});
				}
			} catch (error) {
				console.error("Error refreshing token calls:", error);
			}
		};

		// DEX data refresh interval
		const refreshDexData = async () => {
			if (!isInitialLoadComplete.current || expandedTokenId) return;
			if (Date.now() - lastDexFetchTime.current < DEX_REFRESH_INTERVAL) return;

			try {
				const currentProcessedTokens = processedTokensRef.current;

				if (!currentProcessedTokens?.length) {
					return;
				}

				console.log("Processing tokens for refresh, count:", currentProcessedTokens.length);

				const chainTokens = currentProcessedTokens
					.filter((token) => token.tokenCallsData?.chain === currentChain.name.toUpperCase())
					.sort((a, b) => {
						const callerDiff = (b.callers?.length || 0) - (a.callers?.length || 0);
						if (callerDiff !== 0) return callerDiff;

						const bLiquidity = b.dexData?.liquidity?.usd || b.liquidity || 0;
						const aLiquidity = a.dexData?.liquidity?.usd || a.liquidity || 0;
						return bLiquidity - aLiquidity;
					})
					.slice(0, 50)
					.map((token) => token.tokenCallsData)
					.filter((token): token is NonNullable<typeof token> => token !== null);

				if (chainTokens.length === 0) {
					console.log(`No tokens found for chain ${currentChain.name.toUpperCase()}`);
					return;
				}

				console.log(`Refreshing DEX data for ${chainTokens.length} tokens on chain ${currentChain.name.toUpperCase()}`);

				await fetchTokenInfo(chainTokens, true);
				lastDexFetchTime.current = Date.now();
			} catch (error) {
				console.error("Error refreshing DEX data:", error);
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

		// Only set up new intervals if no token is expanded
		if (!expandedTokenId) {
			refreshIntervalRef.current = setInterval(refreshTokenCalls, CALLS_REFRESH_INTERVAL);
			dexRefreshIntervalRef.current = setInterval(refreshDexData, DEX_REFRESH_INTERVAL);

			// Run initial refresh
			refreshTokenCalls();
			refreshDexData();
		}
	}, [currentChain, fetchTokenInfo, refetchCallsByToken, refetchPublicCalls, setNewTokenIds, setCallerChangedIds, setProcessedTokens, mergeCallers, photos, expandedTokenId]);

	// Effect to handle expanded token state changes
	useEffect(() => {
		// When a token is expanded, clear the intervals
		if (expandedTokenId) {
			if (refreshIntervalRef.current) {
				clearInterval(refreshIntervalRef.current);
				refreshIntervalRef.current = null;
			}
			if (dexRefreshIntervalRef.current) {
				clearInterval(dexRefreshIntervalRef.current);
				dexRefreshIntervalRef.current = null;
			}
		} else {
			// When token is collapsed, restart the intervals
			setupRefreshIntervals();
		}
	}, [expandedTokenId, setupRefreshIntervals]);

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

	// Update the useEffect for sorting tokens to track rank and caller changes
	useEffect(() => {
		if (processedTokens.length > 0) {
			const sortedTokens = [...processedTokens].sort((a, b) => {
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

			setSortedTokens(sortedTokens);
		}
	}, [sortField, sortDirection, processedTokens]);

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
																		src={caller.profileImageUrl}
																		alt={caller.name || "Caller"}
																		width={42}
																		height={42}
																		className={styles.callerImage}
																		onError={(e) => {
																			const target = e.target as HTMLImageElement;
																			target.src = "/assets/KiFi_LOGO.jpg";
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
