import { useChainId } from '../api/hooks'
import { explorerFor, txExplorerUrl } from '../lib/explorer'
import { hexToBigInt } from '../lib/format'
import { Hex } from './ui'

/**
 * A transaction hash: monospace value with click-to-copy, plus — when the
 * connected node's chain has a known block explorer — a button that opens the
 * transaction there. Chains without a known explorer (e.g. local devnets) just
 * show the copy button.
 */
export function TxHash({ value, full }: { value?: string | null; full?: boolean }) {
  const chainIdBig = hexToBigInt(useChainId().data?.data)
  const chainId = chainIdBig === null ? undefined : Number(chainIdBig)
  const explorer = explorerFor(chainId)
  return (
    <Hex
      value={value}
      full={full}
      href={txExplorerUrl(chainId, value)}
      hrefTitle={explorer ? `View transaction on ${explorer.name}` : undefined}
    />
  )
}
