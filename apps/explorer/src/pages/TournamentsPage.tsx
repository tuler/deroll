import { Link } from 'react-router-dom'
import { useTournaments } from '../api/hooks'
import { DataTable, Filter, filterInputClass, Pager, SortToggle, useListControls } from '../components/table'
import { Hex, Section } from '../components/ui'
import { decimalToHex, formatUint, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function TournamentsPage() {
  const { searchParams, limit, offset, descending, update } = useListControls()
  const epoch = searchParams.get('epoch') ?? ''
  const level = searchParams.get('level') ?? ''
  const parent = searchParams.get('parent') ?? ''
  const { appParam } = useApp()

  const tournaments = useTournaments(
    appParam,
    {
      epoch_index: epoch ? decimalToHex(epoch) : undefined,
      level: level ? decimalToHex(level) : undefined,
      parent_tournament_address: parent || undefined,
    },
    { limit, offset, descending },
  )

  return (
    <Section
      title="Tournaments (PRT dispute resolution)"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Filter label="Epoch">
            <input
              type="number"
              min={0}
              value={epoch}
              onChange={(e) => update({ epoch: e.target.value })}
              placeholder="any"
              className={`${filterInputClass} w-20`}
            />
          </Filter>
          <Filter label="Level">
            <input
              type="number"
              min={0}
              value={level}
              onChange={(e) => update({ level: e.target.value })}
              placeholder="any"
              className={`${filterInputClass} w-20`}
            />
          </Filter>
          <Filter label="Parent">
            <input
              type="text"
              value={parent}
              onChange={(e) => update({ parent: e.target.value })}
              placeholder="0x…"
              className={`${filterInputClass} w-40`}
            />
          </Filter>
          <SortToggle descending={descending} onChange={(desc) => update({ desc })} />
        </div>
      }
    >
      <DataTable
        columns={[
          { header: 'Address', cell: (t) => <Hex value={t.address} /> },
          {
            header: 'Epoch',
            align: 'right',
            cell: (t) => (
              <Link
                to={`/apps/${appParam}/epochs/${uintToDecimal(t.epoch_index)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sky-700 hover:underline dark:text-sky-400"
              >
                {formatUint(t.epoch_index)}
              </Link>
            ),
          },
          {
            header: 'Level',
            align: 'right',
            cell: (t) => `${formatUint(t.level)} / ${formatUint(t.max_level)}`,
          },
          { header: 'log2 step', align: 'right', cell: (t) => formatUint(t.log2step) },
          { header: 'Height', align: 'right', cell: (t) => formatUint(t.height) },
          {
            header: 'Parent',
            cell: (t) =>
              t.parent_tournament_address ? (
                <Hex
                  value={t.parent_tournament_address}
                  to={`/apps/${appParam}/tournaments/${t.parent_tournament_address}`}
                />
              ) : (
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">root</span>
              ),
          },
          {
            header: 'Winner',
            cell: (t) =>
              t.winner_commitment ? (
                <Hex value={t.winner_commitment} />
              ) : (
                <span className="text-slate-400 dark:text-slate-500">—</span>
              ),
          },
        ]}
        rows={tournaments.data?.data}
        rowKey={(t) => t.address}
        rowLink={(t) => `/apps/${appParam}/tournaments/${t.address}`}
        isLoading={tournaments.isLoading}
        error={tournaments.error}
        empty="No tournaments. Tournaments only exist for applications using PRT consensus."
      />
      <Pager
        pagination={tournaments.data?.pagination}
        limit={limit}
        offset={offset}
        onChange={(next) => update(next)}
      />
    </Section>
  )
}
