"use client";

import { PrivyProvider } from "@privy-io/react-auth";

export default function Providers({ children }: { children: React.ReactNode }) {
	if (!process.env.NEXT_PUBLIC_PRIVY_ID) {
		throw new Error("NEXT_PUBLIC_PRIVY_ID is not defined");
	}

	return (
		<PrivyProvider
			appId={process.env.NEXT_PUBLIC_PRIVY_ID}
			config={{
				appearance: {
					theme: "light",
					accentColor: "#9cd39c",
					logo: "https://pbs.twimg.com/profile_images/1879700694527324160/WNTWdaQr_400x400.jpg",
				},
				embeddedWallets: {
					createOnLogin: "users-without-wallets",
				},
			}}
		>
			{children}
		</PrivyProvider>
	);
}
