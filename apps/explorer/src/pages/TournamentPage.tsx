import { Link, useParams } from 'react-router-dom'
import { useCommitments, useMatches, useTournament, useTournaments } from '../api/hooks'
import { DataTable } from '../components/table'
import { Collapsible, Crumbs, ErrorBox, Hex, JsonView, KV, Section, Spinner, StatusBadge } from '../components/ui'
import { TxHash } from '../components/TxHash'
import { formatDate, formatUint, isZeroHex, shortHex, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function TournamentPage() {
  const { appParam } = useApp()
  const { address = '' } = useParams()
  const tournament = useTournament(appParam, address)
  const commitments = useCommitments(appParam, { tournament_address: address }, { limit: 100 })
  const matches = useMatches(appParam, { tournament_address: address }, { limit: 100 })
  const children = useTournaments(
    appParam,
    { parent_tournament_address: address },
    { limit: 100 },
  )

  if (tournament.isLoading) return <Spinner />
  if (tournament.error) return <ErrorBox error={tournament.error} />
  const t = tournament.data!.data
  const base = `/apps/${appParam}`
  const finished = !isZeroHex(t.finished_at_block)

  return (
    <div className="space-y-4">
      <Crumbs
        items={[
          { label: 'Tournaments', to: `${base}/tournaments` },
          { label: shortHex(t.address) },
        ]}
      />

      <Section
        title={
          <span className="flex items-center gap-3">
            Tournament <Hex value={t.address} full />
            <StatusBadge status={finished ? 'FINISHED' : 'IN_PROGRESS'} />
          </span>
        }
      >
        <KV
          rows={[
            [
              'Epoch',
              <Link
                className="text-sky-700 hover:underline dark:text-sky-400"
                to={`${base}/epochs/${uintToDecimal(t.epoch_index)}`}
              >
                {formatUint(t.epoch_index)}
              </Link>,
            ],
            ['Level', `${formatUint(t.level)} of ${formatUint(t.max_level)}`],
            ['log2 step', formatUint(t.log2step)],
            ['Height', formatUint(t.height)],
            t.parent_tournament_address
              ? [
                  'Parent tournament',
                  <Hex
                    value={t.parent_tournament_address}
                    full
                    to={`${base}/tournaments/${t.parent_tournament_address}`}
                  />,
                ]
              : ['Parent tournament', 'none (root tournament)'],
            t.parent_match_id_hash
              ? ['Parent match', <Hex value={t.parent_match_id_hash} full />]
              : null,
            ['Winner commitment', <Hex value={t.winner_commitment} full />],
            ['Final state hash', <Hex value={t.final_state_hash} full />],
            ['Finished at block', finished ? formatUint(t.finished_at_block) : 'in progress'],
            ['Created', formatDate(t.created_at)],
            ['Updated', formatDate(t.updated_at)],
          ]}
        />
      </Section>

      <Section title={`Commitments (${commitments.data?.pagination.total_count ?? '…'})`}>
        <DataTable
          columns={[
            { header: 'Commitment', cell: (c) => <Hex value={c.commitment} /> },
            { header: 'Final state', cell: (c) => <Hex value={c.final_state_hash} /> },
            { header: 'Submitter', cell: (c) => <Hex value={c.submitter_address} /> },
            { header: 'Block', align: 'right', cell: (c) => formatUint(c.block_number) },
            { header: 'Tx', cell: (c) => <TxHash value={c.tx_hash} /> },
          ]}
          rows={commitments.data?.data}
          rowKey={(c) => c.commitment}
          isLoading={commitments.isLoading}
          error={commitments.error}
          empty="No commitments submitted to this tournament."
        />
      </Section>

      <Section title={`Matches (${matches.data?.pagination.total_count ?? '…'})`}>
        <DataTable
          columns={[
            { header: 'Match ID', cell: (m) => <Hex value={m.id_hash} /> },
            { header: 'Commitment 1', cell: (m) => <Hex value={m.commitment_one} /> },
            { header: 'Commitment 2', cell: (m) => <Hex value={m.commitment_two} /> },
            { header: 'Winner', cell: (m) => <StatusBadge status={m.winner_commitment} /> },
            { header: 'Resolution', cell: (m) => <StatusBadge status={m.deletion_reason} /> },
            { header: 'Block', align: 'right', cell: (m) => formatUint(m.block_number) },
          ]}
          rows={matches.data?.data}
          rowKey={(m) => m.id_hash}
          rowLink={(m) =>
            `${base}/tournaments/${t.address}/matches/${uintToDecimal(m.epoch_index)}/${m.id_hash}`
          }
          isLoading={matches.isLoading}
          error={matches.error}
          empty="No matches in this tournament."
        />
      </Section>

      <Section title={`Child tournaments (${children.data?.pagination.total_count ?? '…'})`}>
        <DataTable
          columns={[
            { header: 'Address', cell: (c) => <Hex value={c.address} /> },
            {
              header: 'Level',
              align: 'right',
              cell: (c) => `${formatUint(c.level)} / ${formatUint(c.max_level)}`,
            },
            { header: 'log2 step', align: 'right', cell: (c) => formatUint(c.log2step) },
            { header: 'Parent match', cell: (c) => <Hex value={c.parent_match_id_hash} /> },
            {
              header: 'Winner',
              cell: (c) =>
                c.winner_commitment ? <Hex value={c.winner_commitment} /> : <span className="text-slate-400 dark:text-slate-500">—</span>,
            },
          ]}
          rows={children.data?.data}
          rowKey={(c) => c.address}
          rowLink={(c) => `${base}/tournaments/${c.address}`}
          isLoading={children.isLoading}
          error={children.error}
          empty="No child tournaments spawned from this tournament."
        />
      </Section>

      <Collapsible label="Raw JSON">
        <JsonView value={t} />
      </Collapsible>
    </div>
  )
}
