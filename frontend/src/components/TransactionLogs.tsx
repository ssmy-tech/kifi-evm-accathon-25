"use client";

import styles from "./TransactionLogs.module.css";
import { truncateHash, formatTimeAgo, formatTimestamp } from "@/utils/formatters";
import { FiExternalLink } from "react-icons/fi";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { useGetUserTradesQuery } from "@/generated/graphql";
import { useChain } from "@/contexts/ChainContext";
import { getExplorerUrl } from "@/utils/blockchain";
import { TokenData, Trade, Transaction, TransactionStatus } from "@/types/transaction.types";

type SortField = "time" | "type" | "token" | "amount" | "condition" | "status" | "hash";
type SortDirection = "asc" | "desc";

interface SortConfig {
	field: SortField;
	direction: SortDirection;
}

// Add timestamp cache to avoid repeated RPC calls
const timestampCache = new Map<string, Date>();
const failedTimestampFetches = new Set<string>();

const ALCHEMY_URL = "https://monad-testnet.g.alchemy.com/v2/PrY4uuc2p07xAobPjrxREtjUkFYCQjMw";
const DELAY_BETWEEN_CALLS = 200;
const MAX_RETRIES = 3;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Add new function to fetch transaction timestamp with queue
async function fetchTimestampsInQueue(trades: Transaction[], chainName: string, onUpdate: (txHash: string, timestamp: Date) => void, onStatusUpdate: (txHash: string, status: TransactionStatus) => void) {
	// First, try to fetch timestamps for transactions that failed before
	const retryTrades = trades.filter((trade) => failedTimestampFetches.has(trade.txHash));
	for (const trade of retryTrades) {
		failedTimestampFetches.delete(trade.txHash);
	}

	// Process all trades (including retries)
	for (const trade of trades) {
		if (!trade.txHash) continue;

		// Check cache first
		if (timestampCache.has(trade.txHash)) {
			onUpdate(trade.txHash, timestampCache.get(trade.txHash)!);
			continue;
		}

		let retryCount = 0;
		let success = false;

		while (retryCount < MAX_RETRIES && !success) {
			try {
				const receiptResponse = await fetch(ALCHEMY_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: "eth_getTransactionReceipt",
						params: [trade.txHash],
					}),
				});

				if (!receiptResponse.ok) {
					throw new Error(`HTTP error! status: ${receiptResponse.status}`);
				}

				const receiptData = await receiptResponse.json();

				if (receiptData.error) {
					throw new Error(`RPC error: ${receiptData.error.message}`);
				}

				if (!receiptData?.result?.blockNumber) {
					onStatusUpdate(trade.txHash, "pending");
					throw new Error("Transaction not confirmed yet");
				}

				// Get block details to get timestamp
				const blockResponse = await fetch(ALCHEMY_URL, {
					method: "POST",
					headers: {
						"Content-Type": "application/json",
					},
					body: JSON.stringify({
						jsonrpc: "2.0",
						id: 1,
						method: "eth_getBlockByNumber",
						params: [receiptData.result.blockNumber, false],
					}),
				});

				if (!blockResponse.ok) {
					throw new Error(`HTTP error! status: ${blockResponse.status}`);
				}

				const blockData = await blockResponse.json();

				if (blockData.error) {
					throw new Error(`RPC error: ${blockData.error.message}`);
				}

				if (!blockData?.result?.timestamp) {
					throw new Error("No timestamp found in block");
				}

				// Convert hex timestamp to decimal and then to Date
				const timestamp = parseInt(blockData.result.timestamp, 16);
				const date = new Date(timestamp * 1000);

				// Cache the result
				timestampCache.set(trade.txHash, date);
				onUpdate(trade.txHash, date);
				onStatusUpdate(trade.txHash, "completed");
				success = true;
			} catch (error) {
				console.error(`Error fetching timestamp for ${trade.txHash} (attempt ${retryCount + 1}/${MAX_RETRIES}):`, error);
				retryCount++;

				if (retryCount === MAX_RETRIES) {
					failedTimestampFetches.add(trade.txHash);
					console.error(`Failed to fetch timestamp for ${trade.txHash} after ${MAX_RETRIES} attempts`);
				}

				await delay(DELAY_BETWEEN_CALLS);
			}
		}

		// Add delay before next transaction
		await delay(DELAY_BETWEEN_CALLS);
	}
}

export function TransactionLogs() {
	const [showAbsoluteTime, setShowAbsoluteTime] = useState<string | null>(null);
	const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "time", direction: "desc" });
	const { currentChain } = useChain();
	const [tokenDataCache, setTokenDataCache] = useState<Record<string, TokenData>>({});
	const [isLoadingTokens, setIsLoadingTokens] = useState(false);
	const [transactionsWithTimestamp, setTransactions] = useState<Transaction[]>([]);
	const [isInitialLoad, setIsInitialLoad] = useState(true);
	const [isLoadingTimestamps, setIsLoadingTimestamps] = useState(false);

	const { data, loading, error } = useGetUserTradesQuery();

	const formatTokenAmount = (amount: string, decimals: number = 18): string => {
		try {
			const value = BigInt(amount);
			const divisor = BigInt(10) ** BigInt(decimals);
			const integerPart = value / divisor;
			const fractionalPart = value % divisor;

			// Convert fractional part to string and pad with leading zeros
			let formattedFractional = fractionalPart.toString().padStart(decimals, "0");

			// Always show 8 decimal places
			formattedFractional = formattedFractional.slice(0, 8);

			// If fractional part is shorter than 8 digits, pad with zeros
			formattedFractional = formattedFractional.padEnd(8, "0");

			return `${integerPart}.${formattedFractional}`;
		} catch (error) {
			console.error("Error formatting amount:", error);
			return amount;
		}
	};

	const processTradesData = useCallback(
		(trades: Trade[]) => {
			const processedTrades = trades
				.map((trade) => {
					const tokenData = tokenDataCache[trade.tokenAddress];
					// Skip trades without valid token data
					if (!tokenData?.ticker) return null;

					const processed: Transaction = {
						txHash: trade.entryTxHash || "",
						timestamp: new Date(),
						type: "BUY",
						token: trade.tokenAddress,
						tokenData,
						amount: trade.amount,
						formattedAmount: formatTokenAmount(trade.amount, tokenData.decimals),
						condition: "Auto Alpha Buy",
						status: "completed",
					};

					return processed;
				})
				.filter((trade): trade is Transaction => trade !== null);

			setTransactions((prev) => {
				// Merge new trades with existing timestamps
				return processedTrades.map((newTrade) => {
					const existingTrade = prev.find((t) => t.txHash === newTrade.txHash);
					if (existingTrade?.timestamp) {
						return { ...newTrade, timestamp: existingTrade.timestamp };
					}
					return newTrade;
				});
			});

			return processedTrades;
		},
		[tokenDataCache]
	);

	// Handle initial data processing and token fetching
	useEffect(() => {
		const trades = data?.getUserTrades?.trades;
		if (!trades || !isInitialLoad) return;

		const processedTrades = processTradesData(trades);

		// Start fetching token data for trades that don't have it
		const uniqueTokens = [...new Set(trades.map((t) => t.tokenAddress))];
		const tokensToFetch = uniqueTokens.filter((token) => !tokenDataCache[token]);

		if (tokensToFetch.length > 0) {
			setIsLoadingTokens(true);

			Promise.all(
				tokensToFetch.map(async (token) => {
					try {
						const response = await fetch(`https://api.kuru.io/api/v2/markets/search?limit=100&q=${token}`);
						const data = await response.json();

						if (data?.success && data?.data?.data?.[0]) {
							const tokenInfo = data.data.data[0].basetoken;
							if (tokenInfo.ticker && tokenInfo.name) {
								const tokenData = {
									name: tokenInfo.name,
									ticker: "$" + tokenInfo.ticker,
									imageUrl: tokenInfo.imageurl || "/assets/coin.png",
									decimals: tokenInfo.decimal || 18,
								};
								setTokenDataCache((prev) => ({ ...prev, [token]: tokenData }));
							}
						}
					} catch (error) {
						console.error("Error fetching token data:", error);
					}
				})
			).finally(() => {
				setIsLoadingTokens(false);
				setIsInitialLoad(false);
			});
		} else {
			setIsInitialLoad(false);
		}

		// Start fetching timestamps with queue
		if (processedTrades.length > 0) {
			setIsLoadingTimestamps(true);
			fetchTimestampsInQueue(
				processedTrades,
				currentChain.name,
				(txHash, timestamp) => {
					setTransactions((prev) => prev.map((t) => (t.txHash === txHash ? { ...t, timestamp } : t)));
				},
				(txHash, status) => {
					setTransactions((prev) => prev.map((t) => (t.txHash === txHash ? { ...t, status } : t)));
				}
			).finally(() => {
				setIsLoadingTimestamps(false);
			});
		}
	}, [data, tokenDataCache, currentChain.name, processTradesData, isInitialLoad]);

	// Add effect to retry failed timestamp fetches periodically
	useEffect(() => {
		if (failedTimestampFetches.size > 0 && !isLoadingTimestamps) {
			const retryInterval = setInterval(() => {
				const tradesWithFailedTimestamps = transactionsWithTimestamp.filter((tx) => failedTimestampFetches.has(tx.txHash));

				if (tradesWithFailedTimestamps.length > 0) {
					setIsLoadingTimestamps(true);
					fetchTimestampsInQueue(
						tradesWithFailedTimestamps,
						currentChain.name,
						(txHash, timestamp) => {
							setTransactions((prev) => prev.map((t) => (t.txHash === txHash ? { ...t, timestamp } : t)));
						},
						(txHash, status) => {
							setTransactions((prev) => prev.map((t) => (t.txHash === txHash ? { ...t, status } : t)));
						}
					).finally(() => {
						setIsLoadingTimestamps(false);
					});
				} else {
					clearInterval(retryInterval);
				}
			}, 5000); // Retry every 5 seconds

			return () => clearInterval(retryInterval);
		}
	}, [isLoadingTimestamps, transactionsWithTimestamp, currentChain.name]);

	// Only monad supported currently for CAA
	if (currentChain.name.toUpperCase() !== "MONAD") {
		return (
			<div className={styles.container}>
				<div className={styles.tableContainer}>
					<table className={styles.table}>
						<thead>
							<tr>
								<th>Time</th>
								<th>Type</th>
								<th className={styles.leftAlign}>Token</th>
								<th className={styles.rightAlign}>Amount</th>
								<th className={styles.rightAlign}>Condition</th>
								<th className={styles.rightAlign}>Status</th>
								<th className={styles.rightAlign}>TXN Hash</th>
							</tr>
						</thead>
						<tbody>
							<tr>
								<td colSpan={7} className={styles.emptyRow}>
									No transactions to display
								</td>
							</tr>
						</tbody>
					</table>
				</div>
			</div>
		);
	}

	if (loading) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner} />
				<div className={styles.loadingText}>Loading transactions...</div>
			</div>
		);
	}

	if (isLoadingTokens && isInitialLoad) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner} />
				<div className={styles.loadingText}>Loading token data...</div>
			</div>
		);
	}

	if (error) {
		return <div className={styles.container}>Error loading transactions: {error.message}</div>;
	}

	const handleSort = (field: SortField) => {
		setSortConfig((prevConfig) => ({
			field,
			direction: prevConfig.field === field && prevConfig.direction === "asc" ? "desc" : "asc",
		}));
	};

	const getSortIcon = (field: SortField) => {
		if (sortConfig.field !== field) return <FaSort className={styles.sortIcon} />;
		return sortConfig.direction === "asc" ? <FaSortUp className={styles.sortIcon} /> : <FaSortDown className={styles.sortIcon} />;
	};

	const sortedTransactions = [...transactionsWithTimestamp].sort((a, b) => {
		const direction = sortConfig.direction === "asc" ? 1 : -1;

		switch (sortConfig.field) {
			case "time":
				return direction * (a.timestamp.getTime() - b.timestamp.getTime());
			case "type":
				return direction * a.type.localeCompare(b.type);
			case "token":
				return direction * a.token.localeCompare(b.token);
			case "amount":
				return direction * (parseFloat(a.amount) - parseFloat(b.amount));
			case "condition":
				return direction * a.condition.localeCompare(b.condition);
			case "status":
				return direction * a.status.localeCompare(b.status);
			case "hash":
				return direction * a.txHash.localeCompare(b.txHash);
			default:
				return 0;
		}
	});

	return (
		<div className={styles.container}>
			<div className={styles.tableContainer}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>
								<div onClick={() => handleSort("time")} className={styles.sortableHeader}>
									<span>Time</span> {getSortIcon("time")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("type")} className={styles.sortableHeader}>
									<span>Type</span> {getSortIcon("type")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("token")} className={`${styles.sortableHeader} ${styles.leftAlign}`}>
									<span>Token</span> {getSortIcon("token")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("amount")} className={`${styles.sortableHeader} ${styles.rightAlign}`}>
									<span>Amount</span> {getSortIcon("amount")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("condition")} className={`${styles.sortableHeader} ${styles.rightAlign}`}>
									<span>Condition</span> {getSortIcon("condition")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("status")} className={`${styles.sortableHeader} ${styles.rightAlign}`}>
									<span>Status</span> {getSortIcon("status")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("hash")} className={`${styles.sortableHeader} ${styles.rightAlign}`}>
									<span>TXN Hash</span> {getSortIcon("hash")}
								</div>
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedTransactions.map((tx) => (
							<tr key={tx.txHash}>
								<td className={styles.timeCell}>
									<span className={`${styles.timestamp} ${showAbsoluteTime === tx.txHash ? styles.showAbsolute : ""}`} onClick={() => setShowAbsoluteTime(showAbsoluteTime === tx.txHash ? null : tx.txHash)}>
										<span className={styles.relativeTime}>{formatTimeAgo(tx.timestamp)}</span>
										<span className={styles.absoluteTime}>{formatTimestamp(tx.timestamp, false, true)}</span>
									</span>
								</td>
								<td>
									<span className={`${styles.type} ${styles[tx.type.toLowerCase()]}`}>{tx.type}</span>
								</td>
								<td>
									<div className={styles.tokenInfo}>
										{tx.tokenData && (
											<div className={styles.imageContainer}>
												<Image
													src={tx.tokenData.imageUrl}
													alt={tx.tokenData.name}
													width={24}
													height={24}
													className={styles.tokenImage}
													onError={(e) => {
														const target = e.target as HTMLImageElement;
														target.src = "/assets/coin.png";
													}}
												/>
											</div>
										)}
										<span className={styles.tokenTicker}>{tx.tokenData?.ticker || truncateHash(tx.token)}</span>
									</div>
								</td>
								<td className={styles.amountCell}>{tx.formattedAmount || tx.amount}</td>
								<td>
									{tx.condition === "Auto Alpha Buy" ? (
										<div className={styles.autoAlphaContainer}>
											{tx.callers && tx.callers.length > 0 && (
												<div className={styles.callersContainer}>
													{tx.callers.slice(0, 5).map((caller, i) => (
														<div key={caller.id} className={styles.callerImageWrapper} style={{ zIndex: 5 - i }}>
															<Image src={caller.profileImageUrl} alt="Caller" width={32} height={32} className={styles.callerImage} />
														</div>
													))}
													{tx.callers.length > 5 && <div className={styles.extraCallersCount}>+{tx.callers.length - 5}</div>}
												</div>
											)}
											<span className={`${styles.condition} ${styles.autoAlpha}`}>{tx.condition}</span>
										</div>
									) : (
										<span className={`${styles.condition} ${styles.manual}`}>
											{tx.condition} {tx.type}
										</span>
									)}
								</td>
								<td>
									<span className={`${styles.status} ${styles[tx.status]}`}>{tx.status}</span>
								</td>
								<td>
									<a href={getExplorerUrl(currentChain.id, tx.txHash)} target="_blank" rel="noopener noreferrer" className={styles.hashLink}>
										{truncateHash(tx.txHash)}
										<FiExternalLink className={styles.externalIcon} />
									</a>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
}
