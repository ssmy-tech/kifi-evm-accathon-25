"use client";

import { useState } from "react";
import { clearPhotos, cleanupPhotos } from "@/utils/localStorage";

const styles = {
	button: {
		padding: "8px 12px",
		margin: "5px",
		backgroundColor: "#f3f4f6",
		border: "1px solid #e5e7eb",
		borderRadius: "4px",
		cursor: "pointer",
		fontSize: "14px",
		color: "#4b5563",
	},
	dangerButton: {
		backgroundColor: "#fee2e2",
		borderColor: "#fecaca",
		color: "#b91c1c",
	},
	container: {
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
	},
	header: {
		display: "flex",
		justifyContent: "space-between",
		alignItems: "center",
		marginBottom: "10px",
	},
	message: {
		marginTop: "10px",
		padding: "8px",
		backgroundColor: "#d1fae5",
		borderRadius: "4px",
		fontSize: "14px",
		color: "#065f46",
	},
	closeButton: {
		border: "none",
		background: "none",
		cursor: "pointer",
		fontSize: "16px",
	},
	debugButton: {
		position: "fixed" as const,
		bottom: "20px",
		right: "20px",
		zIndex: 1000,
		opacity: 0.7,
	},
};

export default function DebugTools() {
	const [isOpen, setIsOpen] = useState(false);
	const [message, setMessage] = useState<string | null>(null);

	const showMessage = (msg: string) => {
		setMessage(msg);
		setTimeout(() => setMessage(null), 3000);
	};

	const handleClearPhotos = () => {
		clearPhotos();
		showMessage("All photos cleared from cache!");
	};

	const handleCleanupOldPhotos = () => {
		// Clean up photos older than 7 days
		cleanupPhotos(7 * 24 * 60 * 60 * 1000);
		showMessage("Old photos cleaned up!");
	};

	const handleClearAllLocalStorage = () => {
		localStorage.clear();
		showMessage("All localStorage cleared!");
	};

	if (!isOpen) {
		return (
			<button style={{ ...styles.button, ...styles.debugButton }} onClick={() => setIsOpen(true)}>
				Debug
			</button>
		);
	}

	return (
		<div style={styles.container}>
			<div style={styles.header}>
				<h3 style={{ margin: 0, fontSize: "16px" }}>Debug Tools</h3>
				<button style={styles.closeButton} onClick={() => setIsOpen(false)}>
					×
				</button>
			</div>

			<button style={styles.button} onClick={handleClearPhotos}>
				Clear All Photos Cache
			</button>

			<button style={styles.button} onClick={handleCleanupOldPhotos}>
				Clean Up Old Photos
			</button>

			<button style={{ ...styles.button, ...styles.dangerButton }} onClick={handleClearAllLocalStorage}>
				Clear ALL localStorage
			</button>

			{message && <div style={styles.message}>{message}</div>}
		</div>
	);
}
