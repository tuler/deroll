import { Link, useParams } from 'react-router-dom'
import { useMatch, useMatchAdvances } from '../api/hooks'
import { DataTable, Pager, useListControls } from '../components/table'
import { Collapsible, Crumbs, ErrorBox, Hex, JsonView, KV, Section, Spinner, StatusBadge } from '../components/ui'
import { TxHash } from '../components/TxHash'
import { decimalToHex, formatDate, formatUint, isZeroHex, shortHex, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function MatchPage() {
  const { appParam } = useApp()
  const { address = '', epochIndex = '0', idHash = '' } = useParams()
  const epochHex = decimalToHex(epochIndex)
  const { limit, offset, update } = useListControls()

  const match = useMatch(appParam, epochHex, address, idHash)
  const advances = useMatchAdvances(appParam, epochHex, address, idHash, { limit, offset })

  if (match.isLoading) return <Spinner />
  if (match.error) return <ErrorBox error={match.error} />
  const m = match.data!.data
  const base = `/apps/${appParam}`
  const deleted = m.deletion_reason !== 'NOT_DELETED'

  return (
    <div className="space-y-4">
      <Crumbs
        items={[
          { label: 'Tournaments', to: `${base}/tournaments` },
          { label: shortHex(address), to: `${base}/tournaments/${address}` },
          { label: `Match ${shortHex(m.id_hash)}` },
        ]}
      />

      <Section
        title={
          <span className="flex items-center gap-3">
            Match <Hex value={m.id_hash} />
            <StatusBadge status={m.winner_commitment} />
          </span>
        }
      >
        <KV
          rows={[
            ['ID hash', <Hex value={m.id_hash} full />],
            [
              'Tournament',
              <Hex value={m.tournament_address} full to={`${base}/tournaments/${m.tournament_address}`} />,
            ],
            [
              'Epoch',
              <Link
                className="text-sky-700 hover:underline dark:text-sky-400"
                to={`${base}/epochs/${uintToDecimal(m.epoch_index)}`}
              >
                {formatUint(m.epoch_index)}
              </Link>,
            ],
            ['Commitment one', <Hex value={m.commitment_one} full />],
            ['Commitment two', <Hex value={m.commitment_two} full />],
            ['Left of two', <Hex value={m.left_of_two} full />],
            ['Winner', <StatusBadge status={m.winner_commitment} />],
            ['Created at block', formatUint(m.block_number)],
            ['Creation tx', <TxHash value={m.tx_hash} full />],
            ['Resolution', <StatusBadge status={m.deletion_reason} />],
            deleted && !isZeroHex(m.deletion_block_number)
              ? ['Resolved at block', formatUint(m.deletion_block_number)]
              : null,
            deleted && !isZeroHex(m.deletion_tx_hash)
              ? ['Resolution tx', <TxHash value={m.deletion_tx_hash} full />]
              : null,
            ['Created', formatDate(m.created_at)],
            ['Updated', formatDate(m.updated_at)],
          ]}
        />
      </Section>

      <Section title={`Match advances (${advances.data?.pagination.total_count ?? '…'})`}>
        <DataTable
          columns={[
            { header: 'Other parent', cell: (a) => <Hex value={a.other_parent} /> },
            { header: 'Left node', cell: (a) => <Hex value={a.left_node} /> },
            { header: 'Block', align: 'right', cell: (a) => formatUint(a.block_number) },
            { header: 'Tx', cell: (a) => <TxHash value={a.tx_hash} /> },
            { header: 'Observed', cell: (a) => formatDate(a.created_at) },
          ]}
          rows={advances.data?.data}
          rowKey={(a) => `${a.other_parent}-${a.left_node}-${a.block_number}`}
          isLoading={advances.isLoading}
          error={advances.error}
          empty="No advances recorded for this match."
        />
        <Pager
          pagination={advances.data?.pagination}
          limit={limit}
          offset={offset}
          onChange={(next) => update(next)}
        />
      </Section>

      <Collapsible label="Raw JSON">
        <JsonView value={m} />
      </Collapsible>
    </div>
  )
}
