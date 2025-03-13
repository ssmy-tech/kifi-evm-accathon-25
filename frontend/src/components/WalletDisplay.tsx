"use client";
import { useState, useCallback } from "react";
import styles from "./WalletDisplay.module.css";
import { FaCopy, FaCheck } from "react-icons/fa";
import { usePrivy, useCreateWallet, useDelegatedActions, type WalletWithMetadata } from "@privy-io/react-auth";

interface WalletDisplayProps {
	address: string | null;
}

export function WalletDisplay({ address }: WalletDisplayProps) {
	const [copied, setCopied] = useState(false);
	const { user } = usePrivy();
	const { createWallet } = useCreateWallet();
	const { delegateWallet } = useDelegatedActions();
	const [isLoading, setIsLoading] = useState(false);

	const isWalletDelegated = useCallback(() => {
		return !!user?.linkedAccounts.find((account): account is WalletWithMetadata => account.type === "wallet" && account.delegated);
	}, [user]);

	const truncateAddress = (addr: string) => {
		if (!addr) return "";
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
	};

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(address as string);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy address:", err);
		}
	};

	const handleDelegateWallet = async () => {
		try {
			setIsLoading(true);
			await delegateWallet({
				address: address as string,
				chainType: "ethereum",
			});
			setIsLoading(false);
		} catch (err) {
			console.error("Failed to delegate wallet:", err);
			setIsLoading(false);
		}
	};

	const handleCreateWallet = async () => {
		try {
			setIsLoading(true);
			await createWallet();
			address = user?.linkedAccounts.find((account): account is WalletWithMetadata => account.type === "wallet" && account.walletClientType === "privy")?.address || null;
			setIsLoading(false);
		} catch (err) {
			console.error("Failed to create wallet:", err);
			setIsLoading(false);
		}
	};

	return address != null ? (
		isWalletDelegated() ? (
			<button onClick={copyToClipboard} className={styles.walletDisplay} title={copied ? "Copied!" : "Copy address"}>
				<span className={styles.address}>{truncateAddress(address)}</span>
				<span className={styles.copyIcon}>{copied ? <FaCheck /> : <FaCopy />}</span>
			</button>
		) : (
			<button onClick={handleDelegateWallet} className={styles.walletDisplay} disabled={isLoading}>
				<span className={styles.address}>{isLoading ? "Delegating..." : "Delegate Wallet"}</span>
			</button>
		)
	) : (
		<button onClick={handleCreateWallet} className={styles.walletDisplay} disabled={isLoading}>
			<span className={styles.address}>{isLoading ? "Creating..." : "Create a Wallet"}</span>
		</button>
	);
}
