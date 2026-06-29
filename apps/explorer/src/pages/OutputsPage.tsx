import { Link } from 'react-router-dom'
import { useOutputs } from '../api/hooks'
import { OUTPUT_TYPES } from '../api/types'
import { DataTable, Filter, filterInputClass, Pager, SortToggle, useListControls } from '../components/table'
import { PayloadPreview } from '../components/PayloadView'
import { Hex, Section } from '../components/ui'
import { decimalToHex, formatUint, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function outputTypeLabel(selector?: string | null): string {
  if (!selector) return 'Unknown'
  return OUTPUT_TYPES[selector.toLowerCase()] ?? selector
}

export function OutputsPage() {
  const { searchParams, limit, offset, descending, update } = useListControls()
  const epoch = searchParams.get('epoch') ?? ''
  const input = searchParams.get('input') ?? ''
  const type = searchParams.get('type') ?? ''
  const voucher = searchParams.get('voucher') ?? ''
  const { appParam, application } = useApp()

  const outputs = useOutputs(
    appParam,
    {
      epoch_index: epoch ? decimalToHex(epoch) : undefined,
      input_index: input ? decimalToHex(input) : undefined,
      output_type: type || undefined,
      voucher_address: voucher || undefined,
    },
    { limit, offset, descending },
  )

  return (
    <Section
      title="Outputs"
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
          <Filter label="Input">
            <input
              type="number"
              min={0}
              value={input}
              onChange={(e) => update({ input: e.target.value })}
              placeholder="any"
              className={`${filterInputClass} w-20`}
            />
          </Filter>
          <Filter label="Type">
            <select
              value={type}
              onChange={(e) => update({ type: e.target.value })}
              className={filterInputClass}
            >
              <option value="">All</option>
              {Object.entries(OUTPUT_TYPES).map(([selector, label]) => (
                <option key={selector} value={selector}>
                  {label}
                </option>
              ))}
            </select>
          </Filter>
          <Filter label="Voucher dest.">
            <input
              type="text"
              value={voucher}
              onChange={(e) => update({ voucher: e.target.value })}
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
          { header: 'Index', align: 'right', cell: (o) => formatUint(o.index) },
          {
            header: 'Epoch',
            align: 'right',
            cell: (o) => (
              <Link
                to={`/apps/${appParam}/epochs/${uintToDecimal(o.epoch_index)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sky-700 hover:underline dark:text-sky-400"
              >
                {formatUint(o.epoch_index)}
              </Link>
            ),
          },
          {
            header: 'Input',
            align: 'right',
            cell: (o) => (
              <Link
                to={`/apps/${appParam}/inputs/${uintToDecimal(o.input_index)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sky-700 hover:underline dark:text-sky-400"
              >
                {formatUint(o.input_index)}
              </Link>
            ),
          },
          {
            header: 'Type',
            cell: (o) => (
              <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                {outputTypeLabel(o.decoded_data?.type)}
              </span>
            ),
          },
          { header: 'Destination', cell: (o) => <Hex value={o.decoded_data?.destination} /> },
          {
            header: 'Payload',
            truncate: true,
            cell: (o) => (
              <PayloadPreview
                value={o.decoded_data?.payload}
                decode={{ application: application.iapplication_address, kind: 'output', record: o }}
              />
            ),
          },
          {
            header: 'Executed',
            cell: (o) =>
              o.execution_transaction_hash ? (
                <span className="text-emerald-600 dark:text-emerald-400">✓</span>
              ) : (
                <span className="text-slate-300 dark:text-slate-600">—</span>
              ),
          },
        ]}
        rows={outputs.data?.data}
        rowKey={(o) => o.index}
        rowLink={(o) => `/apps/${appParam}/outputs/${uintToDecimal(o.index)}`}
        isLoading={outputs.isLoading}
        error={outputs.error}
        empty="No outputs."
      />
      <Pager
        pagination={outputs.data?.pagination}
        limit={limit}
        offset={offset}
        onChange={(next) => update(next)}
      />
    </Section>
  )
}
