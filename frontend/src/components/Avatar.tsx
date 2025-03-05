"use client";

import { useState, useRef, useEffect } from "react";
import { usePrivy } from "@privy-io/react-auth";
import styles from "./Avatar.module.css";
import Image from "next/image";
import { Settings, LogOut } from "lucide-react";

const Avatar = () => {
	const { user, logout } = usePrivy();
	const [isModalOpen, setIsModalOpen] = useState(false);
	const avatarRef = useRef<HTMLDivElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);
	const [imageLoaded, setImageLoaded] = useState(false);

	const toggleModal = () => {
		setIsModalOpen(!isModalOpen);
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
							</div>
						</div>

						<div className={styles.actions}>
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
		</div>
	);
};

export default Avatar;
