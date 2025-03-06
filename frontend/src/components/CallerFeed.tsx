import React, { useState, useRef, useEffect } from "react";
import { FaUsers } from "react-icons/fa";
import styles from "./CallerFeed.module.css";
import { formatTimestamp } from "@/utils/formatters";
import Image from "next/image";
import { Caller } from "@/types/caller.types";

interface CallerFeedProps {
	callers: Caller[];
	title?: string;
	isLoading?: boolean;
}

export default function CallerFeed({ callers, title = "Token Callers", isLoading = false }: CallerFeedProps) {
	const [sortField, setSortField] = useState<keyof Caller>("timestamp");
	const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
	const [expandedCallerId, setExpandedCallerId] = useState<string | null>(null);
	const [closingCallerId, setClosingCallerId] = useState<string | null>(null);
	const tableContainerRef = useRef<HTMLDivElement>(null);

	const handleSort = (field: keyof Caller) => {
		if (field === sortField) {
			setSortDirection(sortDirection === "asc" ? "desc" : "asc");
		} else {
			setSortField(field);
			setSortDirection("desc");
		}
	};

	const toggleExpandCaller = (callerId: string) => {
		if (expandedCallerId === callerId) {
			setClosingCallerId(callerId);
			setTimeout(() => {
				setExpandedCallerId(null);
				setClosingCallerId(null);
			}, 300); // Match animation duration
		} else {
			setExpandedCallerId(callerId);
		}
	};

	useEffect(() => {
		if (expandedCallerId && tableContainerRef.current) {
			const expandedRow = tableContainerRef.current.querySelector(`[data-caller-id="${expandedCallerId}"]`);
			if (expandedRow) {
				expandedRow.scrollIntoView({ behavior: "smooth", block: "nearest" });
			}
		}
	}, [expandedCallerId]);

	const sortedCallers = [...(callers || [])].sort((a, b) => {
		// Special case for message field - sort by presence of message first, then by timestamp
		if (sortField === "message") {
			// If one has a message and the other doesn't
			if (Boolean(a.message) !== Boolean(b.message)) {
				// If descending, messages first; if ascending, non-messages first
				return sortDirection === "desc" ? (a.message ? -1 : 1) : a.message ? 1 : -1;
			}

			// If both have messages or both don't, sort by timestamp as secondary criteria
			const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
			const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
			return sortDirection === "desc" ? aTime - bTime : bTime - aTime;
		}

		const aValue = a[sortField];
		const bValue = b[sortField];

		if (!aValue && !bValue) return 0;
		if (!aValue) return sortDirection === "asc" ? -1 : 1;
		if (!bValue) return sortDirection === "asc" ? 1 : -1;

		if (typeof aValue === "number" && typeof bValue === "number") {
			return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
		}

		const aString = String(aValue);
		const bString = String(bValue);
		return sortDirection === "asc" ? aString.localeCompare(bString) : bString.localeCompare(aString);
	});

	return (
		<div className={`${styles.container} ${styles.callerFeedContainer}`}>
			<h2 className={styles.title}>
				<FaUsers className={styles.titleIcon} />
				{title} ({callers?.length})
			</h2>

			<div className={styles.scrollContainer}>
				{isLoading ? (
					<div className={styles.loading}>Loading callers...</div>
				) : sortedCallers.length === 0 ? (
					<div className={styles.empty}>No callers found</div>
				) : (
					<div className={styles.tableContainer} ref={tableContainerRef}>
						<table className={styles.table}>
							<thead>
								<tr>
									<th className={styles.imageHeader}></th>
									{callers?.some((caller) => caller.name) && (
										<th onClick={() => handleSort("name")} className={`${styles.sortable} ${styles.nameColumn}`}>
											Caller
											{sortField === "name" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
									{callers?.some((caller) => caller.timestamp) && (
										<th onClick={() => handleSort("timestamp")} className={`${styles.sortable} ${styles.timestampColumn}`}>
											Timestamp
											{sortField === "timestamp" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
									{callers?.some((caller) => caller.callCount) && (
										<th onClick={() => handleSort("callCount")} className={`${styles.sortable} ${styles.countColumn}`}>
											Call Count
											{sortField === "callCount" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
									{callers?.some((caller) => caller.winRate !== undefined) && (
										<th onClick={() => handleSort("winRate")} className={`${styles.sortable} ${styles.rateColumn}`}>
											Win Rate
											{sortField === "winRate" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
									{callers?.some((caller) => caller.message) && (
										<th onClick={() => handleSort("message")} className={`${styles.sortable} ${styles.messageHeader}`}>
											Message(s)
											{sortField === "message" && <span className={styles.sortIcon}>{sortDirection === "asc" ? " ↑" : " ↓"}</span>}
										</th>
									)}
								</tr>
							</thead>
							<tbody className={styles.tableBody}>
								{sortedCallers.map((caller) => (
									<React.Fragment key={caller.id}>
										<tr className={`${styles.callerRow} ${caller.message ? styles.hasMessage : ""}`} onClick={() => caller.message && toggleExpandCaller(caller.id)} style={caller.message ? { cursor: "pointer" } : {}}>
											<td className={styles.imageCell}>
												<div className={styles.profileImage}>
													<Image src={caller.profileImageUrl} alt={`Caller ${caller.id}`} width={32} height={32} className={styles.avatar} />
												</div>
											</td>
											{callers?.some((caller) => caller.name) && <td className={styles.nameColumn}>{caller.name || "-"}</td>}
											{callers?.some((caller) => caller.timestamp) && <td className={styles.timestampColumn}>{caller.timestamp ? <span className={styles.timestamp}>{formatTimestamp(caller.timestamp, false, true)}</span> : "-"}</td>}
											{callers?.some((caller) => caller.callCount) && <td className={styles.countColumn}>{caller.callCount?.toLocaleString() || "-"}</td>}
											{callers?.some((caller) => caller.winRate !== undefined) && <td className={styles.rateColumn}>{caller.winRate !== undefined ? `${caller.winRate}%` : "-"}</td>}
											{callers?.some((caller) => caller.message) && <td className={styles.messageCell}>{caller.message ? <div className={styles.viewButton}>{expandedCallerId === caller.id ? "Hide" : "View"}</div> : "None"}</td>}
										</tr>
										{expandedCallerId === caller.id && caller.message && (
											<tr className={`${styles.messageRow} ${closingCallerId === caller.id ? styles.closing : ""}`} data-caller-id={caller.id}>
												<td colSpan={6}>
													<div className={styles.messageContentWrapper}>
														<div className={styles.messageContent}>{caller.message}</div>
													</div>
												</td>
											</tr>
										)}
									</React.Fragment>
								))}
							</tbody>
						</table>
					</div>
				)}
			</div>
		</div>
	);
}
