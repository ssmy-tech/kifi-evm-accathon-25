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

const AUTH_STATUS_KEY = "auth_pending_onboarding";

const NavBar: React.FC = () => {
	const pathname = usePathname();
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const [showWalletInNav, setShowWalletInNav] = useState(true);
	const { ready, authenticated, logout, user } = usePrivy();
	const [privyLoginMutation] = usePrivyLoginMutation({});

	// Close mobile menu when route changes
	useEffect(() => {
		setIsMobileMenuOpen(false);
	}, [pathname]);

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
			setShowWalletInNav(window.innerWidth >= 1300);
		};

		// Initial check
		handleResize();

		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

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
								<Avatar walletAddress={!showWalletInNav ? delegatedWallets?.[0]?.address : undefined} />
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
