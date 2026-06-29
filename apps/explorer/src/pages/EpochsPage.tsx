import { useEpochs } from '../api/hooks'
import { EPOCH_STATUSES } from '../api/types'
import { DataTable, Filter, filterInputClass, Pager, SortToggle, useListControls } from '../components/table'
import { Section, StatusBadge } from '../components/ui'
import { formatDate, formatUint, hexToBigInt, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function EpochsPage() {
  const { searchParams, limit, offset, descending, update } = useListControls()
  const status = searchParams.get('status') ?? ''
  const { appParam } = useApp()

  const epochs = useEpochs(appParam, status ? { status } : {}, { limit, offset, descending })

  return (
    <Section
      title="Epochs"
      actions={
        <div className="flex items-center gap-3">
          <Filter label="Status">
            <select
              value={status}
              onChange={(e) => update({ status: e.target.value })}
              className={filterInputClass}
            >
              <option value="">All</option>
              {EPOCH_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </Filter>
          <SortToggle descending={descending} onChange={(desc) => update({ desc })} />
        </div>
      }
    >
      <DataTable
        columns={[
          { header: 'Index', align: 'right', cell: (e) => formatUint(e.index) },
          { header: 'Status', cell: (e) => <StatusBadge status={e.status} /> },
          {
            header: 'Blocks',
            cell: (e) => (
              <span className="text-slate-600 dark:text-slate-300">
                {formatUint(e.first_block)} – {formatUint(e.last_block)}
              </span>
            ),
          },
          {
            header: 'Inputs',
            cell: (e) => {
              const lo = hexToBigInt(e.input_index_lower_bound)
              const hi = hexToBigInt(e.input_index_upper_bound)
              if (lo === null || hi === null || hi <= lo)
                return <span className="text-slate-400 dark:text-slate-500">none</span>
              return `${lo.toLocaleString()} – ${(hi - 1n).toLocaleString()}`
            },
          },
          { header: 'Virtual index', align: 'right', cell: (e) => formatUint(e.virtual_index) },
          { header: 'Updated', cell: (e) => formatDate(e.updated_at) },
        ]}
        rows={epochs.data?.data}
        rowKey={(e) => e.index}
        rowLink={(e) => `/apps/${appParam}/epochs/${uintToDecimal(e.index)}`}
        isLoading={epochs.isLoading}
        error={epochs.error}
        empty="No epochs."
      />
      <Pager
        pagination={epochs.data?.pagination}
        limit={limit}
        offset={offset}
        onChange={(next) => update(next)}
      />
    </Section>
  )
}
