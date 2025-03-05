"use client";
import React, { useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import styles from "./NavBar.module.css";
import { FaSun, FaMoon } from "react-icons/fa";

const NavBar: React.FC = () => {
	const pathname = usePathname();
	const [isDarkMode, setIsDarkMode] = useState(true);

	// Effect to initialize theme based on system preference and stored preference
	useEffect(() => {
		// Check for saved theme preference in localStorage
		const savedTheme = localStorage.getItem("theme");

		if (savedTheme) {
			// If we have a saved preference, use it
			const isCurrentlyDark = savedTheme === "dark";
			setIsDarkMode(isCurrentlyDark);
			document.documentElement.setAttribute("data-theme", savedTheme);
		} else {
			// Otherwise, use system preference
			const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
			setIsDarkMode(prefersDark);
			document.documentElement.setAttribute("data-theme", prefersDark ? "dark" : "light");
		}
	}, []);

	const toggleTheme = () => {
		const newTheme = isDarkMode ? "light" : "dark";
		setIsDarkMode(!isDarkMode);

		// Update the data-theme attribute on the document element
		document.documentElement.setAttribute("data-theme", newTheme);

		// Save the preference to localStorage
		localStorage.setItem("theme", newTheme);
	};

	const isActive = (path: string) => {
		if (path === "/" && pathname === "/") return true;
		if (path !== "/" && pathname.startsWith(path)) return true;
		return false;
	};

	return (
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
				<button className={styles.signInButton}>Sign In</button>
				<button className={styles.themeSwitcher} onClick={toggleTheme} aria-label={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}>
					{isDarkMode ? <FaSun /> : <FaMoon />}
				</button>
			</div>
		</nav>
	);
};

export default NavBar;
