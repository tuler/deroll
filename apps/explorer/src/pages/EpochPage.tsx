import { Link, useParams } from 'react-router-dom'
import { useEpoch } from '../api/hooks'
import { Collapsible, Crumbs, ErrorBox, Hex, JsonView, KV, Section, Spinner, StatusBadge } from '../components/ui'
import { TxHash } from '../components/TxHash'
import { parseUintParam, formatDate, formatUint } from '../lib/format'
import { useApp } from './AppLayout'

function HashList({ hashes }: { hashes: string[] | null }) {
  if (!hashes || hashes.length === 0) return <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
  return (
    <ol className="space-y-1 font-mono text-xs">
      {hashes.map((h, i) => (
        <li key={i} className="flex gap-2">
          <span className="w-6 text-right text-slate-400 dark:text-slate-500">{i}</span>
          <Hex value={h} full />
        </li>
      ))}
    </ol>
  )
}

export function EpochPage() {
  const { appParam } = useApp()
  const { epochIndex = '0' } = useParams()
  const epoch = useEpoch(appParam, parseUintParam(epochIndex))

  if (epoch.isLoading) return <Spinner />
  if (epoch.error) return <ErrorBox error={epoch.error} />
  const e = epoch.data!

  const base = `/apps/${appParam}`
  const lo = e.inputIndexLowerBound
  const hi = e.inputIndexUpperBound
  const inputCount = hi > lo ? hi - lo : 0n

  return (
    <div className="space-y-4">
      <Crumbs
        items={[
          { label: 'Epochs', to: `${base}/epochs` },
          { label: `Epoch ${formatUint(e.index)}` },
        ]}
      />

      <Section
        title={
          <span className="flex items-center gap-3">
            Epoch {formatUint(e.index)} <StatusBadge status={e.status} />
          </span>
        }
      >
        <KV
          rows={[
            ['Index', formatUint(e.index)],
            ['Virtual index', formatUint(e.virtualIndex)],
            ['Status', <StatusBadge status={e.status} />],
            ['Block range', `${formatUint(e.firstBlock)} – ${formatUint(e.lastBlock)}`],
            [
              'Input index range',
              inputCount > 0n
                ? `${lo!.toLocaleString()} – ${(hi! - 1n).toLocaleString()} (${inputCount.toLocaleString()} inputs)`
                : 'no inputs',
            ],
            ['Machine hash', <Hex value={e.machineHash} full />],
            ['Outputs merkle root', <Hex value={e.outputsMerkleRoot} full />],
            ['Commitment', <Hex value={e.commitment} full />],
            ['Claim transaction', <TxHash value={e.claimTransactionHash} full />],
            e.stagedAtBlock ? ['Staged at block', formatUint(e.stagedAtBlock)] : null,
            e.tournamentAddress
              ? [
                  'Tournament',
                  <Hex
                    value={e.tournamentAddress}
                    full
                    to={`${base}/tournaments/${e.tournamentAddress}`}
                  />,
                ]
              : null,
            ['Created', formatDate(e.createdAt)],
            ['Updated', formatDate(e.updatedAt)],
          ]}
        />
      </Section>

      <Section title="Explore this epoch">
        <div className="flex flex-wrap gap-2">
          <QuickLink to={`${base}/inputs?epoch=${epochIndex}`} label="Inputs" />
          <QuickLink to={`${base}/outputs?epoch=${epochIndex}`} label="Outputs" />
          <QuickLink to={`${base}/reports?epoch=${epochIndex}`} label="Reports" />
          <QuickLink to={`${base}/tournaments?epoch=${epochIndex}`} label="Tournaments" />
        </div>
      </Section>

      <div className="space-y-2">
        <Collapsible label={`Commitment proof (${e.commitmentProof?.length ?? 0} hashes)`}>
          <HashList hashes={e.commitmentProof} />
        </Collapsible>
        <Collapsible label={`Outputs merkle proof (${e.outputsMerkleProof?.length ?? 0} hashes)`}>
          <HashList hashes={e.outputsMerkleProof} />
        </Collapsible>
        <Collapsible label="Raw JSON">
          <JsonView value={e} />
        </Collapsible>
      </div>
    </div>
  )
}

function QuickLink({ to, label }: { to: string; label: string }) {
  return (
    <Link
      to={to}
      className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
    >
      {label} →
    </Link>
  )
}
