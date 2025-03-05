"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavBar.module.css";
import { FaSun, FaMoon } from "react-icons/fa";
import AuthModal from "./AuthModal";
import { usePrivy } from "@privy-io/react-auth";
import Avatar from "./Avatar";
const AUTH_STATUS_KEY = "auth_pending_onboarding";

const NavBar: React.FC = () => {
	const pathname = usePathname();
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
	const { ready, authenticated, logout, login, user } = usePrivy();

	// Track authentication state changes to display onboarding after authentication (OAuth)
	useEffect(() => {
		if (ready) {
			if (authenticated && localStorage.getItem(AUTH_STATUS_KEY) === "pending") {
				setIsAuthModalOpen(true);
				localStorage.removeItem(AUTH_STATUS_KEY);
			}
		}
	}, [ready, authenticated, user]);

	useEffect(() => {
		const savedTheme = localStorage.getItem("theme");

		if (savedTheme) {
			const isCurrentlyDark = savedTheme === "dark";
			setIsDarkMode(isCurrentlyDark);
			document.documentElement.setAttribute("data-theme", savedTheme);
		} else {
			const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
			setIsDarkMode(prefersDark);
			document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
		}
	}, []);

	const toggleTheme = () => {
		const newTheme = isDarkMode ? "light" : "dark";
		setIsDarkMode(!isDarkMode);

		document.documentElement.setAttribute("data-theme", newTheme);

		localStorage.setItem("theme", newTheme);
	};

	const isActive = (path: string) => {
		if (path === "/" && pathname === "/") return true;
		if (path !== "/" && pathname.startsWith(path)) return true;
		return false;
	};

	const handleAuthButtonClick = () => {
		if (authenticated) {
			logout();
		} else {
			// local storage flag to track if user is in the auth process
			localStorage.setItem(AUTH_STATUS_KEY, "pending");
			setIsAuthModalOpen(true);
		}
	};

	const closeAuthModal = () => {
		setIsAuthModalOpen(false);
		// Clear the pending status if user closes the modal without completing auth
		localStorage.removeItem(AUTH_STATUS_KEY);
	};

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

				<div className={styles.navLinks}>
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
					{ready &&
						(authenticated ? (
							<Avatar />
						) : (
							<button onClick={handleAuthButtonClick} className={styles.authButton}>
								Sign In
							</button>
						))}
					<button className={styles.themeSwitcher} onClick={toggleTheme} aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
						{isDarkMode ? <FaSun /> : <FaMoon />}
					</button>
				</div>
			</nav>

			<AuthModal isOpen={isAuthModalOpen} onClose={closeAuthModal} />
		</>
	);
};

export default NavBar;
