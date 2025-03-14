"use client";

import React from "react";
import styles from "./page.module.css";
import { GroupManager } from "@/components/GroupManager";
import { usePrivy } from "@privy-io/react-auth";
import { BlurredPreviewTable } from "@/components/BlurredPreviewTable";

export default function GroupsPage() {
	const { authenticated } = usePrivy();

	if (!authenticated) {
		return (
			<div className={styles.main}>
				<BlurredPreviewTable />
				<div className={styles.authOverlay}>
					<div className={styles.authContent}>
						<h2 className={styles.authTitle}>Sign In to Access Group Manager</h2>
						<p className={styles.authDescription}>Connect your wallet or sign in with your preferred social method to gain access to Automated Alpha!</p>
					</div>
				</div>
			</div>
		);
	}
	return (
		<main className={styles.main}>
			<GroupManager />
		</main>
	);
}
