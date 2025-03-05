"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./TokenFeed.module.css";
import { FaTelegramPlane } from "react-icons/fa";
import { formatDistanceToNow } from "date-fns";
import { formatCurrency, formatPercentage } from "../utils/formatters";
import { Token, TokenFeedProps, SortField, SortDirection } from "../types/token.types";

const TokenFeed: React.FC<TokenFeedProps> = ({ tokens }) => {
	const [sortField, setSortField] = useState<SortField>("callers");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
	const [sortedTokens, setSortedTokens] = useState<Token[]>(tokens);

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

	const formatMarketCap = (marketCap: number): string => {
		if (marketCap >= 1_000_000_000) {
			return `$${(marketCap / 1_000_000_000).toFixed(2)}B`;
		} else if (marketCap >= 1_000_000) {
			return `$${(marketCap / 1_000_000).toFixed(2)}M`;
		} else if (marketCap >= 1_000) {
			return `$${(marketCap / 1_000).toFixed(2)}K`;
		}
		return `$${marketCap.toFixed(2)}`;
	};

	const abbreviateAge = (createdAt: string): string => {
		const now = new Date();
		const created = new Date(createdAt);
		const diffYears = now.getFullYear() - created.getFullYear();

		if (diffYears > 0) {
			return `${diffYears}y`;
		}

		const diffMonths = now.getMonth() - created.getMonth() + 12 * (now.getFullYear() - created.getFullYear());
		if (diffMonths > 0) {
			return `${diffMonths}m`;
		}

		const diffDays = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
		if (diffDays > 0) {
			return `${diffDays}d`;
		}

		const diffHours = Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60));
		if (diffHours > 0) {
			return `${diffHours}h`;
		}

		const diffMinutes = Math.floor((now.getTime() - created.getTime()) / (1000 * 60));
		if (diffMinutes > 0) {
			return `${diffMinutes}m`;
		}

		return `${Math.floor((now.getTime() - created.getTime()) / 1000)}s`;
	};

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
							<tr key={token.id} className={styles.tokenRow}>
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
						))}
					</tbody>
				</table>
			</div>
		</div>
	);
};

export default TokenFeed;
