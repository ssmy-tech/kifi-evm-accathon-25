import React, { useState } from "react";
import { useUpdateTelegramApiLinkMutation, useCheckTelegramApiHealthQuery } from "../../generated/graphql";
import styles from "./TelegramSetup.module.css";
import { usePrivy } from "@privy-io/react-auth";
import { TelegramChatsManager } from "./TelegramChatsManager";

interface TelegramSetupProps {
	onSetupComplete: () => void;
	initialApiLink?: string;
	showManagerAfterSetup?: boolean;
	onContinue?: () => void;
}

export const TelegramSetup: React.FC<TelegramSetupProps> = ({ onSetupComplete, initialApiLink = "", showManagerAfterSetup = false, onContinue }) => {
	const [apiLink, setApiLink] = useState(initialApiLink);
	const [error, setError] = useState<string | null>(null);
	const [setupCompleted, setSetupCompleted] = useState(false);
	const { data: healthCheck } = useCheckTelegramApiHealthQuery({
		pollInterval: 10000,
	});

	const [updateApiLink, { loading: updatingLink }] = useUpdateTelegramApiLinkMutation({
		onCompleted: async () => {
			if (showManagerAfterSetup) {
				setSetupCompleted(true);
			}
			onSetupComplete();
		},
		onError: (error) => {
			setError(error.message);
		},
	});

	const handleApiLinkSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		if (!apiLink.trim()) {
			setError("API link is required");
			return;
		}

		try {
			await updateApiLink({
				variables: {
					apiLink,
				},
			});
		} catch (error) {
			// Error is handled in onError callback
		}
	};

	const isHealthy = healthCheck?.checkTelegramApiHealth.status === "healthy";

	if (setupCompleted && showManagerAfterSetup) {
		return (
			<div className={styles.managerContainer}>
				<TelegramChatsManager />
				{onContinue && (
					<button onClick={onContinue} className={styles.continueButton}>
						Continue
					</button>
				)}
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.setupCard}>
				<h2 className={styles.title}>Connect to Telegram API</h2>

				<p className={styles.description}>To use Telegram features, you need to connect to a Telegram API server. Please enter your Telegram API link below.</p>

				<form onSubmit={handleApiLinkSubmit} className={styles.form}>
					<div className={styles.formGroup}>
						<label htmlFor="apiLink" className={styles.label}>
							Telegram API Link
						</label>
						<input id="apiLink" type="text" value={apiLink} onChange={(e) => setApiLink(e.target.value)} placeholder="https://example-telegram.onrender.com" className={styles.input} />
						{error && <div className={styles.errorMessage}>{error}</div>}
					</div>

					<button type="submit" disabled={updatingLink} className={styles.submitButton}>
						{updatingLink ? "Connecting..." : "Connect to Telegram"}
					</button>
				</form>

				<div className={styles.helpSection}>
					<h3 className={styles.helpTitle}>How to get your API link?</h3>
					<ol className={styles.helpList}>
						<li>
							Set up a Telegram API server using our{" "}
							<a href="#" className={styles.link}>
								documentation
							</a>
						</li>
						<li>Copy the API URL from your server configuration</li>
						<li>Paste it in the field above and click Connect</li>
					</ol>
				</div>
			</div>
		</div>
	);
};
