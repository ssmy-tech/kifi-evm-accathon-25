import React, { createContext, useContext, useState, ReactNode } from "react";

type FeedFilterType = "public" | "saved";

interface FeedFilterContextType {
	filterType: FeedFilterType;
	setFilterType: (type: FeedFilterType) => void;
}

const FeedFilterContext = createContext<FeedFilterContextType | undefined>(undefined);

export function FeedFilterProvider({ children }: { children: ReactNode }) {
	const [filterType, setFilterType] = useState<FeedFilterType>("public");

	return <FeedFilterContext.Provider value={{ filterType, setFilterType }}>{children}</FeedFilterContext.Provider>;
}

export function useFeedFilter() {
	const context = useContext(FeedFilterContext);
	if (context === undefined) {
		throw new Error("useFeedFilter must be used within a FeedFilterProvider");
	}
	return context;
}
