"use client";
import React, { useEffect, useState, memo, useMemo } from "react";
import styles from "./TelegramSentiment.module.css";
import { FaTelegramPlane } from "react-icons/fa";
import { useGetTelegramContractAnalyticsQuery } from "@/generated/graphql";

interface TelegramSentimentProps {
	contractAddress: string;
}

const TelegramSentiment = memo(
	function TelegramSentiment({ contractAddress }: TelegramSentimentProps) {
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
				setSummary(data.getTelegramContractAnalytics.summary);
			}
		}, [data]);

		// Memoize the content based on loading, error, and summary states
		const content = useMemo(() => {
			if (loading) {
				return <div className={`${styles.summary}`}>Loading sentiment analysis...</div>;
			}

			if (error) {
				console.error(error);
				return <div className={`${styles.summary} ${styles.neutral}`}>Error loading sentiment analysis</div>;
			}

			return <div className={`${styles.summary}`}>{summary}</div>;
		}, [loading, error, summary]);

		// Memoize the header since it's static
		const header = useMemo(
			() => (
				<div className={styles.header}>
					<div className={styles.titleGroup}>
						<div className={styles.titleWithIcon}>
							<FaTelegramPlane className={styles.telegramIcon} />
							<h3>Telegram Sentiment</h3>
						</div>
					</div>
				</div>
			),
			[]
		);

		return (
			<div className={styles.container}>
				{header}
				{content}
			</div>
		);
	},
	(prev, next) => prev.contractAddress === next.contractAddress
);

export default TelegramSentiment;
