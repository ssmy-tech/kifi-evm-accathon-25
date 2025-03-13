"use client";
import styles from "./WalletBalance.module.css";

interface WalletBalanceProps {
	balance: number | null | undefined;
}

export function WalletBalance({ balance }: WalletBalanceProps) {
	const formatBalance = (bal: number) => {
		// Always show 4 decimal places, even for zero
		return bal.toFixed(4);
	};

	// Only return null if balance is explicitly null or undefined
	if (balance === null || balance === undefined) return null;

	return (
		<div className={styles.balanceContainer}>
			<span className={styles.balance}>{formatBalance(balance)} MON</span>
		</div>
	);
}
