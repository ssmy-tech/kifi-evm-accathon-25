"use client";

import React from "react";
import styles from "./page.module.css";
import { TransactionLogs } from "@/components/TransactionLogs";
import { AutoAlphaConfig } from "@/components/AutoAlphaConfig";

export default function AutoAlphaPage() {
	return (
		<main className={styles.main}>
			<AutoAlphaConfig onConfigChange={() => {}} />
			<TransactionLogs />
		</main>
	);
}
