"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavBar.module.css";
import { FaBars, FaTimes } from "react-icons/fa";
import AuthModal from "./AuthModal";
import { usePrivy, WalletWithMetadata } from "@privy-io/react-auth";
import Avatar from "./Avatar";
import { usePrivyLoginMutation } from "@/generated/graphql";
import ChainSwitcher from "./ChainSwitcher";
import { WalletDisplay } from "./WalletDisplay";
import { WalletBalance } from "./WalletBalance";
import FeedSwitcher from "./FeedSwitcher";

const AUTH_STATUS_KEY = "auth_pending_onboarding";
const ALCHEMY_URL = "https://monad-testnet.g.alchemy.com/v2/" + process.env.NEXT_PUBLIC_ALCHEMY_KEY;

const NavBar: React.FC = () => {
	const pathname = usePathname();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [showWalletInNav, setShowWalletInNav] = useState(true);
	const [showBalanceInNav, setShowBalanceInNav] = useState(true);
	const [walletBalance, setWalletBalance] = useState<number | null>(null);
	const { ready, authenticated, logout, user } = usePrivy();
	const [privyLoginMutation] = usePrivyLoginMutation({});

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [pathname]);

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

	// Track authentication state changes to display onboarding after authentication (OAuth)
	useEffect(() => {
		if (ready) {
			if (authenticated && localStorage.getItem(AUTH_STATUS_KEY) === "pending") {
				setIsAuthModalOpen(true);
				localStorage.removeItem(AUTH_STATUS_KEY);
			}
			if (authenticated) {
				privyLoginMutation();
			}
		}
	}, [ready, authenticated, privyLoginMutation]);

	// Handle responsive wallet display
	useEffect(() => {
		const handleResize = () => {
			setShowWalletInNav(window.innerWidth >= 1800);
			setShowBalanceInNav(window.innerWidth >= 1300);
		};

		// Initial check
		handleResize();

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	// Fetch wallet balance when wallet is connected
	useEffect(() => {
		const fetchBalance = async () => {
			const delegatedWallet = user?.linkedAccounts.filter((account): account is WalletWithMetadata => account.type === "wallet" && account.walletClientType === "privy").filter((wallet) => wallet.delegated)[0];
			if (delegatedWallet?.address) {
				const balance = await getWalletBalance(delegatedWallet.address);
				setWalletBalance(balance);
			} else {
				setWalletBalance(null);
			}
		};

		if (authenticated && ready) {
			fetchBalance();
			// Set up an interval to update the balance every 30 seconds
			const interval = setInterval(fetchBalance, 30000);
			return () => clearInterval(interval);
		}
	}, [authenticated, ready, user, getWalletBalance]);

	const isActive = (path: string) => {
		if (path === "/" && pathname === "/") return true;
		if (path !== "/" && pathname.startsWith(path)) return true;
		return false;
	};

	const handleAuthButtonClick = () => {
		if (authenticated) {
			logout();
		} else {
			localStorage.setItem(AUTH_STATUS_KEY, "pending");
			setIsAuthModalOpen(true);
		}
	};

	const closeAuthModal = () => {
		setIsAuthModalOpen(false);
		// Clear the pending status if user closes the modal without completing auth
		localStorage.removeItem(AUTH_STATUS_KEY);
	};

	const embeddedWallets = user?.linkedAccounts.filter((account): account is WalletWithMetadata => account.type === "wallet" && account.walletClientType === "privy");
	const delegatedWallets = embeddedWallets?.filter((wallet) => wallet.delegated);

	return (
		<>
			<nav className={styles.navbar}>
				<div className={styles.logoContainer}>
					<Link href="/" className={styles.logoLink}>
						<span className={styles.logoImage}>
							<Image src="/assets/KiCircle.png" alt="Kifi Logo" width={44} height={44} priority />
						</span>
						<div className={styles.logoText}>KiSignals</div>
					</Link>
					{showWalletInNav && <FeedSwitcher />}
				</div>

				<div className={`${styles.navLinks} ${isMobileMenuOpen ? styles.navLinksOpen : ""}`}>
					<Link href="/" className={`${styles.navLink} ${isActive("/") ? styles.activeLink : ""}`}>
						Calls
					</Link>
					<Link href="/autoalpha" className={`${styles.navLink} ${isActive("/autoalpha") ? styles.activeLink : ""}`}>
						Auto Alpha
					</Link>
					<Link href="/groups" className={`${styles.navLink} ${isActive("/groups") ? styles.activeLink : ""}`}>
						Groups
					</Link>
				</div>

				<div className={styles.authContainer}>
					<ChainSwitcher />
					{ready &&
						(authenticated ? (
							<>
								{showWalletInNav && delegatedWallets?.[0] && <WalletDisplay address={delegatedWallets[0].address} />}
								{showBalanceInNav && walletBalance && <WalletBalance balance={walletBalance} />}
								<Avatar walletAddress={delegatedWallets?.[0]?.address} balance={!showWalletInNav ? walletBalance ?? undefined : undefined} />
							</>
						) : (
							<button onClick={handleAuthButtonClick} className={styles.authButton}>
								Sign In
							</button>
						))}
					<button className={styles.mobileMenuButton} onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} aria-label="Toggle mobile menu">
						{isMobileMenuOpen ? <FaTimes /> : <FaBars />}
					</button>
				</div>
			</nav>

			<AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
		</>
	);
};

export default NavBar;
