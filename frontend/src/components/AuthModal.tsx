"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import styles from "./AuthModal.module.css";
import { TelegramSetup } from "./telegram/TelegramSetup";
import { TelegramChatsManager } from "./telegram/TelegramChatsManager";

interface AuthModalProps {
	isOpen: boolean;
	onClose: () => void;
}

type OnboardingStep = "welcome" | "preferences" | "telegram" | "complete";

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
	const { ready, authenticated, login, user } = usePrivy();
	const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>("welcome");
	const [showOnboarding, setShowOnboarding] = useState(false);
	const [animatingStep, setAnimatingStep] = useState(false);
	const contentRef = useRef<HTMLDivElement>(null);
	const modalRef = useRef<HTMLDivElement>(null);
	const [submitAttempted, setSubmitAttempted] = useState(false);
	const [telegramStage, setTelegramStage] = useState<"setup" | "manage" | "none">("none");

	const [formValues, setFormValues] = useState({
		quickBuyAmount: "",
		minGroupsIndicator: "",
		marketCaps: {
			microCap: false,
			smallCap: false,
			midCap: false,
			largeCap: false,
			blueChip: false,
		},
	});

	const isFormValid = () => {
		// Check if number inputs are filled
		const hasQuickBuyAmount = formValues.quickBuyAmount.trim() !== "";
		const hasMinGroups = formValues.minGroupsIndicator.trim() !== "";

		// Check if at least one market cap is selected
		const hasMarketCap = Object.values(formValues.marketCaps).some((value) => value);

		return hasQuickBuyAmount && hasMinGroups && hasMarketCap;
	};

	const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const { id, value, type, checked } = e.target;

		if (type === "checkbox") {
			setFormValues((prev) => ({
				...prev,
				marketCaps: {
					...prev.marketCaps,
					[id]: checked,
				},
			}));
		} else {
			setFormValues((prev) => ({
				...prev,
				[id]: value,
			}));
		}
	};

	const handleLogin = useCallback(async () => {
		try {
			login();
		} catch (error) {
			console.error("Login error:", error);
		}
	}, [login]);

	useEffect(() => {
		if (isOpen) {
			document.body.style.overflow = "hidden";
		} else {
			document.body.style.overflow = "auto";
			setShowOnboarding(false);
		}

		return () => {
			document.body.style.overflow = "auto";
		};
	}, [isOpen]);

	// Separate effect for handling login
	useEffect(() => {
		if (isOpen && !authenticated && ready) {
			handleLogin();
		}
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isOpen, authenticated, ready]);

	// USER SETUP & TOKEN CHECK
	useEffect(() => {
		const userSetup = async () => {
			if (authenticated && user && isOpen) {
				console.log(user);
				setShowOnboarding(true);
				setOnboardingStep("welcome");
			}
		};
		userSetup();
	}, [authenticated, user, isOpen]);

	// Function to handle step transition with animation
	const changeStep = (newStep: OnboardingStep) => {
		setAnimatingStep(true);

		// Fade out current step and modal
		if (contentRef.current && modalRef.current) {
			contentRef.current.style.opacity = "0";
			contentRef.current.style.transform = "translateY(-10px)";
			modalRef.current.style.opacity = "0.1";
		}

		// Change step after animation
		setTimeout(() => {
			setOnboardingStep(newStep);

			// Fade in new step and modal
			if (contentRef.current && modalRef.current) {
				// Small delay to ensure the DOM has updated
				setTimeout(() => {
					contentRef.current!.style.opacity = "1";
					contentRef.current!.style.transform = "translateY(0)";
					modalRef.current!.style.opacity = "1"; // Restore modal opacity
					setAnimatingStep(false);
				}, 50);
			}
		}, 200);
	};

	// Function to handle continue button click
	const handleContinue = () => {
		setSubmitAttempted(true);

		if (isFormValid()) {
			changeStep("telegram");
		}
	};

	if (!ready || !isOpen) return null;

	function renderOnboardingContent() {
		switch (onboardingStep) {
			case "welcome":
				return (
					<div className={styles.step}>
						<h2>Welcome to KiSignals! 👋</h2>
						<p>Let&apos;s complete your account setup and get to trading.</p>
						<button className={styles.nextButton} onClick={() => changeStep("preferences")} disabled={animatingStep}>
							Get Started
						</button>
					</div>
				);

			case "preferences":
				return (
					<div className={styles.step}>
						<h2>Your Preferences</h2>
						<div className={styles.preferencesForm}>
							<div className={styles.formItem}>
								<label htmlFor="quickBuyAmount">Quick Buy Amount</label>
								<div className={styles.formItemDescription}>Default amount in ETH you want to use for quick buys or Auto Alpha Buys.</div>
								<input type="number" id="quickBuyAmount" min="0" step="0.01" placeholder="Enter amount" value={formValues.quickBuyAmount} onChange={handleInputChange} className={submitAttempted && formValues.quickBuyAmount === "" ? styles.invalidInput : ""} />
							</div>

							<div className={styles.formItem}>
								<label htmlFor="minGroupsIndicator">Minimum Group Call Indicator</label>
								<div className={styles.formItemDescription}>Minimum number of groups required to call a token before Auto Alpha Buy is triggered. Monitored groups can be configured in settings.</div>
								<input type="number" id="minGroupsIndicator" min="1" placeholder="Enter minimum groups" value={formValues.minGroupsIndicator} onChange={handleInputChange} className={submitAttempted && formValues.minGroupsIndicator === "" ? styles.invalidInput : ""} />
							</div>

							<div className={styles.formItem}>
								<label htmlFor="targetMarketcaps">Target Market Caps for Memecoin Entries</label>
								<div className={styles.formItemDescription}>Select the market cap ranges you&apos;re interested in trading.</div>
								<div className={`${styles.checkboxGroup} ${submitAttempted && !Object.values(formValues.marketCaps).some((v) => v) ? styles.invalidCheckboxGroup : ""}`}>
									<div className={styles.checkboxItem}>
										<input type="checkbox" id="microCap" checked={formValues.marketCaps.microCap} onChange={handleInputChange} />
										<label htmlFor="microCap">Micro Cap (less than $50k)</label>
									</div>
									<div className={styles.checkboxItem}>
										<input type="checkbox" id="smallCap" checked={formValues.marketCaps.smallCap} onChange={handleInputChange} />
										<label htmlFor="smallCap">Small Cap ($50k - $500k)</label>
									</div>
									<div className={styles.checkboxItem}>
										<input type="checkbox" id="midCap" checked={formValues.marketCaps.midCap} onChange={handleInputChange} />
										<label htmlFor="midCap">Mid Cap ($1M - $10M)</label>
									</div>
									<div className={styles.checkboxItem}>
										<input type="checkbox" id="largeCap" checked={formValues.marketCaps.largeCap} onChange={handleInputChange} />
										<label htmlFor="largeCap">Large Cap ($10M - $100M)</label>
									</div>
									<div className={styles.checkboxItem}>
										<input type="checkbox" id="blueChip" checked={formValues.marketCaps.blueChip} onChange={handleInputChange} />
										<label htmlFor="blueChip">Blue Chip ($100M+)</label>
									</div>
								</div>
							</div>
						</div>
						<button className={styles.nextButton} onClick={handleContinue} disabled={animatingStep}>
							Continue
						</button>
						{submitAttempted && !isFormValid() && <p className={styles.validationMessage}>Please fill in all fields to continue</p>}
					</div>
				);

			case "telegram":
				return (
					<div className={styles.step}>
						{telegramStage === "setup" ? (
							<TelegramSetup onSetupComplete={() => setTelegramStage("manage")} showManagerAfterSetup={true} onContinue={() => changeStep("complete")} />
						) : telegramStage === "manage" ? (
							<div className={styles.telegramManagerWrapper}>
								<TelegramChatsManager />
								<div className={styles.telegramButtons}>
									<button className={styles.nextButton} onClick={() => changeStep("complete")}>
										Continue
									</button>
								</div>
							</div>
						) : (
							<>
								<h2 className={styles.stepTitle}>Connect Your Telegram</h2>
								<p className={styles.stepDescription}>Link your Telegram account to customize your feed and token alerts.</p>

								<div className={styles.telegramConnect}>
									<p className={styles.telegramDescription}>Connecting your Telegram account allows you to:</p>

									<ul className={styles.telegramBenefits}>
										<li>Aggregate your selected group calls into a single feed</li>
										<li>Easily view what tokens your groups are calling</li>
										<li>Trade with Auto Alpha Buys callibrated to your selected channels</li>
									</ul>

									<div className={styles.telegramButtons}>
										<button className={styles.nextButton} onClick={() => setTelegramStage("setup")}>
											Connect Telegram
										</button>

										<button className={styles.skipButton} onClick={() => changeStep("complete")}>
											Skip for now
										</button>
									</div>
								</div>
							</>
						)}
					</div>
				);

			case "complete":
				return (
					<div className={styles.step}>
						<h2>All Set! 🎉</h2>
						<p>You&apos;re ready to start trading with KiSignals.</p>
						<button className={styles.nextButton} onClick={onClose}>
							Start Trading
						</button>
					</div>
				);
		}
	}

	return authenticated && showOnboarding ? (
		<div className={styles.overlay}>
			<div ref={modalRef} className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ transition: "opacity 0.3s ease-out, transform 0.3s ease-out" }}>
				<div
					ref={contentRef}
					className={styles.content}
					style={{
						transition: "opacity 0.3s ease-out, transform 0.3s ease-out",
					}}
				>
					{renderOnboardingContent()}
				</div>
			</div>
		</div>
	) : null;
};

export default AuthModal;
