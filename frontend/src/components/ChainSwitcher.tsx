"use client";

import { useState } from "react";
import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { useChain } from "@/contexts/ChainContext";
import styles from "./ChainSwitcher.module.css";

export default function ChainSwitcher() {
	const { currentChain, setCurrentChain, availableChains } = useChain();
	const [isOpen, setIsOpen] = useState(false);

	return (
		<div className={styles.chainSwitcher}>
			<button className={styles.chainButton} onClick={() => setIsOpen(!isOpen)} aria-label="Select blockchain network" aria-expanded={isOpen}>
				<div className={styles.buttonContent}>
					<Image src={currentChain.icon} alt={currentChain.name} width={24} height={24} />
					<span className={styles.chainName}>{currentChain.name}</span>
				</div>
				<ChevronDown className={`${styles.chevron} ${isOpen ? styles.chevronOpen : ""}`} size={20} />
			</button>

			{isOpen && (
				<div className={styles.dropdown}>
					{availableChains
						.filter((chain) => chain.id !== currentChain.id)
						.map((chain) => (
							<button
								key={chain.id}
								className={`${styles.chainOption} ${currentChain.id === chain.id ? styles.active : ""}`}
								onClick={() => {
									setCurrentChain(chain);
									setIsOpen(false);
								}}
							>
								<Image src={chain.icon} alt={chain.name} width={24} height={24} />
								<span>{chain.name}</span>
							</button>
						))}
				</div>
			)}
		</div>
	);
}
