import React, { useState, useEffect } from "react";
import { useUpdateTelegramApiLinkMutation, useCheckTelegramApiHealthQuery, useGetUserSavedChatsQuery, useGetTelegramApiSecretQuery } from "../../generated/graphql";
import styles from "./TelegramSetup.module.css";
import { TelegramChatsManager } from "./TelegramChatsManager";
import { X } from "lucide-react";

interface TelegramSetupProps {
	onSetupComplete: () => void;
	initialApiLink?: string;
	showManagerAfterSetup?: boolean;
	onContinue?: () => void;
	onClose?: () => void;
}

export const TelegramSetup: React.FC<TelegramSetupProps> = ({ onSetupComplete, initialApiLink = "", showManagerAfterSetup = false, onContinue, onClose }) => {
	const [apiLink, setApiLink] = useState(initialApiLink);
	const [error, setError] = useState<string | null>(null);
	const [setupCompleted, setSetupCompleted] = useState(false);
	const { data: healthCheck, loading: healthCheckLoading } = useCheckTelegramApiHealthQuery({
		pollInterval: 10000,
	});
	const { data: savedChats, loading: savedChatsLoading } = useGetUserSavedChatsQuery();
	const { data: apiSecret, loading: apiSecretLoading } = useGetTelegramApiSecretQuery();

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

	const isHealthy = healthCheck?.checkTelegramApiHealth.status === "healthy";

	// Check if setup can be skipped (API is healthy and chats exist)
	useEffect(() => {
		const isHealthy = healthCheck?.checkTelegramApiHealth.status === "healthy";
		const hasChats = savedChats?.getUserSavedChats.chats && savedChats.getUserSavedChats.chats.length > 0;
		// If API is healthy and user has chats, skip setup
		if (isHealthy && hasChats && !setupCompleted) {
			if (showManagerAfterSetup) {
				setSetupCompleted(true);
			}
			onSetupComplete();
		}
	}, [healthCheck, savedChats, setupCompleted, showManagerAfterSetup, onSetupComplete]);

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
			console.error("Error updating API link:", error);
		}
	};

	const renderContent = () => {
		if (healthCheckLoading || savedChatsLoading) {
			return (
				<div className={styles.loadingContainer}>
					<div className={styles.loadingSpinner}></div>
					<p className={styles.loadingText}>Checking your Telegram connection...</p>
				</div>
			);
		}

		if (setupCompleted && showManagerAfterSetup) {
			return (
				<div className={styles.managerContainer}>
					<TelegramChatsManager />
					<div className={styles.buttonGroup}>
						{onContinue && (
							<button onClick={onContinue} className={styles.continueButton}>
								Continue
							</button>
						)}
					</div>
				</div>
			);
		}

		return (
			<div className={styles.modalContent}>
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

						<div className={styles.buttonGroup}>
							<button type="submit" disabled={updatingLink} className={styles.submitButton}>
								{updatingLink ? "Connecting..." : "Connect to Telegram"}
							</button>
							<button type="button" onClick={onContinue || onClose} className={styles.maybeLaterButton}>
								Maybe Later
							</button>
						</div>
					</form>

					<div className={styles.helpSection}>
						<h3 className={styles.helpTitle}>How to get your API link?</h3>
						<ol className={styles.helpList}>
							<li>
								Set up a Telegram API server using our{" "}
								<a href="https://nova-screen-c53.notion.site/Telegram-Middleware-Setup-1b495657b8b1801cb3c7f21f3f446851" className={styles.link} target="_blank" rel="noopener noreferrer">
									documentation
								</a>
							</li>
							<li>Copy the API URL from your server configuration</li>
							<li>Paste it in the field above and click Connect</li>
						</ol>
						{apiSecretLoading ? (
							<div className={styles.apiSecretSection}>
								<div className={styles.loadingSpinner}></div>
								<p className={styles.loadingText}>Loading API Secret...</p>
							</div>
						) : (
							apiSecret?.getTelegramApiSecret?.apiSecret && (
								<div className={styles.apiSecretSection}>
									<p className={styles.apiSecretLabel}>Required Environment Variable:</p>
									<code className={styles.apiSecret}>TELEGRAM_API_SECRET={apiSecret.getTelegramApiSecret.apiSecret}</code>
								</div>
							)
						)}
					</div>
				</div>
			</div>
		);
	};

	return (
		<div className={`${styles.container} ${setupCompleted && showManagerAfterSetup ? styles.containerWithManager : ""}`}>
			<div className={styles.modalHeader}>
				<div className={styles.modalHeaderContent}>
					<h1 className={styles.modalTitle}>Telegram Setup</h1>
					{healthCheck && (
						<div className={styles.statusSection}>
							<div className={`${styles.statusIndicator} ${isHealthy ? styles.statusHealthy : styles.statusUnhealthy}`}>API Status: {healthCheck.checkTelegramApiHealth.status}</div>
						</div>
					)}
				</div>
				{onClose && (
					<button onClick={onClose} className={styles.closeButton}>
						<X size={20} />
					</button>
				)}
			</div>
			{renderContent()}
		</div>
	);
};
