"use client";

import styles from "./TransactionLogs.module.css";
import type { Transaction } from "@/types/transaction.types";
import { truncateHash, formatTimeAgo, formatTimestamp } from "@/utils/formatters";
import { FiExternalLink } from "react-icons/fi";
import { useState } from "react";
import Image from "next/image";

interface TransactionLogsProps {
	transactions: Transaction[];
}

export function TransactionLogs({ transactions }: TransactionLogsProps) {
	const [showAbsoluteTime, setShowAbsoluteTime] = useState<string | null>(null);

	return (
		<div className={styles.container}>
			<div className={styles.tableContainer}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>Time</th>
							<th>Type</th>
							<th>Token</th>
							<th>Amount</th>
							<th>Condition</th>
							<th>Status</th>
							<th>TXN HASH</th>
						</tr>
					</thead>
					<tbody>
						{transactions.map((tx) => (
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
											<span className={`${styles.condition} ${styles.autoAlpha}`}>{tx.condition}</span>
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
