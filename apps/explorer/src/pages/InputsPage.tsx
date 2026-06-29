import { Link } from 'react-router-dom'
import { useInputs } from '../api/hooks'
import { DataTable, Filter, filterInputClass, Pager, SortToggle, useListControls } from '../components/table'
import { PayloadPreview } from '../components/PayloadView'
import { Hex, Section, StatusBadge } from '../components/ui'
import { decimalToHex, formatUint, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function InputsPage() {
  const { searchParams, limit, offset, descending, update } = useListControls()
  const epoch = searchParams.get('epoch') ?? ''
  const sender = searchParams.get('sender') ?? ''
  const { appParam, application } = useApp()

  const inputs = useInputs(
    appParam,
    {
      epoch_index: epoch ? decimalToHex(epoch) : undefined,
      sender: sender || undefined,
    },
    { limit, offset, descending },
  )

  return (
    <Section
      title="Inputs"
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
          <Filter label="Sender">
            <input
              type="text"
              value={sender}
              onChange={(e) => update({ sender: e.target.value })}
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
          { header: 'Index', align: 'right', cell: (i) => formatUint(i.index) },
          {
            header: 'Epoch',
            align: 'right',
            cell: (i) => (
              <Link
                to={`/apps/${appParam}/epochs/${uintToDecimal(i.epoch_index)}`}
                onClick={(e) => e.stopPropagation()}
                className="text-sky-700 hover:underline dark:text-sky-400"
              >
                {formatUint(i.epoch_index)}
              </Link>
            ),
          },
          { header: 'Status', cell: (i) => <StatusBadge status={i.status} /> },
          { header: 'Sender', cell: (i) => <Hex value={i.decoded_data?.sender} head={6} tail={4} /> },
          { header: 'Block', align: 'right', cell: (i) => formatUint(i.block_number) },
          {
            header: 'Payload',
            truncate: true,
            cell: (i) => (
              <PayloadPreview
                value={i.decoded_data?.payload}
                decode={{ application: application.iapplication_address, kind: 'input', record: i }}
              />
            ),
          },
        ]}
        rows={inputs.data?.data}
        rowKey={(i) => i.index}
        rowLink={(i) => `/apps/${appParam}/inputs/${uintToDecimal(i.index)}`}
        isLoading={inputs.isLoading}
        error={inputs.error}
        empty="No inputs."
      />
      <Pager
        pagination={inputs.data?.pagination}
        limit={limit}
        offset={offset}
        onChange={(next) => update(next)}
      />
    </Section>
  )
}
