import { Message } from "@/types/caller.types";
import styles from "./CallContextChat.module.css";

interface CallContextProps {
	messages: Message[];
}

function formatTimestamp(timestamp: string) {
	return new Date(timestamp).toLocaleTimeString([], {
		hour: "2-digit",
		minute: "2-digit",
	});
}

export function CallContextChat({ messages }: CallContextProps) {
	// Filter unique messages by tgMessageId, exclude specific bots, and sort by timestamp
	const uniqueMessages = Object.values(
		messages.reduce((acc, message) => {
			if (!acc[message.tgMessageId]) {
				acc[message.tgMessageId] = message;
			}
			return acc;
		}, {} as Record<string, Message>)
	);

	const sortedMessages = uniqueMessages.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

	return (
		<div className={styles.container}>
			{sortedMessages.map((message) => (
				<div key={message.id} className={`${styles.messageWrapper} ${message.messageType === "Call" ? styles.callWrapper : ""}`}>
					<div className={`${styles.message} ${message.messageType === "Call" ? styles.call : ""}`}>
						<div>{message.text}</div>
						<div className={styles.messageFooter}>
							<div className={styles.reason}>{message.reason || ""}</div>
							<div className={styles.timestamp}>{formatTimestamp(message.createdAt)}</div>
						</div>
					</div>
				</div>
			))}
		</div>
	);
}
