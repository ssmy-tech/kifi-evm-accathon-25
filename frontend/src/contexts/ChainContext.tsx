"use client";

import { createContext, useContext, useState, ReactNode } from "react";

interface Chain {
	id: string;
	name: string;
	icon: string;
}

interface ChainContextType {
	currentChain: Chain;
	setCurrentChain: (chain: Chain) => void;
	availableChains: Chain[];
	isLoadingTokens: boolean;
	setIsLoadingTokens: (loading: boolean) => void;
}

const defaultChains: Chain[] = [
	{ id: "10143", name: "Monad", icon: "/assets/chains/monad.png" },
	{ id: "8453", name: "Base", icon: "/assets/chains/base.png" },
	{ id: "solana", name: "Solana", icon: "/assets/chains/solana.png" },
];

function getInitialChain(): Chain {
	if (typeof window === "undefined") return defaultChains[0];

	const savedChain = localStorage.getItem("selectedChain");
	if (savedChain) {
		const parsed = JSON.parse(savedChain);
		// Validate the saved chain exists in available chains
		if (defaultChains.some((chain) => chain.id === parsed.id)) {
			return parsed;
		}
	}
	return defaultChains[0];
}

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export function ChainProvider({ children }: { children: ReactNode }) {
	const [currentChain, setCurrentChain] = useState<Chain>(getInitialChain());
	const [isLoadingTokens, setIsLoadingTokens] = useState(false);

	const handleChainChange = (chain: Chain) => {
		setCurrentChain(chain);
		localStorage.setItem("selectedChain", JSON.stringify(chain));
	};

	return (
		<ChainContext.Provider
			value={{
				currentChain,
				setCurrentChain: handleChainChange,
				availableChains: defaultChains,
				isLoadingTokens,
				setIsLoadingTokens,
			}}
		>
			{children}
		</ChainContext.Provider>
	);
}

export function useChain() {
	const context = useContext(ChainContext);
	if (context === undefined) {
		throw new Error("useChain must be used within a ChainProvider");
	}
	return context;
}
