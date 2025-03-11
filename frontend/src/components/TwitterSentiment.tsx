import React, { useEffect, useState } from "react";
import styles from "./TwitterSentiment.module.css";
import { FaXTwitter } from "react-icons/fa6";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";

import { useGetTwitterContractAnalyticsQuery } from "@/generated/graphql";

interface Tweet {
	url: string;
	text: string;
	author: string;
	timestamp: string;
}

interface TwitterSentimentProps {
	contractAddress: string;
}

export default function TwitterSentiment({ contractAddress }: TwitterSentimentProps) {
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
			const sentimentData = data.getTwitterContractAnalytics;
			setSummary(sentimentData.summary);
		}
	}, [data]);

	const tweets = data?.getTwitterContractAnalytics?.relevantTweets || [];
	const totalPages = Math.ceil(tweets.length / tweetsPerPage);

	const handleNextPage = () => {
		setCurrentPage((prev) => (prev + 1) % totalPages);
	};

	const handlePrevPage = () => {
		setCurrentPage((prev) => (prev - 1 + totalPages) % totalPages);
	};

	const currentTweet = tweets[currentPage];

	const toggleButtonText = showTweets ? "Show AI Summary" : `Relevant Tweets (${tweets.length})`;

	if (loading) {
		return (
			<div className={styles.container}>
				<div className={styles.header}>
					<div className={styles.titleGroup}>
						<div className={styles.titleWithIcon}>
							<FaXTwitter className={styles.xIcon} />
							<h3>Twitter Sentiment</h3>
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
							<FaXTwitter className={styles.xIcon} />
							<h3>Twitter Sentiment</h3>
						</div>
					</div>
				</div>
				<div className={`${styles.summary} ${styles.neutral}`}>Error loading sentiment analysis</div>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<div className={styles.titleWithIcon}>
						<FaXTwitter className={styles.xIcon} />
						<h3>Twitter Sentiment</h3>
					</div>
					<button className={styles.tweetToggle} onClick={() => setShowTweets(!showTweets)} data-active={showTweets}>
						{toggleButtonText}
					</button>
				</div>
			</div>
			{!showTweets ? (
				<div className={`${styles.summary}`}>{summary}</div>
			) : (
				<div className={styles.tweetContainer}>
					{tweets.length > 0 ? (
						<>
							<div className={styles.tweet}>
								<div className={styles.tweetAuthor}>@{currentTweet.author}</div>
								<div className={styles.tweetText}>{currentTweet.text}</div>
								<div className={styles.tweetMeta}>
									<a href={currentTweet.url} target="_blank" rel="noopener noreferrer" className={styles.tweetLink}>
										View on X
									</a>
									<span className={styles.tweetTime}>{new Date(currentTweet.timestamp).toLocaleDateString()}</span>
								</div>
							</div>
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
						</>
					) : (
						<div className={styles.noTweets}>No tweets available</div>
					)}
				</div>
			)}
		</div>
	);
}
