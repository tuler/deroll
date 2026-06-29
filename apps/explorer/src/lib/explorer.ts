// Block explorers for the EVM chains Cartesi Rollups is deployed on (plus a few
// common ones). Transaction pages follow the conventional `${url}/tx/<hash>`.
// Chains absent from this map (e.g. local devnets like 31337) have no explorer.

interface Explorer {
  name: string
  url: string
}

const EXPLORERS: Record<number, Explorer> = {
  1: { name: 'Etherscan', url: 'https://etherscan.io' },
  11155111: { name: 'Sepolia Etherscan', url: 'https://sepolia.etherscan.io' },
  17000: { name: 'Holesky Etherscan', url: 'https://holesky.etherscan.io' },
  10: { name: 'Optimistic Etherscan', url: 'https://optimistic.etherscan.io' },
  11155420: { name: 'Optimism Sepolia Etherscan', url: 'https://sepolia-optimism.etherscan.io' },
  42161: { name: 'Arbiscan', url: 'https://arbiscan.io' },
  421614: { name: 'Arbitrum Sepolia Arbiscan', url: 'https://sepolia.arbiscan.io' },
  8453: { name: 'Basescan', url: 'https://basescan.org' },
  84532: { name: 'Base Sepolia Basescan', url: 'https://sepolia.basescan.org' },
  137: { name: 'Polygonscan', url: 'https://polygonscan.com' },
  100: { name: 'Gnosisscan', url: 'https://gnosisscan.io' },
}

/** The block explorer for a chain, or undefined when none is known. */
export function explorerFor(chainId?: number | null): Explorer | undefined {
  return chainId == null ? undefined : EXPLORERS[chainId]
}

/** URL of a transaction on the chain's block explorer, or undefined when none is known. */
export function txExplorerUrl(chainId?: number | null, hash?: string | null): string | undefined {
  const explorer = explorerFor(chainId)
  return explorer && hash ? `${explorer.url}/tx/${hash}` : undefined
}
