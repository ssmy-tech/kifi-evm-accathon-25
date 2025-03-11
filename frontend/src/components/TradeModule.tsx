"use client";

import React from "react";
import styles from "./TradeModule.module.css";
import { RiSwap2Fill } from "react-icons/ri";
import { MdSwapVerticalCircle } from "react-icons/md";
import Image from "next/image";

interface TokenInputProps {
	type: "sell" | "buy";
	value: string;
	token: {
		symbol: string;
		icon: string;
		maxAmount: number;
		price: number;
	};
	onValueChange: (value: string) => void;
}

function TokenInput({ type, value, token, onValueChange }: TokenInputProps) {
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		if (!/^\d*\.?\d*$/.test(newValue)) return;
		if ((newValue.match(/\./g) || []).length > 1) return;
		onValueChange(newValue);
	};

	const usdValue = React.useMemo(() => {
		const amount = parseFloat(value) || 0;
		return (amount * token.price).toLocaleString("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}, [value, token.price]);

	return (
		<div className={styles.tokenInput}>
			<div className={styles.inputLabel}>{type === "sell" ? "Sell" : "Buy"}</div>
			<div className={styles.inputContainer}>
				<input type="text" inputMode="decimal" value={value} onChange={handleInputChange} placeholder="0.0" className={styles.amountInput} />
				<div className={styles.tokenSelector}>
					<Image src={token.icon} alt={token.symbol} width={24} height={24} />
					<span>{token.symbol}</span>
				</div>
			</div>

			<div className={styles.balanceContainer}>
				<div className={styles.usdValue}>{usdValue}</div>
				<div className={styles.balanceInfo}>
					<div className={styles.maxAmount}>
						{token.maxAmount} {token.symbol}
					</div>
					{type === "sell" && token.maxAmount > 0 && (
						<button className={styles.maxButton} onClick={() => onValueChange(token.maxAmount.toString())}>
							MAX
						</button>
					)}
				</div>
			</div>
		</div>
	);
}

interface TradeSettings {
	mevProtect: boolean;
	slippage: number;
	estimatedGas: string;
}

export default function TradeModule() {
	const [sellAmount, setSellAmount] = React.useState("");
	const [buyAmount, setBuyAmount] = React.useState("");
	const [sellToken, setSellToken] = React.useState({
		symbol: "ETH",
		icon: "/assets/currency/eth.png",
		maxAmount: 0.115,
		price: 2250.75,
	});
	const [buyToken, setBuyToken] = React.useState({
		symbol: "TOKEN",
		icon: "/assets/coin.png",
		maxAmount: 0,
		price: 0.107,
	});
	const [settings, setSettings] = React.useState<TradeSettings>({
		mevProtect: true,
		slippage: 10,
		estimatedGas: "0.000123",
	});
	// Swap Tokens
	const handleSwap = () => {
		const tempToken = sellToken;
		setSellToken(buyToken);
		setBuyToken(tempToken);

		const tempAmount = sellAmount;
		setSellAmount(buyAmount);
		setBuyAmount(tempAmount);
	};

	const isValidTrade = React.useMemo(() => {
		const sellValue = parseFloat(sellAmount) || 0;
		return sellValue > 0 && sellValue <= sellToken.maxAmount;
	}, [sellAmount, sellToken.maxAmount]);

	const getButtonText = () => {
		const sellValue = parseFloat(sellAmount) || 0;
		if (sellValue === 0) return "Enter an amount";
		if (sellValue > sellToken.maxAmount) return "Insufficient Balance";
		return "Submit";
	};

	return (
		<div className={styles.container}>
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<div className={styles.titleWithIcon}>
						<RiSwap2Fill className={styles.icon} />
						<h3>Trade KiSignal</h3>
					</div>
				</div>
			</div>
			<div className={styles.contentWrapper}>
				<TokenInput type="sell" value={sellAmount} token={sellToken} onValueChange={setSellAmount} />
				<div className={styles.swapIcon} onClick={handleSwap}>
					<MdSwapVerticalCircle />
				</div>
				<TokenInput type="buy" value={buyAmount} token={buyToken} onValueChange={setBuyAmount} />
				<div className={styles.tradeInfo}>
					<div className={styles.tradeSettings}>
						<div className={styles.settingItem}>
							<span>MEV Protect</span>
							<span className={settings.mevProtect ? styles.settingEnabled : styles.settingDisabled} onClick={() => setSettings((prev) => ({ ...prev, mevProtect: !prev.mevProtect }))} style={{ cursor: "pointer" }}>
								{settings.mevProtect ? "ON" : "OFF"}
							</span>
						</div>
						<div className={styles.settingItem}>
							<span>Slippage</span>
							<span>{settings.slippage}%</span>
						</div>
					</div>
					<div className={styles.tradeActions}>
						<button className={`${styles.reviewButton} ${!isValidTrade ? styles.reviewButtonDisabled : ""}`} disabled={!isValidTrade}>
							{getButtonText()}
						</button>
					</div>
				</div>
			</div>
		</div>
	);
}
