"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import styles from "./Avatar.module.css";
import Image from "next/image";
import { Settings, LogOut } from "lucide-react";
import { FaTelegramPlane, FaSun, FaMoon } from "react-icons/fa";
import { TelegramSetup } from "./telegram/TelegramSetup";
import { useGetUserSavedChatsQuery } from "../generated/graphql";
import { WalletDisplay } from "./WalletDisplay";
import { WalletBalance } from "./WalletBalance";
import FeedSwitcher from "./FeedSwitcher";

interface AvatarProps {
	walletAddress?: string;
	balance?: number;
}

const Avatar: React.FC<AvatarProps> = ({ walletAddress, balance }) => {
	const { user, logout } = usePrivy();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isTelegramModalOpen, setIsTelegramModalOpen] = useState(false);
	const [isDarkMode, setIsDarkMode] = useState(true);
	const [, setTelegramSetupStage] = useState<"setup" | "manage">("setup");
	const avatarRef = useRef<HTMLDivElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);
	const [imageLoaded, setImageLoaded] = useState(false);

	// Get saved chats to determine if API is already set up
	const { data: savedChatsData } = useGetUserSavedChatsQuery();

	useEffect(() => {
		// Check if we have chats data, which indicates API is set up
		if (savedChatsData?.getUserSavedChats.chats) {
			setTelegramSetupStage("manage");
		} else {
			setTelegramSetupStage("setup");
		}
	}, [savedChatsData]);

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

	const toggleModal = () => {
		setIsModalOpen(!isModalOpen);
	};

	const openTelegramModal = () => {
		setIsTelegramModalOpen(true);
		setIsModalOpen(false);
	};

	const closeTelegramModal = () => {
		setIsTelegramModalOpen(false);
	};

	const handleSetupComplete = () => {
		setTelegramSetupStage("manage");
	};

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (modalRef.current && avatarRef.current && !modalRef.current.contains(event.target as Node) && !avatarRef.current.contains(event.target as Node)) {
				setIsModalOpen(false);
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => {
			document.removeEventListener("mousedown", handleClickOutside);
		};
	}, []);

	useEffect(() => {
		// Prevent scrolling when telegram modal is open
		if (isTelegramModalOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "auto";
		}

		return () => {
			document.body.style.overflow = "auto";
		};
	}, [isTelegramModalOpen]);

	const avatarUrl = "/assets/KiFi_LOGO.jpg";
	const displayName = user?.email?.address.split("@")[0] || "User";

	return (
		<div className={styles.avatarContainer}>
			<div ref={avatarRef} className={styles.avatar} onClick={toggleModal} role="button" aria-expanded={isModalOpen} tabIndex={0}>
				<Image src={avatarUrl} alt={`${displayName}`} width={40} height={40} className={styles.avatarImage} priority onLoad={() => setImageLoaded(true)} />
				{!imageLoaded && <div className={styles.avatarSkeleton}></div>}
			</div>

			{isModalOpen && (
				<div className={styles.modal} ref={modalRef}>
					<div className={styles.modalContent}>
						<div className={styles.userInfo}>
							<div className={styles.userTextInfo}>
								<div className={styles.userName}>{displayName}</div>
								{user?.email && <div className={styles.userEmail}>{user.email.address}</div>}
								{walletAddress && (
									<div className={styles.actionSection}>
										<div className={styles.walletSection}>
											<WalletDisplay address={walletAddress} />
											<WalletBalance balance={balance} />
										</div>
										{balance && <FeedSwitcher />}
									</div>
								)}
							</div>
						</div>

						<div className={styles.actions}>
							<button className={styles.actionButton} onClick={toggleTheme}>
								{isDarkMode ? <FaSun className={styles.actionIcon} /> : <FaMoon className={styles.actionIcon} />}
								<span>{isDarkMode ? "Light Mode" : "Dark Mode"}</span>
							</button>
							<button className={styles.actionButton} onClick={openTelegramModal}>
								<FaTelegramPlane className={styles.actionIcon} />
								<span>Setup Telegram</span>
							</button>
							<button className={styles.actionButton}>
								<Settings className={styles.actionIcon} />
								<span>Settings</span>
							</button>
							<button className={styles.actionButton} onClick={logout}>
								<LogOut className={styles.actionIcon} />
								<span>Logout</span>
							</button>
						</div>
					</div>
				</div>
			)}

			{isTelegramModalOpen && (
				<div className={styles.telegramModalOverlay}>
					<TelegramSetup onSetupComplete={handleSetupComplete} initialApiLink="" showManagerAfterSetup={true} onClose={closeTelegramModal} />
				</div>
			)}
		</div>
	);
};

export default Avatar;
