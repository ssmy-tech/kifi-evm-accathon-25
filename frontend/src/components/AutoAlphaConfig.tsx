"use client";

import { useState } from "react";
import styles from "./AutoAlphaConfig.module.css";
import { Switch } from "@headlessui/react";
import { mockCallers } from "@/data/mockData";
import { Caller } from "@/types/caller.types";
import Image from "next/image";
import { FiChevronDown, FiChevronUp } from "react-icons/fi";

interface AutoAlphaConfigProps {
	onConfigChange: (config: AutoAlphaSettings) => void;
}

interface AutoAlphaSettings {
	isEnabled: boolean;
	buyAmount: number;
	groupThreshold: number;
	maxSlippage: number;
	useMev: boolean;
	gasLimit: number;
	selectedCallers: string[];
}

export function AutoAlphaConfig({ onConfigChange }: AutoAlphaConfigProps) {
	const [settings, setSettings] = useState<AutoAlphaSettings>({
		isEnabled: false,
		buyAmount: 0.1,
		groupThreshold: 3,
		maxSlippage: 2,
		useMev: false,
		gasLimit: 300000,
		selectedCallers: mockCallers.slice(0, 2).map((caller: Caller) => caller.name),
	});
	const [isCallerDropdownOpen, setIsCallerDropdownOpen] = useState(false);

	function handleSettingChange<K extends keyof AutoAlphaSettings>(key: K, value: AutoAlphaSettings[K]) {
		const newSettings = { ...settings, [key]: value };
		setSettings(newSettings);
		onConfigChange(newSettings);
	}

	function toggleCaller(callerName: string) {
		const newSelectedCallers = settings.selectedCallers.includes(callerName) ? settings.selectedCallers.filter((c) => c !== callerName) : [...settings.selectedCallers, callerName];
		handleSettingChange("selectedCallers", newSelectedCallers);
	}

	function toggleCallerDropdown() {
		setIsCallerDropdownOpen(!isCallerDropdownOpen);
	}

	const selectedCallerObjects = mockCallers.filter((caller) => settings.selectedCallers.includes(caller.name));

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
						<input type="number" min="0.1" max="100" step="0.1" value={settings.maxSlippage} onChange={(e) => handleSettingChange("maxSlippage", parseFloat(e.target.value))} className={styles.input} />
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
								{settings.selectedCallers.length}/{mockCallers.length}
							</span>
						</label>
						<div className={styles.callerSelectContainer}>
							<div className={styles.callerSelectHeader} onClick={toggleCallerDropdown}>
								<div className={styles.callersContainer}>
									{selectedCallerObjects.length > 0 ? (
										<>
											{selectedCallerObjects.slice(0, 10).map((caller, i) => (
												<div key={caller.id} className={styles.callerImageWrapper} style={{ zIndex: 10 - i }}>
													<Image src={caller.profileImageUrl} alt={caller.name} width={32} height={32} className={styles.callerImage} />
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
									{mockCallers.map((caller) => (
										<div key={caller.id} className={styles.callerItem} onClick={() => toggleCaller(caller.name)}>
											<div className={styles.callerInfo}>
												<div className={styles.callerImageContainer}>
													<Image src={caller.profileImageUrl} alt={caller.name} width={32} height={32} className={styles.callerImage} />
												</div>
												<span className={styles.callerName}>{caller.name}</span>
											</div>
											<input type="checkbox" id={`caller-${caller.id}`} checked={settings.selectedCallers.includes(caller.name)} onChange={(e) => e.stopPropagation()} className={styles.checkbox} />
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
