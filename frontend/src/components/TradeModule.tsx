"use client";

import React from "react";
import styles from "./TradeModule.module.css";
import { RiSwap2Fill } from "react-icons/ri";
import { BiLoaderAlt } from "react-icons/bi";
import Image from "next/image";
import { TokenWithDexInfo } from "@/types/token.types";
import { usePrivy, useSendTransaction } from "@privy-io/react-auth";
import { WalletWithMetadata } from "@privy-io/react-auth";
import { useChain } from "@/contexts/ChainContext";

interface TradeModuleProps {
	token: TokenWithDexInfo;
}

interface QuoteToken {
	ticker: string;
	imageUrl: string;
	maxAmount: number;
	address: string;
	price: number;
}

interface PriceQuote {
	price: number;
	to: string;
	data: string;
	value: string;
	gas: string;
	estimatedGas: string;
	gasPrice: string;
	minBuyAmount: string;
	sellAmount: string;
	buyAmount: string;
	transaction: {
		to: string;
		data: string;
		gas: string;
		gasPrice: string;
		value: string;
	};
	error?: string | null;
}

interface TokenInputProps {
	token: TokenWithDexInfo | QuoteToken | null;
	type: "sell" | "buy";
	value: string;
	onValueChange: (value: string) => void;
	isLoading?: boolean;
}

function isQuoteToken(token: TokenWithDexInfo | QuoteToken): token is QuoteToken {
	return "price" in token;
}

const ALCHEMY_URL = "https://monad-testnet.g.alchemy.com/v2/" + process.env.NEXT_PUBLIC_ALCHEMY_KEY;

function TokenInput({ type, value, token, onValueChange, isLoading }: TokenInputProps) {
	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newValue = e.target.value;
		if (!/^\d*\.?\d*$/.test(newValue)) return;
		if ((newValue.match(/\./g) || []).length > 1) return;
		onValueChange(newValue);
	};

	const usdValue = React.useMemo(() => {
		if (!token) return "$0.00";
		const amount = parseFloat(value) || 0;
		const tokenPrice = isQuoteToken(token) ? token.price : token.dexData?.priceUsd ? parseFloat(token.dexData.priceUsd) : 0;
		return (amount * tokenPrice).toLocaleString("en-US", {
			style: "currency",
			currency: "USD",
			minimumFractionDigits: 2,
			maximumFractionDigits: 2,
		});
	}, [value, token]);

	const maxAmount = token && isQuoteToken(token) ? token.maxAmount : 0;
	const symbol = token ? (isQuoteToken(token) ? token.ticker : token.ticker) : "...";
	const imageUrl = token ? (isQuoteToken(token) ? token.imageUrl : token.dexData?.info?.imageUrl || token.imageUrl) : "";

	return (
		<div className={styles.tokenInput}>
			<div className={styles.inputLabel}>{type === "sell" ? "Sell" : "Buy"}</div>
			<div className={styles.inputContainer}>
				<input type="text" inputMode="decimal" value={value} onChange={handleInputChange} placeholder="0.0" className={styles.amountInput} disabled={isLoading} />
				<div className={styles.tokenSelector}>
					{imageUrl && <Image className={styles.tokenImage} src={imageUrl} alt={symbol} width={28} height={28} />}
					<span>{isLoading ? <BiLoaderAlt className={styles.spinningLoader} /> : symbol}</span>
				</div>
			</div>

			<div className={styles.balanceContainer}>
				<div className={styles.usdValue}>{isLoading ? <BiLoaderAlt className={styles.spinningLoader} /> : usdValue}</div>
				<div className={styles.balanceInfo}>
					{maxAmount && (
						<>
							<div className={styles.maxAmount}>{isLoading ? <BiLoaderAlt className={styles.spinningLoader} /> : `${maxAmount} ${symbol}`}</div>
							{type === "sell" && maxAmount > 0 && (
								<button className={styles.maxButton} onClick={() => onValueChange(maxAmount.toString())} disabled={isLoading}>
									MAX
								</button>
							)}
						</>
					)}
				</div>
			</div>
		</div>
	);
}

function useDebounce<T>(value: T, delay: number): T {
	const [debouncedValue, setDebouncedValue] = React.useState<T>(value);

	React.useEffect(() => {
		const timer = setTimeout(() => {
			setDebouncedValue(value);
		}, delay);

		return () => {
			clearTimeout(timer);
		};
	}, [value, delay]);

	return debouncedValue;
}

export default function TradeModule({ token }: TradeModuleProps) {
	const [sellAmount, setSellAmount] = React.useState("");
	const [buyAmount, setBuyAmount] = React.useState("");
	const [quoteToken, setQuoteToken] = React.useState<QuoteToken | null>(null);
	const [priceQuote, setPriceQuote] = React.useState<PriceQuote | null>(null);
	const [isSwapping, setIsSwapping] = React.useState(false);
	const [isLoadingQuoteToken, setIsLoadingQuoteToken] = React.useState(true);
	const { user } = usePrivy();
	const { sendTransaction } = useSendTransaction();
	const { currentChain } = useChain();
	const chain = React.useMemo(() => token.tokenCallsData?.chain?.toUpperCase() || "", [token.tokenCallsData?.chain]);
	const isMonad = chain === "MONAD";

	const debouncedSellAmount = useDebounce(sellAmount, 100);

	const delegatedWallet = React.useMemo(() => {
		const embeddedWallets = user?.linkedAccounts.filter((account): account is WalletWithMetadata => account.type === "wallet" && account.walletClientType === "privy");
		return embeddedWallets?.find((wallet) => wallet.delegated);
	}, [user?.linkedAccounts]);

	const getWalletBalance = React.useCallback(async (address: string) => {
		try {
			const response = await fetch(ALCHEMY_URL, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					jsonrpc: "2.0",
					id: 1,
					method: "eth_getBalance",
					params: [address, "latest"],
				}),
			});

			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const data = await response.json();
			if (data.error) {
				throw new Error(`RPC error: ${data.error.message}`);
			}

			// Convert from wei (18 decimals)
			const balanceInWei = BigInt(data.result);
			const balance = Number(balanceInWei) / Math.pow(10, 18);
			return balance;
		} catch (error) {
			console.error("Error fetching wallet balance:", error);
			return 0;
		}
	}, []);

	// Get chain quote token with loading state
	const getChainQuoteToken = React.useCallback(async () => {
		if (!delegatedWallet?.address) {
			console.error("No delegated wallet found");
			setIsLoadingQuoteToken(false);
			return null;
		}

		try {
			setIsLoadingQuoteToken(true);
			const chainQuoteTokens: Record<string, Omit<QuoteToken, "maxAmount">> = {
				BASE: {
					ticker: "ETH",
					imageUrl: "/assets/chains/base.png",
					address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
					price: 3500,
				},
				SOLANA: {
					ticker: "SOL",
					imageUrl: "/assets/chains/solana.png",
					address: "So11111111111111111111111111111111111111112",
					price: 125,
				},
				MONAD: {
					ticker: "MON",
					imageUrl: "/assets/chains/monad.png",
					address: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE",
					price: 1,
				},
			};

			const chainToken = chainQuoteTokens[chain];
			if (!chainToken) {
				setIsLoadingQuoteToken(false);
				return null;
			}

			const balance = await getWalletBalance(delegatedWallet.address);
			return {
				...chainToken,
				maxAmount: balance,
			};
		} catch (error) {
			console.error("Error fetching quote token:", error);
			return null;
		} finally {
			setIsLoadingQuoteToken(false);
		}
	}, [chain, delegatedWallet?.address, getWalletBalance]);

	// Fetch quote token on mount and when dependencies change
	React.useEffect(() => {
		getChainQuoteToken().then(setQuoteToken);
	}, [getChainQuoteToken]);

	// Function to convert amount to wei (18 decimals)
	const toWei = (amount: string) => {
		try {
			const [whole, decimal] = amount.split(".");
			const decimals = decimal ? decimal.padEnd(18, "0").slice(0, 18) : "000000000000000000";
			return BigInt(whole || "0") * BigInt(10 ** 18) + BigInt(decimals);
		} catch (error) {
			console.error("Error converting to wei:", error);
			return BigInt(0);
		}
	};

	// Get price quote from 0x API
	const getPriceQuote = React.useCallback(
		async (sellAmount: string) => {
			if (!delegatedWallet?.address || !quoteToken || !token.dexData?.baseToken?.address) return null;

			try {
				const amountInWei = toWei(sellAmount).toString();

				const params = new URLSearchParams({
					chainId: currentChain.id,
					sellToken: quoteToken.address,
					buyToken: token.dexData.baseToken.address,
					sellAmount: amountInWei,
					taker: delegatedWallet.address,
				});

				const quoteResponse = await fetch("/api/quote?" + params.toString());

				if (!quoteResponse.ok) {
					throw new Error(`HTTP error! status: ${quoteResponse.status}`);
				}

				const quoteData = await quoteResponse.json();
				console.log("Quote data:", quoteData);
				setPriceQuote(quoteData);

				// Update buy amount based on the quote
				if (quoteData.buyAmount) {
					const buyAmountInEth = Number(BigInt(quoteData.buyAmount)) / Math.pow(10, 18);
					setBuyAmount(buyAmountInEth.toString());
				}

				return quoteData;
			} catch (error) {
				console.error("Error getting quote:", error);
				setPriceQuote(null);
				return null;
			}
		},
		[delegatedWallet?.address, quoteToken, token.dexData?.baseToken?.address, currentChain.id]
	);

	// Update price quote when debounced sell amount changes
	React.useEffect(() => {
		if (debouncedSellAmount && parseFloat(debouncedSellAmount) > 0) {
			getPriceQuote(debouncedSellAmount);
		} else {
			setBuyAmount("");
			setPriceQuote(null);
		}
	}, [debouncedSellAmount, getPriceQuote]);

	// Swap Tokens
	const handleSwap = async () => {
		if (!isMonad || !priceQuote) return;

		try {
			setIsSwapping(true);
			const sellValue = parseFloat(sellAmount);
			const buyValue = parseFloat(buyAmount);

			const uiOptions = {
				description: `Swap ${sellValue} ${quoteToken?.ticker} for ${buyValue} ${token.ticker}`,
				buttonText: "Confirm Swap",
				successHeader: "Swap successful!",
				successDescription: `Successfully swapped ${sellValue} ${quoteToken?.ticker} for ${buyValue} ${token.ticker}`,
				transactionInfo: {
					title: "Swap Details",
					action: "Token Swap",
					contractInfo: {
						name: "0x Protocol",
						imgUrl: token.dexData?.info?.imageUrl || token.imageUrl,
						imgSize: "sm" as const,
					},
				},
			};

			await sendTransaction(
				{
					to: priceQuote.transaction.to,
					data: priceQuote.transaction.data,
					value: priceQuote.transaction.value,
					chainId: Number(currentChain.id),
					gasPrice: priceQuote.transaction.gasPrice,
				},
				{ uiOptions }
			);

			// Clear the form after successful swap
			setSellAmount("");
			setBuyAmount("");
			setPriceQuote(null);
		} catch (error) {
			console.error("Error executing swap:", error);
		} finally {
			setIsSwapping(false);
		}
	};

	const isValidTrade = React.useMemo(() => {
		if (!isMonad || !delegatedWallet?.address) return false;

		const sellValue = parseFloat(sellAmount) || 0;
		if (sellValue <= 0 || !quoteToken || sellValue > quoteToken.maxAmount) return false;

		// Also check if we have a valid price quote
		if (!priceQuote || priceQuote.error) return false;

		return true;
	}, [sellAmount, quoteToken, isMonad, delegatedWallet?.address, priceQuote]);

	const getButtonText = () => {
		if (!isMonad) return "Trading only available on Monad";
		if (!delegatedWallet?.address) return "Connect Wallet";
		if (isSwapping) return "Swapping...";
		const sellValue = parseFloat(sellAmount) || 0;
		if (sellValue === 0) return "Enter an amount";
		if (!quoteToken || sellValue > quoteToken.maxAmount) return "Insufficient Balance";
		if (!priceQuote) return "Getting Quote...";
		if (priceQuote.error) return "Invalid Quote";
		return "Submit";
	};

	return (
		<div className={styles.container}>
			{!isMonad && (
				<div className={styles.overlay}>
					<div className={styles.overlayContent}>
						<h3>Trading is currently only supported on Monad.</h3>
					</div>
				</div>
			)}
			<div className={styles.header}>
				<div className={styles.titleGroup}>
					<div className={styles.titleWithIcon}>
						<RiSwap2Fill className={styles.icon} />
						<h3>Trade {token.dexData?.baseToken.name || token.name}</h3>
					</div>
				</div>
			</div>
			<div className={`${styles.contentWrapper} ${!isMonad ? styles.disabled : ""}`}>
				<TokenInput type="sell" value={sellAmount} token={quoteToken} onValueChange={setSellAmount} isLoading={isLoadingQuoteToken} />
				<TokenInput type="buy" value={buyAmount} token={token} onValueChange={setBuyAmount} isLoading={isLoadingQuoteToken || (!!debouncedSellAmount && !priceQuote)} />
				<div className={styles.tradeActions}>
					<button className={`${styles.reviewButton} ${!isValidTrade ? styles.reviewButtonDisabled : ""}`} disabled={!isValidTrade || isLoadingQuoteToken} onClick={handleSwap}>
						{getButtonText()}
					</button>
				</div>
			</div>
		</div>
	);
}
