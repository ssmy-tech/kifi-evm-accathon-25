"use client";

import { useState, useEffect } from "react";
import styles from "./AutoAlphaConfig.module.css";
import { Switch } from "@headlessui/react";
import Image from "next/image";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";
import { useGetUserSavedChatsQuery, useGetChatPhotoLazyQuery, useGetUserSettingsQuery, useUpdateUserSettingsMutation } from "@/generated/graphql";
import { getPhoto, savePhoto } from "@/utils/localStorage";

interface AutoAlphaConfigProps {
	onConfigChange: (config: AutoAlphaSettings) => void;
}

interface AutoAlphaSettings {
	isEnabled: boolean;
	buyAmount: number;
	groupThreshold: number;
	maxSlippage: number; // Stored as whole number (e.g., 2 for 2%)
	selectedCallers: string[];
}

export function AutoAlphaConfig({ onConfigChange }: AutoAlphaConfigProps) {
	const [updateUserSettings] = useUpdateUserSettingsMutation();
	const { data: userSettings, loading: loadingSettings } = useGetUserSettingsQuery();
	const [settings, setSettings] = useState<AutoAlphaSettings>({
		isEnabled: false,
		buyAmount: 0.05,
		groupThreshold: 3,
		maxSlippage: 10,
		selectedCallers: [],
	});

	// Import user settings when available
	useEffect(() => {
		if (userSettings) {
			setSettings(() => ({
				isEnabled: userSettings.getUserSettings.enableAutoAlpha,
				buyAmount: userSettings.getUserSettings.buyAmount,
				groupThreshold: userSettings.getUserSettings.groupCallThreshold,
				maxSlippage: userSettings.getUserSettings.slippage * 100,
				selectedCallers: userSettings.getUserSettings.selectedChatsIds,
			}));
		}
	}, [userSettings]);

	// Debounced settings update
	useEffect(() => {
		const timer = setTimeout(() => {
			if (!loadingSettings) {
				updateUserSettings({
					variables: {
						input: {
							enableAutoAlpha: settings.isEnabled,
							buyAmount: settings.buyAmount,
							groupCallThreshold: settings.groupThreshold,
							slippage: settings.maxSlippage / 100,
							selectedChatsIds: settings.selectedCallers,
						},
					},
				});
			}
		}, 500);

		return () => clearTimeout(timer);
	}, [settings, loadingSettings, updateUserSettings]);

	const [isCallerDropdownOpen, setIsCallerDropdownOpen] = useState(false);
	const [chatPhotos, setChatPhotos] = useState<Record<string, string>>({});

	// Get saved chats and photo query
	const { data: savedChats, loading: loadingSaved } = useGetUserSavedChatsQuery();
	const [getChatPhoto] = useGetChatPhotoLazyQuery();

	// Fetch photos for saved chats
	useEffect(() => {
		if (savedChats?.getUserSavedChats.chats) {
			savedChats.getUserSavedChats.chats.forEach((chat) => {
				if (!chatPhotos[chat.id]) {
					// First try to get from localStorage
					const cachedPhoto = getPhoto(chat.id);

					if (cachedPhoto) {
						// If found in cache, use it
						setChatPhotos((prev) => ({
							...prev,
							[chat.id]: cachedPhoto,
						}));
					} else {
						// If not in cache, fetch from API
						getChatPhoto({
							variables: { chatId: chat.id },
							onCompleted: (data) => {
								if (data.getChatPhoto) {
									const photoUrl = data.getChatPhoto === "no-photo" || !data.getChatPhoto ? "/assets/KiFi_LOGO.jpg" : data.getChatPhoto;

									// Update local state
									setChatPhotos((prev) => ({
										...prev,
										[chat.id]: photoUrl,
									}));

									// Save to localStorage if it's not the default image
									if (photoUrl !== "/assets/KiFi_LOGO.jpg") {
										savePhoto(chat.id, photoUrl);
									}
								}
							},
							onError: () => {
								const defaultImage = "/assets/KiFi_LOGO.jpg";
								setChatPhotos((prev) => ({
									...prev,
									[chat.id]: defaultImage,
								}));
							},
						});
					}
				}
			});
		}
	}, [savedChats, getChatPhoto, chatPhotos]);

	function handleSettingChange<K extends keyof AutoAlphaSettings>(key: K, value: AutoAlphaSettings[K]) {
		const newSettings = { ...settings, [key]: value };
		setSettings(newSettings);
		onConfigChange?.(newSettings);
	}

	function toggleCaller(callerId: string) {
		const newSelectedCallers = settings.selectedCallers.includes(callerId) ? settings.selectedCallers.filter((c) => c !== callerId) : [...settings.selectedCallers, callerId];
		handleSettingChange("selectedCallers", newSelectedCallers);
	}

	function toggleCallerDropdown() {
		setIsCallerDropdownOpen(!isCallerDropdownOpen);
	}

	const selectedCallerObjects = savedChats?.getUserSavedChats.chats.filter((chat) => settings.selectedCallers.includes(chat.id)) || [];

	if (loadingSaved) {
		return (
			<div className={styles.loadingContainer}>
				<div className={styles.loadingSpinner}></div>
				<p className={styles.loadingText}>Loading callers...</p>
			</div>
		);
	}

	return (
		<div className={styles.container}>
			<div className={styles.column}>
				<div className={styles.row}>
					<div className={styles.configGroup}>
						<label className={styles.label}>Buy Amount (ETH)</label>
						<input type="number" min="0.01" step="0.01" value={settings.buyAmount} onChange={(e) => handleSettingChange("buyAmount", parseFloat(e.target.value))} className={styles.input} />
					</div>

					<div className={styles.configGroup}>
						<label className={styles.label}>Slippage %</label>
						<input type="number" min="1" max="100" step="1" value={settings.maxSlippage} onChange={(e) => handleSettingChange("maxSlippage", Math.max(1, Math.min(100, parseInt(e.target.value) || 1)))} className={styles.input} />
					</div>
				</div>
			</div>

			<div className={styles.column}>
				<div className={styles.row}>
					<div className={styles.configGroup}>
						<label className={styles.label}>Call Group Threshold</label>
						<input type="number" min="1" max="10" value={settings.groupThreshold} onChange={(e) => handleSettingChange("groupThreshold", parseInt(e.target.value))} className={styles.input} />
					</div>
					<div className={styles.configGroup}>
						<label className={styles.label}>
							Call Group Selector
							<span className={styles.callerCount}>
								{settings.selectedCallers.length}/{savedChats?.getUserSavedChats.chats.length || 0}
							</span>
						</label>
						<div className={styles.callerSelectContainer}>
							<div className={styles.callerSelectHeader} onClick={toggleCallerDropdown}>
								<div className={styles.callersContainer}>
									{selectedCallerObjects.length > 0 ? (
										<>
											{selectedCallerObjects.slice(0, 10).map((chat, i) => (
												<div key={chat.id} className={styles.callerImageWrapper} style={{ zIndex: 10 - i }}>
													<Image src={chatPhotos[chat.id] || "/assets/KiFi_LOGO.jpg"} alt={chat.name} width={32} height={32} className={styles.callerImage} />
												</div>
											))}
											{selectedCallerObjects.length > 10 && <div className={styles.extraCallersCount}>+{selectedCallerObjects.length - 10}</div>}
										</>
									) : (
										<div className={styles.noCallersSelected}>No callers selected</div>
									)}
								</div>
								<div className={styles.dropdownIcon}>{isCallerDropdownOpen ? <FiChevronUp /> : <FiChevronDown />}</div>
							</div>

							{isCallerDropdownOpen && (
								<div className={styles.callerDropdown}>
									{savedChats?.getUserSavedChats.chats.map((chat) => (
										<div key={chat.id} className={styles.callerItem} onClick={() => toggleCaller(chat.id)}>
											<div className={styles.callerInfo}>
												<div className={styles.callerImageWrapper}>
													<Image src={chatPhotos[chat.id] || "/assets/KiFi_LOGO.jpg"} alt={chat.name} width={32} height={32} className={styles.callerImage} />
												</div>
												<span className={styles.callerName}>{chat.name}</span>
											</div>
											<input type="checkbox" checked={settings.selectedCallers.includes(chat.id)} onChange={(e) => e.stopPropagation()} className={styles.checkbox} />
										</div>
									))}
								</div>
							)}
						</div>
					</div>
				</div>
			</div>

			<div className={styles.enableAutoAlpha}>
				<label className={styles.enableLabel}>Enable Auto Alpha</label>
				<Switch checked={settings.isEnabled} onChange={(checked) => handleSettingChange("isEnabled", checked)} className={styles.enableSwitch}>
					<span className={`${styles.enableSlider} ${settings.isEnabled ? styles.enabled : ""}`} />
				</Switch>
			</div>
		</div>
	);
}
