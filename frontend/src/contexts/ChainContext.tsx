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

const ChainContext = createContext<ChainContextType | undefined>(undefined);

export function ChainProvider({ children }: { children: ReactNode }) {
	const [currentChain, setCurrentChain] = useState<Chain>(defaultChains[0]);
	const [isLoadingTokens, setIsLoadingTokens] = useState(false);

	return (
		<ChainContext.Provider
			value={{
				currentChain,
				setCurrentChain,
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
