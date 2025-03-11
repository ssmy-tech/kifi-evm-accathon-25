"use client";
import React, { useEffect, useState } from "react";
import styles from "./TelegramSentiment.module.css";
import { FaTelegramPlane } from "react-icons/fa";
import { useGetTelegramContractAnalyticsQuery } from "@/generated/graphql";

interface TelegramSentimentProps {
	contractAddress: string;
}

export default function TelegramSentiment({ contractAddress }: TelegramSentimentProps) {
	const [messageCount, setMessageCount] = useState(0);
	const [summary, setSummary] = useState("");

	const { data, loading, error } = useGetTelegramContractAnalyticsQuery({
		variables: {
			input: {
				contractAddress,
			},
		},
		skip: !contractAddress,
	});

	useEffect(() => {
		if (data?.getTelegramContractAnalytics.summary) {
			const sentimentData = data.getTelegramContractAnalytics.summary;
			setSummary(sentimentData);
		}
	}, [data]);

	if (loading) {
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<div className={styles.titleGroup}>
						<div className={styles.titleWithIcon}>
							<FaTelegramPlane className={styles.telegramIcon} />
							<h3>Telegram Sentiment</h3>
						</div>
					</div>
				</div>
				<div className={`${styles.summary} ${styles.neutral}`}>Loading sentiment analysis...</div>
			</div>
		);
	}

	if (error) {
		console.error(error);
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<div className={styles.titleGroup}>
						<div className={styles.titleWithIcon}>
							<FaTelegramPlane className={styles.telegramIcon} />
							<h3>Telegram Sentiment</h3>
						</div>
					</div>
				</div>
				<div className={`${styles.summary} ${styles.neutral}`}>Error loading sentiment analysis</div>
			</div>
		);
	}
	console.log(data?.getTelegramContractAnalytics);

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<div className={styles.titleWithIcon}>
						<FaTelegramPlane className={styles.telegramIcon} />
						<h3>Telegram Sentiment</h3>
					</div>
				</div>
			</div>
			<div className={`${styles.summary}`}>{summary}</div>
		</div>
	);
}
