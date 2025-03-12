"use client";

import { useGetUserSavedChatsQuery, useGetChatPhotoLazyQuery, useSaveUserChatsMutation } from "@/generated/graphql";
import styles from "./GroupManager.module.css";
import Image from "next/image";
import { useState, useEffect, useMemo } from "react";
import { FaSort, FaSortUp, FaSortDown } from "react-icons/fa";
import { getPhoto, savePhoto } from "@/utils/localStorage";
import { TelegramSetup } from "./telegram/TelegramSetup";

const DEFAULT_PROFILE_IMAGE = "/assets/KiFi_LOGO.jpg";

type SortField = "name" | "callCount" | "winRate" | "timestamp";
type SortDirection = "asc" | "desc";

interface SortConfig {
	field: SortField;
	direction: SortDirection;
}

interface ImageWithFallbackProps {
	src: string;
	alt: string;
	width: number;
	height: number;
	className?: string;
	chatId: string;
	onError: (chatId: string) => void;
}

function ImageWithFallback({ src, alt, width, height, className, chatId, onError }: ImageWithFallbackProps) {
	const [imgSrc, setImgSrc] = useState(src);

	useEffect(() => {
		setImgSrc(src);
	}, [src]);

	return (
		<Image
			src={imgSrc}
			alt={alt}
			width={width}
			height={height}
			className={className}
			onError={() => {
				if (imgSrc !== DEFAULT_PROFILE_IMAGE) {
					setImgSrc(DEFAULT_PROFILE_IMAGE);
					onError(chatId);
				}
			}}
		/>
	);
}

export function GroupManager() {
	const { data: savedChatsData, loading: loadingSavedChats, refetch } = useGetUserSavedChatsQuery();
	const [getChatPhoto] = useGetChatPhotoLazyQuery();
	const [sortConfig, setSortConfig] = useState<SortConfig>({ field: "name", direction: "asc" });
	const [pendingRemovals, setPendingRemovals] = useState<string[]>([]);
	const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
	const [chatPhotos, setChatPhotos] = useState<Record<string, string>>({});
	const [showTelegramSetup, setShowTelegramSetup] = useState(false);

	const [saveChats, { loading: savingChats }] = useSaveUserChatsMutation({
		onCompleted: async () => {
			setPendingRemovals([]);
			setHasUnsavedChanges(false);
			await refetch();
		},
	});

	const handleImageError = (chatId: string) => {
		setChatPhotos((prev) => ({
			...prev,
			[chatId]: DEFAULT_PROFILE_IMAGE,
		}));
	};

	// Fetch photos for saved chats if they aren't in global cache
	useEffect(() => {
		if (savedChatsData?.getUserSavedChats.chats) {
			const chatIdsToFetch = new Set<string>();

			savedChatsData.getUserSavedChats.chats.forEach((chat) => {
				const cachedPhoto = getPhoto(chat.id);
				if (cachedPhoto) {
					setChatPhotos((prev) => ({
						...prev,
						[chat.id]: cachedPhoto,
					}));
				} else {
					chatIdsToFetch.add(chat.id);
				}
			});

			if (chatIdsToFetch.size > 0) {
				Array.from(chatIdsToFetch).forEach((chatId) => {
					getChatPhoto({
						variables: { chatId },
						onCompleted: (data) => {
							if (data.getChatPhoto) {
								const photoUrl = data.getChatPhoto === "no-photo" || !data.getChatPhoto ? DEFAULT_PROFILE_IMAGE : data.getChatPhoto;
								setChatPhotos((prev) => ({
									...prev,
									[chatId]: photoUrl,
								}));
								if (photoUrl !== DEFAULT_PROFILE_IMAGE) {
									savePhoto(chatId, photoUrl);
								}
							}
						},
						onError: (error) => {
							console.error("Error fetching chat photo:", error);
							setChatPhotos((prev) => ({
								...prev,
								[chatId]: DEFAULT_PROFILE_IMAGE,
							}));
						},
					});
				});
			}
		}
	}, [savedChatsData, getChatPhoto]);

	const callers = useMemo(
		() =>
			savedChatsData?.getUserSavedChats.chats.map((chat) => ({
				id: chat.id,
				name: chat.name,
				profileImageUrl: chatPhotos[chat.id] || DEFAULT_PROFILE_IMAGE,
				callCount: chat.callCount,
				winRate: 0,
				timestamp: new Date().toISOString(),
			})) || [],
		[savedChatsData, chatPhotos]
	);

	const handleSort = (field: SortField) => {
		setSortConfig((prevConfig) => ({
			field,
			direction: prevConfig.field === field && prevConfig.direction === "asc" ? "desc" : "asc",
		}));
	};

	const getSortIcon = (field: SortField) => {
		if (sortConfig.field !== field) return <FaSort className={styles.sortIcon} />;
		return sortConfig.direction === "asc" ? <FaSortUp className={styles.sortIcon} /> : <FaSortDown className={styles.sortIcon} />;
	};

	const sortedCallers = useMemo(() => {
		const sorted = [...callers].sort((a, b) => {
			const direction = sortConfig.direction === "asc" ? 1 : -1;

			switch (sortConfig.field) {
				case "name":
					return direction * a.name.localeCompare(b.name);
				case "callCount":
					return direction * (a.callCount - b.callCount);
				case "winRate":
					return direction * (a.winRate - b.winRate);
				case "timestamp":
					return direction * (new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
				default:
					return 0;
			}
		});
		return sorted;
	}, [callers, sortConfig]);

	const handleRemoveCaller = (callerId: string) => {
		setPendingRemovals((prev) => {
			const isAlreadyPending = prev.includes(callerId);
			if (isAlreadyPending) {
				// Remove from pending removals
				const newPendingRemovals = prev.filter((id) => id !== callerId);
				setHasUnsavedChanges(newPendingRemovals.length > 0);
				return newPendingRemovals;
			} else {
				// Add to pending removals
				setHasUnsavedChanges(true);
				return [...prev, callerId];
			}
		});
	};

	const handleSaveChanges = async () => {
		const currentCallerIds = callers.map((caller) => caller.id);
		const remainingCallerIds = currentCallerIds.filter((id) => !pendingRemovals.includes(id));

		try {
			await saveChats({
				variables: {
					input: {
						chatIds: remainingCallerIds,
					},
				},
			});
		} catch (error) {
			console.error("Failed to save changes:", error);
		}
	};

	const handleCancelChanges = () => {
		setPendingRemovals([]);
		setHasUnsavedChanges(false);
	};

	if (loadingSavedChats || savingChats) {
		return (
			<>
				<div className={styles.loadingOverlay} />
				<div className={styles.loadingContainer}>
					<div className={styles.loadingSpinner}></div>
					<p className={styles.loadingText}>{savingChats ? "Saving changes..." : "Loading saved chats..."}</p>
				</div>
			</>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.tableContainer}>
				<table className={styles.table}>
					<thead>
						<tr>
							<th>
								<div onClick={() => handleSort("name")} className={styles.sortableHeader}>
									Caller {getSortIcon("name")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("callCount")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
									Call Count {getSortIcon("callCount")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("winRate")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
									Win Rate {getSortIcon("winRate")}
								</div>
							</th>
							<th>
								<div onClick={() => handleSort("timestamp")} className={`${styles.sortableHeader} ${styles.centerHeader}`}>
									Last Active {getSortIcon("timestamp")}
								</div>
							</th>
							<th>
								<div className={styles.centerHeader}>Actions</div>
							</th>
						</tr>
					</thead>
					<tbody>
						{sortedCallers.map((caller) => (
							<tr key={caller.id} className={pendingRemovals.includes(caller.id) ? styles.pendingRemoval : ""}>
								<td>
									<div className={styles.nameCell}>
										<div className={styles.callerImageWrapper}>
											<ImageWithFallback src={caller.profileImageUrl} alt={caller.name} width={44} height={44} className={styles.callerImage} chatId={caller.id} onError={handleImageError} />
										</div>
										<span className={styles.callerName}>{caller.name}</span>
									</div>
								</td>
								<td className={styles.centerCell}>{caller.callCount}</td>
								<td className={styles.centerCell}>{caller.winRate}%</td>
								<td className={styles.centerCell}>{new Date(caller.timestamp).toLocaleDateString()}</td>
								<td className={styles.centerCell}>
									<button className={`${styles.actionButton} ${pendingRemovals.includes(caller.id) ? styles.removeButton : ""}`} onClick={() => handleRemoveCaller(caller.id)}>
										{pendingRemovals.includes(caller.id) ? "Undo Remove" : "Remove"}
									</button>
								</td>
							</tr>
						))}
					</tbody>
				</table>
			</div>
			<div className={styles.actionButtonsContainer}>
				{hasUnsavedChanges ? (
					<>
						<button onClick={handleCancelChanges} className={`${styles.button} ${styles.buttonSecondary}`}>
							Cancel
						</button>
						<button onClick={handleSaveChanges} className={`${styles.button} ${styles.buttonSuccess}`}>
							Save Changes
						</button>
					</>
				) : (
					<button onClick={() => setShowTelegramSetup(true)} className={`${styles.button} ${styles.buttonPrimary}`}>
						Add Group
					</button>
				)}
			</div>
			{showTelegramSetup && (
				<>
					<div className={styles.backdrop} onClick={() => setShowTelegramSetup(false)} />
					<div className={styles.modalOverlay}>
						<TelegramSetup
							onClose={() => setShowTelegramSetup(false)}
							onSetupComplete={() => {
								refetch();
							}}
							showManagerAfterSetup={true}
						/>
					</div>
				</>
			)}
		</div>
	);
}
