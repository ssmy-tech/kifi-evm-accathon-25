"use client";

import { useState } from "react";
import { clearCallerPhotos, clearTokenFeedPhotos, clearTelegramChatPhotos, clearCallerFeedPhotos, clearAllPhotoCache } from "@/utils/localStorage";

const buttonStyle = {
	padding: "8px 12px",
	margin: "5px",
	backgroundColor: "#f3f4f6",
	border: "1px solid #e5e7eb",
	borderRadius: "4px",
	cursor: "pointer",
	fontSize: "14px",
	color: "#4b5563",
};

const dangerButtonStyle = {
	...buttonStyle,
	backgroundColor: "#fee2e2",
	borderColor: "#fecaca",
	color: "#b91c1c",
};

const containerStyle = {
	position: "fixed" as const,
	bottom: "20px",
	right: "20px",
	padding: "15px",
	backgroundColor: "white",
	borderRadius: "8px",
	boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
	zIndex: 1000,
	display: "flex",
	flexDirection: "column" as const,
	gap: "5px",
};

const headerStyle = {
	display: "flex",
	justifyContent: "space-between",
	alignItems: "center",
	marginBottom: "10px",
};

export default function DebugTools() {
	const [isOpen, setIsOpen] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const showMessage = (msg: string) => {
		setMessage(msg);
		setTimeout(() => setMessage(null), 3000);
	};

	const handleClearCallerPhotos = () => {
		clearCallerPhotos();
		showMessage("Caller photos cleared!");
	};

	const handleClearTokenFeedPhotos = () => {
		clearTokenFeedPhotos();
		showMessage("Token feed photos cleared!");
	};

	const handleClearTelegramChatPhotos = () => {
		clearTelegramChatPhotos();
		showMessage("Telegram chat photos cleared!");
	};

	const handleClearCallerFeedPhotos = () => {
		clearCallerFeedPhotos();
		showMessage("CallerFeed photos cleared!");
	};

	const handleClearAllPhotos = () => {
		clearAllPhotoCache();
		showMessage("All photo caches cleared!");
	};

	const handleClearAllLocalStorage = () => {
		localStorage.clear();
		showMessage("All localStorage cleared!");
	};

	if (!isOpen) {
		return (
			<button
				style={{
					...buttonStyle,
					position: "fixed",
					bottom: "20px",
					right: "20px",
					zIndex: 1000,
					opacity: 0.7,
				}}
				onClick={() => setIsOpen(true)}
			>
				Debug
			</button>
		);
	}

	return (
		<div style={containerStyle}>
			<div style={headerStyle}>
				<h3 style={{ margin: 0, fontSize: "16px" }}>Debug Tools</h3>
				<button
					style={{
						border: "none",
						background: "none",
						cursor: "pointer",
						fontSize: "16px",
					}}
					onClick={() => setIsOpen(false)}
				>
					×
				</button>
			</div>

			<button style={buttonStyle} onClick={handleClearCallerPhotos}>
				Clear Global Caller Photos
			</button>

			<button style={buttonStyle} onClick={handleClearCallerFeedPhotos}>
				Clear CallerFeed Photos
			</button>

			<button style={buttonStyle} onClick={handleClearTokenFeedPhotos}>
				Clear Token Feed Photos
			</button>

			<button style={buttonStyle} onClick={handleClearTelegramChatPhotos}>
				Clear Telegram Chat Photos
			</button>

			<button style={buttonStyle} onClick={handleClearAllPhotos}>
				Clear All Photo Caches
			</button>

			<button style={dangerButtonStyle} onClick={handleClearAllLocalStorage}>
				Clear ALL localStorage
			</button>

			{message && (
				<div
					style={{
						marginTop: "10px",
						padding: "8px",
						backgroundColor: "#d1fae5",
						borderRadius: "4px",
						fontSize: "14px",
						color: "#065f46",
					}}
				>
					{message}
				</div>
			)}
		</div>
	);
}
