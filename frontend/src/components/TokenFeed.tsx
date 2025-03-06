"use client";
import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import styles from "./TokenFeed.module.css";
import { FaTelegramPlane } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency, formatPercentage, abbreviateAge } from "../utils/formatters";
import { Token, TokenFeedProps, SortField, SortDirection } from "../types/token.types";
import { TradingView } from "./TradingView";
import CallerFeed from "./CallerFeed";
import TwitterSentiment from "./TwitterSentiment";
import TelegramSentiment from "./TelegramSentiment";
import TradeModule from "./TradeModule";

const TokenFeed: React.FC<TokenFeedProps> = ({ tokens }) => {
	const [sortField, setSortField] = useState<SortField>("callers");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [sortedTokens, setSortedTokens] = useState<Token[]>(tokens);
	const [expandedTokenId, setExpandedTokenId] = useState<string | null>(null);
	const [closingTokenId, setClosingTokenId] = useState<string | null>(null);
	const timeoutRef = useRef<NodeJS.Timeout | null>(null);

	useEffect(() => {
		const sortedTokens = [...tokens].sort((a, b) => {
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
	}, [sortField, sortDirection, tokens]);

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
												<Image src={token.imageUrl} alt={token.name} width={42} height={42} className={styles.tokenImage} />
											</div>
											<div className={styles.nameContainer}>
												<div className={styles.tokenName}>{token.name}</div>
												<div className={styles.tokenTicker}>{token.ticker}</div>
											</div>
										</div>
									</td>
									<td className={`${styles.cell}  ${styles.regularColumn} ${styles.metricsGroup}`}>{abbreviateAge(token.createdAt)}</td>
									<td className={`${styles.cell} 	 ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.price)}</td>
									<td className={`${styles.cell}  ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.liquidity || 0)}</td>
									<td className={`${styles.cell}  ${styles.regularColumn} ${styles.metricsGroup}`}>{token.volume ? formatCurrency(token.volume) : "-"}</td>
									<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.marketCap)}</td>
									<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup} ${token.change24h >= 0 ? styles.positive : styles.negative}`}>
										{token.change24h >= 0 ? "+" : ""}
										{formatPercentage(token.change24h)}
									</td>
									<td className={`${styles.cell} ${styles.callersCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.callersGroup}`}>
										<div className={styles.callersContainer}>
											{token.callers && token.callers.length > 0 ? (
												<>
													{token.callers.slice(0, 5).map((caller, i) => (
														<div key={caller.id} className={styles.callerImageWrapper} style={{ zIndex: 5 - i }}>
															<Image src={caller.profileImageUrl} alt="Caller" width={42} height={42} className={styles.callerImage} />
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
														<TradingView symbol={token.ticker + "USD"} />
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
