import styles from "./page.module.css";
import TokenFeed from "@/components/TokenFeed";
import { sampleTokens } from "@/data/mockData";

export default function Home() {
	return (
		<div className={styles.page}>
			<TokenFeed />
		</div>
	);
}
