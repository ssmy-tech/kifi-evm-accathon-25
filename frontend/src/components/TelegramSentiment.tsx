"use client";
import React from "react";
import styles from "./TelegramSentiment.module.css";
import { FaTelegramPlane } from "react-icons/fa";

interface TelegramSentimentProps {
	summary: string;
	sentiment: "positive" | "negative" | "neutral";
	count: number;
	positiveSplit: number;
	negativeSplit: number;
}

export default function TelegramSentiment({ summary, sentiment, count, positiveSplit, negativeSplit }: TelegramSentimentProps) {
	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<div className={styles.titleWithIcon}>
						<FaTelegramPlane className={styles.telegramIcon} />
						<h3>Telegram Sentiment</h3>
					</div>
				</div>
				{count > 0 && (
					<div className={styles.sentimentSplit}>
						<span className={styles.positiveSplit}>{positiveSplit}%</span>
						<span className={styles.splitDivider}>/</span>
						<span className={styles.negativeSplit}>{negativeSplit}%</span>
					</div>
				)}
				<span className={styles.messageCount}>{count.toLocaleString()} messages analyzed</span>
			</div>
			<div className={`${styles.summary} ${styles[sentiment]}`}>{summary}</div>
		</div>
	);
}
