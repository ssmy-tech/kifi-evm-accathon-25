"use client";
import { useState } from "react";
import styles from "./WalletDisplay.module.css";
import { FaCopy, FaCheck } from "react-icons/fa";

interface WalletDisplayProps {
	address: string;
}

export function WalletDisplay({ address }: WalletDisplayProps) {
	const [copied, setCopied] = useState(false);

	const truncateAddress = (addr: string) => {
		if (!addr) return "";
		return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
	};

	const copyToClipboard = async () => {
		try {
			await navigator.clipboard.writeText(address);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		} catch (err) {
			console.error("Failed to copy address:", err);
		}
	};

	return (
		<button onClick={copyToClipboard} className={styles.walletDisplay} title={copied ? "Copied!" : "Copy address"}>
			<span className={styles.address}>{truncateAddress(address)}</span>
			<span className={styles.copyIcon}>{copied ? <FaCheck /> : <FaCopy />}</span>
		</button>
	);
}
