import React from "react";
import { useFeedFilter } from "../contexts/FeedFilterContext";
import styles from "./FeedSwitcher.module.css";

const FeedSwitcher: React.FC = () => {
	const { filterType, setFilterType } = useFeedFilter();

	return (
		<div className={styles.switcherContainer}>
			<button className={`${styles.switcherButton} ${filterType === "saved" ? styles.active : ""}`} onClick={() => setFilterType("saved")}>
				Saved
			</button>
			<button className={`${styles.switcherButton} ${filterType === "public" ? styles.active : ""}`} onClick={() => setFilterType("public")}>
				Public
			</button>
		</div>
	);
};

export default FeedSwitcher;
