export function getExplorerUrl(chainId: string, txHash: string): string {
	switch (chainId) {
		case "8453":
			return `https://basescan.org/tx/${txHash}`;
		case "10143":
			return `https://testnet.monadexplorer.com/tx/${txHash}`;
		case "solana":
			return `https://solscan.io/tx/${txHash}`;
		default:
			return `https://etherscan.io/tx/${txHash}`;
	}
}

export function getAddressExplorerUrl(chainId: string, address: string): string {
	switch (chainId) {
		case "8453":
			return `https://basescan.org/address/${address}`;
		case "10143":
			return `https://testnet.monadexplorer.com/address/${address}`;
		case "solana":
			return `https://solscan.io/account/${address}`;
		default:
			return `https://etherscan.io/address/${address}`;
	}
}
