"use client";

import styles from "./TransactionLogs.module.css";
import type { Transaction } from "@/types/transaction.types";
import { truncateHash, formatTimeAgo, formatTimestamp } from "@/utils/formatters";
import { FiExternalLink } from "react-icons/fi";
import { useState } from "react";
import Image from "next/image";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";

type SortField = "time" | "type" | "token" | "amount" | "condition" | "status" | "hash";
type SortDirection = "asc" | "desc";

interface SortConfig {
	field: SortField;
	direction: SortDirection;
}

interface TransactionLogsProps {
	transactions: Transaction[];
}

export function TransactionLogs({ transactions }: TransactionLogsProps) {
	const [showAbsoluteTime, setShowAbsoluteTime] = useState<string | null>(null);
	const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "time", direction: "desc" });

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

	const sortedTransactions = [...transactions].sort((a, b) => {
		const direction = sortConfig.direction === "asc" ? 1 : -1;

		switch (sortConfig.field) {
			case "time":
				return direction * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
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
								<div onClick={() => handleSort("token")} className={styles.sortableHeader}>
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
								<td>{tx.token}</td>
								<td>{tx.amount}</td>
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
									<a href={`https://etherscan.io/tx/${tx.txHash}`} target="_blank" rel="noopener noreferrer" className={styles.hashLink}>
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
