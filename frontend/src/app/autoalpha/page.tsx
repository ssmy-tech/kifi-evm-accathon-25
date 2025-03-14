"use client";

import React from "react";
import styles from "./page.module.css";
import { TransactionLogs } from "@/components/TransactionLogs";
import { AutoAlphaConfig } from "@/components/AutoAlphaConfig";
import { BlurredPreviewTable } from "@/components/BlurredPreviewTable";
import { usePrivy } from "@privy-io/react-auth";

export default function AutoAlphaPage() {
	const { authenticated } = usePrivy();
	if (!authenticated) {
		return (
			<div className={styles.main}>
				<BlurredPreviewTable />
				<div className={styles.authOverlay}>
					<div className={styles.authContent}>
						<h2 className={styles.authTitle}>Sign In to Access Automated Alpha</h2>
						<p className={styles.authDescription}>Connect your wallet or sign in with your preferred social method to gain access to Automated Alpha!</p>
					</div>
				</div>
			</div>
		);
	}
	return (
		<main className={styles.main}>
			<AutoAlphaConfig onConfigChange={() => {}} />
			<TransactionLogs />
		</main>
	);
}
