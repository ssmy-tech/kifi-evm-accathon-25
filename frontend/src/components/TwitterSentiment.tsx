import React from "react";
import styles from "./TwitterSentiment.module.css";
import { FaXTwitter } from "react-icons/fa6";

interface TwitterSentimentProps {
	summary: string;
	sentiment: "positive" | "negative" | "neutral";
	count: number;
	positiveSplit: number;
	negativeSplit: number;
}

export default function TwitterSentiment({ summary, sentiment, count, positiveSplit, negativeSplit }: TwitterSentimentProps) {
	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<div className={styles.titleWithIcon}>
						<FaXTwitter className={styles.xIcon} />
						<h3>Twitter Sentiment</h3>
					</div>
				</div>
				{count > 0 && (
					<div className={styles.sentimentSplit}>
						<span className={styles.positiveSplit}>{positiveSplit}%</span>
						<span className={styles.splitDivider}>/</span>
						<span className={styles.negativeSplit}>{negativeSplit}%</span>
					</div>
				)}
				<span className={styles.tweetCount}>{count.toLocaleString()} tweets analyzed</span>
			</div>
			<div className={`${styles.summary} ${styles[sentiment]}`}>{summary}</div>
		</div>
	);
}
