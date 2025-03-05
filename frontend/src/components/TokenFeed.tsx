"use client";
import React, { useState } from "react";
import Image from "next/image";
import styles from "./TokenFeed.module.css";

// Define the Token type
interface Token {
	id: string;
	name: string;
	ticker: string;
	marketCap: number;
	price: number;
	change24h: number;
	imageUrl: string;
	age: string;
	liquidity?: number;
	callers?: {
		id: string;
		profileImageUrl: string;
	}[];
}

// Define sort types
type SortField = "rank" | "age" | "name" | "price" | "liquidity" | "marketCap" | "change24h" | "callers";
type SortDirection = "asc" | "desc";

interface TokenFeedProps {
	tokens: Token[];
}

const TokenFeed: React.FC<TokenFeedProps> = ({ tokens }) => {
	// State for sorting
	const [sortField, setSortField] = useState<SortField>("callers");
	const [sortDirection, setSortDirection] = useState<SortDirection>("desc");

	// Function to format market cap with appropriate suffix (K, M, B)
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

	// Function to abbreviate age
	const abbreviateAge = (age: string): string => {
		const [value, unit] = age.split(" ");
		if (unit === "years" || unit === "year") {
			return `${value}y`;
		} else if (unit === "months" || unit === "month") {
			return `${value}m`;
		} else if (unit === "days" || unit === "day") {
			return `${value}d`;
		}
		return age;
	};

	// Function to handle header click for sorting
	const handleSort = (field: SortField) => {
		if (field === sortField) {
			// Toggle direction if same field
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			// Set new field and default direction
			setSortField(field);
			// Default to descending for numeric values, ascending for text
			if (field === "name" || field === "age") {
				setSortDirection("asc");
			} else {
				setSortDirection("desc");
			}
		}
	};

	// Function to get sort indicator
	const getSortIndicator = (field: SortField) => {
		if (field === sortField) {
			return sortDirection === "asc" ? "↑" : "↓";
		}
		return null;
	};

	// Sort tokens based on current sort field and direction
	const sortedTokens = [...tokens].sort((a, b) => {
		let comparison = 0;

		switch (sortField) {
			case "age":
				// Convert "X years" to number for comparison
				const ageA = parseInt(a.age.split(" ")[0]);
				const ageB = parseInt(b.age.split(" ")[0]);
				comparison = ageA - ageB;
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
			case "callers":
				const aCallers = a.callers?.length || 0;
				const bCallers = b.callers?.length || 0;
				comparison = aCallers - bCallers;
				break;
			default:
				return 0;
		}

		// Apply sort direction
		return sortDirection === "asc" ? comparison : -comparison;
	});

	return (
		<div className={styles.container}>
			<div className={styles.tableContainer}>
				<table className={styles.tokenTable}>
					<thead>
						<tr className={styles.tableHeader}>
							<th className={`${styles.headerCell} ${styles.narrowColumn}`}>Rank</th>
							<th className={`${styles.headerCell} ${styles.tokenGroupHeader} ${styles.expandColumn} ${styles.sortableHeader}`} onClick={() => handleSort("name")}>
								Token {getSortIndicator("name")}
							</th>
							<th className={`${styles.headerCell} ${styles.narrowColumn} ${styles.sortableHeader}`} onClick={() => handleSort("age")}>
								Age {getSortIndicator("age")}
							</th>
							<th className={`${styles.headerCell} ${styles.metricsHeader} ${styles.sortableHeader}`} onClick={() => handleSort("price")}>
								Price {getSortIndicator("price")}
							</th>
							<th className={`${styles.headerCell} ${styles.metricsHeader} ${styles.sortableHeader}`} onClick={() => handleSort("liquidity")}>
								Liquidity {getSortIndicator("liquidity")}
							</th>
							<th className={`${styles.headerCell} ${styles.metricsHeader} ${styles.sortableHeader}`}>Volume</th>
							<th className={`${styles.headerCell} ${styles.metricsHeader} ${styles.sortableHeader}`} onClick={() => handleSort("marketCap")}>
								Market Cap {getSortIndicator("marketCap")}
							</th>
							<th className={`${styles.headerCell} ${styles.metricsHeader} ${styles.sortableHeader}`} onClick={() => handleSort("change24h")}>
								24H % {getSortIndicator("change24h")}
							</th>
							<th className={`${styles.headerCell} ${styles.sortableHeader}`} onClick={() => handleSort("callers")}>
								<div className={styles.callersHeader}>
									<Image src="https://static.vecteezy.com/system/resources/previews/020/964/381/non_2x/telegram-circle-icon-for-web-design-free-png.png" alt="Telegram" width={22} height={22} className={styles.telegramIcon} />
									<span>Callers {getSortIndicator("callers")}</span>
								</div>
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedTokens.map((token, index) => (
							<tr key={token.id} className={styles.tokenRow}>
								<td className={`${styles.indexCell} ${styles.narrowColumn}`}>{index + 1}</td>
								<td className={`${styles.tokenCell} ${styles.expandColumn}`}>
									<div className={styles.tokenInfo}>
										<div className={styles.imageContainer}>
											<Image src={token.imageUrl} alt={token.name} width={52} height={52} className={styles.tokenImage} />
										</div>
										<div className={styles.nameContainer}>
											<div className={styles.tokenName}>{token.name}</div>
											<div className={styles.tokenTicker}>{token.ticker}</div>
										</div>
									</div>
								</td>
								<td className={`${styles.ageCell} ${styles.narrowColumn}`}>{abbreviateAge(token.age)}</td>
								<td className={`${styles.priceCell} ${styles.metricsCell}`}>${token.price.toFixed(2)}</td>
								<td className={`${styles.liquidityCell} ${styles.metricsCell}`}>{formatMarketCap(token.liquidity || 0)}</td>
								<td className={`${styles.volumeCell} ${styles.metricsCell}`}>-</td>
								<td className={`${styles.marketCapCell} ${styles.metricsCell}`}>{formatMarketCap(token.marketCap)}</td>
								<td className={`${styles.changeCell} ${styles.metricsCell} ${token.change24h >= 0 ? styles.positive : styles.negative}`}>
									{token.change24h >= 0 ? "+" : ""}
									{token.change24h.toFixed(2)}%
								</td>
								<td className={styles.callersCell}>
									<div className={styles.callersContainer}>
										{token.callers && token.callers.length > 0 ? (
											<>
												{token.callers.slice(0, 5).map((caller, i) => (
													<div key={caller.id} className={styles.callerImageWrapper} style={{ zIndex: 5 - i }}>
														<Image src={caller.profileImageUrl} alt="Caller" width={52} height={52} className={styles.callerImage} />
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
