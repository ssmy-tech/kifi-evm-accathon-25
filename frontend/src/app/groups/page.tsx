import React from "react";
import styles from "./page.module.css";
import { GroupManager } from "@/components/GroupManager";
export default function GroupsPage() {
	return (
		<main className={styles.main}>
			<GroupManager />
		</main>
	);
}
