import { useEffect, useRef, useState } from "react";
import { createChart, IChartApi, ISeriesApi, Time, CandlestickData as LightweightCandlestickData, CandlestickSeries, LineWidth } from "lightweight-charts";
import styles from "./TradingView.module.css";

import { useChain } from "@/contexts/ChainContext";
import { TokenWithDexInfo } from "@/types/token.types";

type SupportedInterval = "1m" | "5m" | "15m" | "1h" | "1d";

// Utility function to convert UTC timestamp to PST
function convertToPST(timestamp: number): number {
	const date = new Date(timestamp);
	return date.getTime() - 7 * 60 * 60 * 1000; // PST is UTC-7 (not accounting for daylight savings)
}

interface TradingViewProps {
	token: TokenWithDexInfo;
	interval?: SupportedInterval;
	theme?: "light" | "dark";
	width?: string | number;
	height?: string | number;
	isFullscreen?: boolean;
}

interface CustomCandlestickData extends LightweightCandlestickData<Time> {
	time: Time;
}

interface CandleData {
	volume: number;
	open: number;
	high: number;
	low: number;
	close: number;
	time: number;
}

function formatPrice(price: number): string {
	if (price < 0.000001) return price.toExponential(6);
	if (price < 0.0001) return price.toFixed(6);
	if (price < 0.01) return price.toFixed(5);
	if (price < 1) return price.toFixed(4);
	if (price < 1000) return price.toFixed(2);
	return price.toFixed(0);
}

export function TradingView({ token, interval: initialInterval = "5m", theme = "dark", width = "100%", height = "100%", isFullscreen = false }: TradingViewProps) {
	const { currentChain } = useChain();
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const [candleData, setCandleData] = useState<CandleData[]>([]);
	const chartRef = useRef<IChartApi | null>(null);
	const candlestickSeriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
	const [interval, setInterval] = useState<SupportedInterval>(initialInterval);
	const [isLoading, setIsLoading] = useState(false);

	// Initialize chart
	useEffect(() => {
		if (!chartContainerRef.current) return;

		const chartOptions = {
			layout: {
				background: { color: theme === "dark" ? "#1A1A1A" : "#FFFFFF" },
				textColor: theme === "dark" ? "#FFFFFF" : "#000000",
			},
			grid: {
				vertLines: { color: theme === "dark" ? "#2B2B2B" : "#E6E6E6" },
				horzLines: { color: theme === "dark" ? "#2B2B2B" : "#E6E6E6" },
			},
			timeScale: {
				timeVisible: true,
				secondsVisible: false,
				borderColor: theme === "dark" ? "#2B2B2B" : "#E6E6E6",
				textColor: theme === "dark" ? "#FFFFFF" : "#000000",
			},
			rightPriceScale: {
				borderColor: theme === "dark" ? "#2B2B2B" : "#E6E6E6",
				textColor: theme === "dark" ? "#FFFFFF" : "#000000",
				autoScale: true,
				mode: 1,
				alignLabels: true,
				borderVisible: true,
				entireTextOnly: false,
				scaleMargins: {
					top: 0.2,
					bottom: 0.1,
				},
				priceFormat: {
					type: "price",
					precision: 6,
					minMove: 0.000001,
				},
				formatPrice: (price: number) => {
					const formattedPrice = formatPrice(price);
					return `$${formattedPrice}`;
				},
			},
			width: chartContainerRef.current.clientWidth,
			height: chartContainerRef.current.clientHeight,
			crosshair: {
				mode: 0,
				vertLine: {
					color: theme === "dark" ? "#555" : "#ddd",
					width: 1 as LineWidth,
					style: 2, // Dashed line
					visible: true,
					labelVisible: true,
				},
				horzLine: {
					color: theme === "dark" ? "#555" : "#ddd",
					width: 1 as LineWidth,
					style: 2, // Dashed line
					visible: true,
					labelVisible: true,
				},
			},
		};

		const chart = createChart(chartContainerRef.current, chartOptions);

		// Add candlestick series
		const candlestickSeries = chart.addSeries(CandlestickSeries, {
			upColor: "#26a69a",
			downColor: "#ef5350",
			borderVisible: false,
			wickUpColor: "#26a69a",
			wickDownColor: "#ef5350",
			wickVisible: true,
			priceFormat: {
				type: "price",
				precision: 6,
				minMove: 0.000001,
			},
		});

		chartRef.current = chart;
		candlestickSeriesRef.current = candlestickSeries;

		// Handle resize
		const handleResize = () => {
			if (chartContainerRef.current && chartRef.current) {
				chartRef.current.applyOptions({
					width: chartContainerRef.current.clientWidth,
					height: chartContainerRef.current.clientHeight,
				});
			}
		};

		window.addEventListener("resize", handleResize);

		return () => {
			window.removeEventListener("resize", handleResize);
			if (chartRef.current) {
				chartRef.current.remove();
			}
		};
	}, [theme]);

	// Process candle data for chart
	useEffect(() => {
		if (!candleData.length || !candlestickSeriesRef.current) return;

		// Format data for candlestick chart
		const formattedCandleData: CustomCandlestickData[] = candleData.map((candle) => ({
			time: Math.floor(convertToPST(candle.time) / 1000) as Time,
			open: candle.open,
			high: candle.high,
			low: candle.low,
			close: candle.close,
		}));

		// Sort by time
		formattedCandleData.sort((a, b) => Number(a.time) - Number(b.time));

		// Update chart
		candlestickSeriesRef.current.setData(formattedCandleData);

		if (chartRef.current && formattedCandleData.length > 0) {
			chartRef.current.timeScale().fitContent();
		}
	}, [candleData]);

	// Fetch price history from Mobula
	useEffect(() => {
		async function fetchPriceHistory() {
			setIsLoading(true);
			try {
				const thirtyDaysAgo = new Date();
				thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
				thirtyDaysAgo.setHours(thirtyDaysAgo.getHours() + 7); // Adjust for PST

				const fromTimestamp = Math.floor(thirtyDaysAgo.getTime() / 1000);

				const response = await fetch(`https://api.mobula.io/api/1/market/history/pair?blockchain=${currentChain.id}&from=${fromTimestamp}&period=${interval}&amount=5000&asset=${token.id}`, {});
				const data = await response.json();

				if (data.data && Array.isArray(data.data)) {
					setCandleData(data.data);
				} else {
					console.error("Invalid price history data format:", data);
				}
			} catch (error) {
				console.error("Error fetching price data:", error);
			} finally {
				setIsLoading(false);
			}
		}

		if (token.id && currentChain.id) {
			fetchPriceHistory();
		}
	}, [token.id, currentChain.id, interval]);

	// Handle interval change
	const handleIntervalChange = (newInterval: SupportedInterval) => {
		setInterval(newInterval);
	};

	// Supported intervals
	const supportedIntervals: SupportedInterval[] = ["1m", "5m", "15m", "1h", "1d"];

	return (
		<div className={styles.tradingViewWrapper}>
			<div ref={chartContainerRef} className={`${styles.tradingViewContainer} ${isFullscreen ? styles.fullscreen : ""} ${isLoading ? styles.loading : ""}`} style={{ width, height }}>
				<div className={styles.intervalSelector}>
					{supportedIntervals.map((option) => (
						<button key={option} className={`${styles.intervalButton} ${interval === option ? styles.active : ""}`} onClick={() => handleIntervalChange(option)}>
							{option}
						</button>
					))}
				</div>
				{isLoading && (
					<div className={styles.loadingOverlay}>
						<div className={styles.loadingSpinner}></div>
						Loading chart data...
					</div>
				)}
			</div>
		</div>
	);
}
