import { Link, useParams } from 'react-router-dom'
import { useEpoch } from '../api/hooks'
import { Collapsible, Crumbs, ErrorBox, Hex, JsonView, KV, Section, Spinner, StatusBadge } from '../components/ui'
import { TxHash } from '../components/TxHash'
import { decimalToHex, formatDate, formatUint, hexToBigInt } from '../lib/format'
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
  const epoch = useEpoch(appParam, decimalToHex(epochIndex))

  if (epoch.isLoading) return <Spinner />
  if (epoch.error) return <ErrorBox error={epoch.error} />
  const e = epoch.data!.data

  const base = `/apps/${appParam}`
  const lo = hexToBigInt(e.input_index_lower_bound)
  const hi = hexToBigInt(e.input_index_upper_bound)
  const inputCount = lo !== null && hi !== null && hi > lo ? hi - lo : 0n

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
            ['Virtual index', formatUint(e.virtual_index)],
            ['Status', <StatusBadge status={e.status} />],
            ['Block range', `${formatUint(e.first_block)} – ${formatUint(e.last_block)}`],
            [
              'Input index range',
              inputCount > 0n
                ? `${lo!.toLocaleString()} – ${(hi! - 1n).toLocaleString()} (${inputCount.toLocaleString()} inputs)`
                : 'no inputs',
            ],
            ['Machine hash', <Hex value={e.machine_hash} full />],
            ['Outputs merkle root', <Hex value={e.outputs_merkle_root} full />],
            ['Commitment', <Hex value={e.commitment} full />],
            ['Claim transaction', <TxHash value={e.claim_transaction_hash} full />],
            e.tournament_address
              ? [
                  'Tournament',
                  <Hex
                    value={e.tournament_address}
                    full
                    to={`${base}/tournaments/${e.tournament_address}`}
                  />,
                ]
              : null,
            ['Created', formatDate(e.created_at)],
            ['Updated', formatDate(e.updated_at)],
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
        <Collapsible label={`Commitment proof (${e.commitment_proof?.length ?? 0} hashes)`}>
          <HashList hashes={e.commitment_proof} />
        </Collapsible>
        <Collapsible label={`Outputs merkle proof (${e.outputs_merkle_proof?.length ?? 0} hashes)`}>
          <HashList hashes={e.outputs_merkle_proof} />
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
