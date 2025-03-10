import { useEffect, useRef } from "react";
import styles from "./TradingView.module.css";

interface TradingViewProps {
	symbol?: string;
	interval?: string;
	theme?: "light" | "dark";
	width?: string | number;
	height?: string | number;
	isFullscreen?: boolean;
}

export function TradingView({ symbol = "BINANCE:BTCUSDT", interval = "1D", theme = "dark", width = "100%", height = "100%", isFullscreen = false }: TradingViewProps) {
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const script = document.createElement("script");
		script.src = "https://s3.tradingview.com/tv.js";
		script.async = true;
		script.onload = () => {
			if (typeof window.TradingView !== "undefined" && containerRef.current) {
				const dataTheme = document.documentElement.getAttribute("data-theme");
				const chartTheme = dataTheme === "light" ? "light" : "dark";

				new window.TradingView.widget({
					autosize: true,
					symbol,
					interval,
					timezone: "Etc/UTC",
					theme: chartTheme,
					style: "1",
					locale: "en",
					toolbar_bg: "#f1f3f6",
					enable_publishing: false,
					allow_symbol_change: false,
					container_id: containerRef.current.id,
					hide_side_toolbar: false,
					hide_top_toolbar: false,
					compare_symbols: false,
					calendar: false,
					studies: [],
				});
			}
		};
		document.head.appendChild(script);

		return () => {
			if (script.parentNode) {
				script.parentNode.removeChild(script);
			}
		};
	}, [symbol, interval, theme]);

	return (
		<div className={`${styles.tradingViewContainer} ${isFullscreen ? styles.fullscreen : ""}`} style={{ width, height }}>
			<div id="tradingview_widget" ref={containerRef} className={styles.chartContainer} />
		</div>
	);
}

// Add TypeScript declaration for TradingView
declare global {
	interface Window {
		TradingView: {
			widget: new (config: {
				autosize?: boolean;
				symbol?: string;
				interval?: string;
				timezone?: string;
				theme?: string;
				style?: string;
				locale?: string;
				toolbar_bg?: string;
				enable_publishing?: boolean;
				allow_symbol_change?: boolean;
				container_id?: string;
				hide_side_toolbar?: boolean;
				hide_top_toolbar?: boolean;
				compare_symbols?: boolean;
				studies?: string[];
				save_image?: boolean;
				hide_legend?: boolean;
				withdateranges?: boolean;
				details?: boolean;
				hotlist?: boolean;
				calendar?: boolean;
				width?: string | number;
				height?: string | number;
			}) => void;
		};
	}
}
