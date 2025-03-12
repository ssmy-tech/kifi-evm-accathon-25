"use client";
import React from "react";
import Image from "next/image";
import { FaTelegramPlane } from "react-icons/fa";
import styles from "./BlurredPreviewTable.module.css";
import { formatCurrency, formatPercentage, abbreviateAge } from "../utils/formatters";

const DEFAULT_PHOTO = "/assets/KiFi_LOGO.jpg";

const MOCK_TOKENS = [
	{
		id: "mock1",
		name: "Sample Token",
		ticker: "SAMPLE",
		price: 0.00023,
		liquidity: 250000,
		volume: 890000,
		marketCap: 1200000,
		change24h: 12.5,
		callers: Array(3).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date().toISOString(),
	},
	{
		id: "mock2",
		name: "Demo Token",
		ticker: "DEMO",
		price: 1.23,
		liquidity: 890000,
		volume: 1500000,
		marketCap: 5600000,
		change24h: -5.2,
		callers: Array(4).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date().toISOString(),
	},
	{
		id: "mock3",
		name: "Test Token",
		ticker: "TEST",
		price: 0.0456,
		liquidity: 450000,
		volume: 980000,
		marketCap: 2300000,
		change24h: 28.4,
		callers: Array(2).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date().toISOString(),
	},
	{
		id: "mock4",
		name: "Pepe Finance",
		ticker: "PEPE",
		price: 0.000000089,
		liquidity: 1200000,
		volume: 3400000,
		marketCap: 8900000,
		change24h: 145.8,
		callers: Array(6).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock5",
		name: "Meta AI",
		ticker: "META",
		price: 2.45,
		liquidity: 2800000,
		volume: 5600000,
		marketCap: 12000000,
		change24h: -8.3,
		callers: Array(5).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock6",
		name: "DeFi King",
		ticker: "KING",
		price: 0.0078,
		liquidity: 680000,
		volume: 1200000,
		marketCap: 3400000,
		change24h: 32.1,
		callers: Array(3).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock7",
		name: "Quantum Chain",
		ticker: "QNTM",
		price: 0.567,
		liquidity: 920000,
		volume: 2100000,
		marketCap: 4500000,
		change24h: -12.4,
		callers: Array(4).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock8",
		name: "Moon Shot",
		ticker: "MOON",
		price: 0.00000145,
		liquidity: 340000,
		volume: 890000,
		marketCap: 1800000,
		change24h: 234.5,
		callers: Array(7).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock9",
		name: "Cyber Security",
		ticker: "CYBER",
		price: 1.89,
		liquidity: 1500000,
		volume: 2800000,
		marketCap: 6700000,
		change24h: 15.7,
		callers: Array(4).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock10",
		name: "GameFi Pro",
		ticker: "GAME",
		price: 0.0234,
		liquidity: 780000,
		volume: 1600000,
		marketCap: 3900000,
		change24h: -18.9,
		callers: Array(3).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 6 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock11",
		name: "NFT World",
		ticker: "NFTW",
		price: 0.00789,
		liquidity: 560000,
		volume: 1100000,
		marketCap: 2800000,
		change24h: 45.3,
		callers: Array(5).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock12",
		name: "Smart Chain",
		ticker: "SMART",
		price: 0.456,
		liquidity: 980000,
		volume: 2300000,
		marketCap: 5100000,
		change24h: -25.6,
		callers: Array(4).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
	},
	{
		id: "mock13",
		name: "Yield Farm",
		ticker: "YIELD",
		price: 0.0891,
		liquidity: 670000,
		volume: 1400000,
		marketCap: 3200000,
		change24h: 8.9,
		callers: Array(3).fill({ profileImageUrl: DEFAULT_PHOTO }),
		createdAt: new Date(Date.now() - 9 * 24 * 60 * 60 * 1000).toISOString(),
	},
].map((token, index) => ({ ...token, rank: index + 1 }));

export const BlurredPreviewTable: React.FC = () => {
	return (
		<div className={styles.previewTableContainer}>
			<table className={styles.tokenTable}>
				<thead>
					<tr className={styles.tableHeader}>
						<th className={`${styles.headerCell} ${styles.narrowColumn} ${styles.centerHeader}`}>Rank</th>
						<th className={`${styles.headerCell} ${styles.wideColumn} ${styles.leftAligned}`}>Token</th>
						<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>Age</th>
						<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>Price</th>
						<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>Liquidity</th>
						<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>Volume</th>
						<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>Market Cap</th>
						<th className={`${styles.headerCell} ${styles.regularColumn} ${styles.metricsGroup}`}>24H %</th>
						<th className={`${styles.headerCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.callersGroup}`}>
							<div className={styles.callersHeader}>
								<FaTelegramPlane className={styles.telegramIcon} />
								<span>Callers</span>
							</div>
						</th>
					</tr>
				</thead>
				<tbody>
					{MOCK_TOKENS.map((token) => (
						<tr key={token.id} className={styles.tokenRow}>
							<td className={`${styles.cell} ${styles.indexCell} ${styles.narrowColumn} ${styles.centerAligned}`}>{token.rank}</td>
							<td className={`${styles.cell} ${styles.tokenCell} ${styles.wideColumn} ${styles.leftAligned}`}>
								<div className={styles.tokenInfo}>
									<div className={styles.imageContainer}>
										<Image src={DEFAULT_PHOTO} alt={token.name} width={42} height={42} className={styles.tokenImage} />
									</div>
									<div className={styles.nameContainer}>
										<div className={styles.tokenName}>{token.name}</div>
										<div className={styles.tokenTicker}>{token.ticker}</div>
									</div>
								</div>
							</td>
							<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{abbreviateAge(token.createdAt)}</td>
							<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.price, 10, true)}</td>
							<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.liquidity)}</td>
							<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.volume)}</td>
							<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup}`}>{formatCurrency(token.marketCap)}</td>
							<td className={`${styles.cell} ${styles.regularColumn} ${styles.metricsGroup} ${token.change24h >= 0 ? styles.positive : styles.negative}`}>
								{token.change24h >= 0 ? "+" : ""}
								{formatPercentage(token.change24h)}
							</td>
							<td className={`${styles.cell} ${styles.callersCell} ${styles.wideColumn} ${styles.leftAligned} ${styles.callersGroup}`}>
								<div className={styles.callersContainer}>
									{token.callers.map((_, i) => (
										<div key={i} className={styles.callerImageWrapper} style={{ zIndex: token.callers.length - i }}>
											<Image src={DEFAULT_PHOTO} alt="Caller" width={42} height={42} className={styles.callerImage} />
										</div>
									))}
								</div>
							</td>
						</tr>
					))}
				</tbody>
			</table>
		</div>
	);
};

export default BlurredPreviewTable;
