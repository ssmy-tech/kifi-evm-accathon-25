"use client";

import React, { useState, useEffect } from "react";
import styles from "./page.module.css";
import { TransactionLogs } from "@/components/TransactionLogs";
import type { Transaction } from "@/types/transaction.types";
import { AutoAlphaConfig } from "@/components/AutoAlphaConfig";
import { generateMockTransactions } from "@/data/mockData";

export default function AutoAlphaPage() {
	const [transactions, setTransactions] = useState<Transaction[]>([]);

	useEffect(() => {
		setTransactions(generateMockTransactions());
	}, []);

	return (
		<main className={styles.main}>
			<AutoAlphaConfig onConfigChange={() => {}} />
			<TransactionLogs transactions={transactions} />
		</main>
	);
}
