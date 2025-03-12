import React, { useEffect, useState, memo, useMemo, useCallback } from "react";
import styles from "./TwitterSentiment.module.css";
import { FaXTwitter } from "react-icons/fa6";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

import { useGetTwitterContractAnalyticsQuery } from "@/generated/graphql";

interface TwitterSentimentProps {
	contractAddress: string;
}

const TwitterSentiment = memo(
	function TwitterSentiment({ contractAddress }: TwitterSentimentProps) {
		const [summary, setSummary] = useState("");
		const [showTweets, setShowTweets] = useState(false);
		const [currentPage, setCurrentPage] = useState(0);
		const tweetsPerPage = 1;

		const { data, loading, error } = useGetTwitterContractAnalyticsQuery({
			variables: {
				input: {
					contractAddress,
				},
			},
			skip: !contractAddress,
		});

		useEffect(() => {
			if (data?.getTwitterContractAnalytics) {
				setSummary(data.getTwitterContractAnalytics.summary);
			}
		}, [data]);

		const tweets = useMemo(() => data?.getTwitterContractAnalytics?.relevantTweets || [], [data]);
		const totalPages = useMemo(() => Math.ceil(tweets.length / tweetsPerPage), [tweets.length]);
		const currentTweet = useMemo(() => tweets[currentPage], [tweets, currentPage]);

		const handleNextPage = useCallback(() => {
			setCurrentPage((prev) => (prev + 1) % totalPages);
		}, [totalPages]);

		const handlePrevPage = useCallback(() => {
			setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
		}, [totalPages]);

		const toggleTweets = useCallback(() => {
			setShowTweets((prev) => !prev);
		}, []);

		// Memoize the header content
		const headerContent = useMemo(
			() => (
				<div className={styles.header}>
					<div className={styles.titleGroup}>
						<div className={styles.titleWithIcon}>
							<FaXTwitter className={styles.xIcon} />
							<h3>Twitter Sentiment</h3>
						</div>
						<button className={styles.tweetToggle} onClick={toggleTweets} data-active={showTweets}>
							{showTweets ? "Show AI Summary" : `Relevant Tweets (${tweets.length})`}
						</button>
					</div>
				</div>
			),
			[showTweets, tweets.length, toggleTweets]
		);

		// Memoize the tweet content
		const tweetContent = useMemo(() => {
			if (!showTweets) {
				return <div className={`${styles.summary}`}>{summary}</div>;
			}

			if (tweets.length === 0) {
				return <div className={styles.noTweets}>No tweets available</div>;
			}

			return (
				<div className={styles.tweetContainer}>
					<div className={styles.tweet}>
						<div className={styles.tweetHeader}>
							<div className={styles.tweetAuthor}>@{currentTweet.author}</div>
							<span className={styles.tweetTime}>{new Date(currentTweet.timestamp).toLocaleDateString()}</span>
						</div>
						<div className={styles.tweetContent}>
							<div className={styles.tweetText}>{currentTweet.text}</div>
						</div>
						<div className={styles.tweetMeta}>
							<a href={currentTweet.url} target="_blank" rel="noopener noreferrer" className={styles.tweetLink}>
								View on X
							</a>
							<div className={styles.tweetActions}>
								<div className={styles.pagination}>
									<button onClick={handlePrevPage} className={styles.paginationButton} disabled={currentPage === 0}>
										<FaChevronLeft />
									</button>
									<span className={styles.pageInfo}>
										{currentPage + 1} / {totalPages}
									</span>
									<button onClick={handleNextPage} className={styles.paginationButton} disabled={currentPage === totalPages - 1}>
										<FaChevronRight />
									</button>
								</div>
							</div>
						</div>
					</div>
				</div>
			);
		}, [showTweets, summary, tweets.length, currentTweet, currentPage, totalPages, handlePrevPage, handleNextPage]);

		// Memoize loading and error states
		const loadingContent = useMemo(() => <div className={`${styles.summary}`}>Loading sentiment analysis...</div>, []);

		const errorContent = useMemo(() => {
			if (error) console.error(error);
			return <div className={`${styles.summary} ${styles.neutral}`}>Error loading sentiment analysis</div>;
		}, [error]);

		if (loading) {
			return (
				<div className={styles.container}>
					{headerContent}
					{loadingContent}
				</div>
			);
		}

		if (error) {
			return (
				<div className={styles.container}>
					{headerContent}
					{errorContent}
				</div>
			);
		}

		return (
			<div className={styles.container}>
				{headerContent}
				{tweetContent}
			</div>
		);
	},
	(prev, next) => prev.contractAddress === next.contractAddress
);

export default TwitterSentiment;
