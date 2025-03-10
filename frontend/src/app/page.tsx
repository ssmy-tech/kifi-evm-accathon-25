import styles from "./page.module.css";
import TokenFeed from "@/components/TokenFeed";

export default function Home() {
	return (
		<div className={styles.page}>
			<TokenFeed />
		</div>
	);
}
