"use client";
import styles from "./WalletBalance.module.css";

interface WalletBalanceProps {
	balance: number | null | undefined;
}

export function WalletBalance({ balance }: WalletBalanceProps) {
	const formatBalance = (bal: number) => {
		return bal.toFixed(4);
	};

	if (!balance) return null;

	return (
		<div className={styles.balanceContainer}>
			<span className={styles.balance}>{formatBalance(balance)} MON</span>
		</div>
	);
}
