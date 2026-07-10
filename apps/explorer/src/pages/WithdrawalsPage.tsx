import { useWithdrawals } from '../api/hooks'
import { DataTable, Filter, filterInputClass, Pager, SortToggle, useListControls } from '../components/table'
import { PayloadPreview } from '../components/PayloadView'
import { TxHash } from '../components/TxHash'
import { Section } from '../components/ui'
import { decimalToHex, formatDate, formatUint, hexByteLength, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function WithdrawalsPage() {
  const { searchParams, limit, offset, descending, update } = useListControls()
  const account = searchParams.get('account') ?? ''
  const { appParam, application } = useApp()

  const withdrawals = useWithdrawals(
    appParam,
    { account_index: account ? decimalToHex(account) : undefined },
    { limit, offset, descending },
  )

  return (
    <Section
      title="Withdrawals"
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <Filter label="Account">
            <input
              type="number"
              min={0}
              value={account}
              onChange={(e) => update({ account: e.target.value })}
              placeholder="any"
              className={`${filterInputClass} w-24`}
            />
          </Filter>
          <SortToggle descending={descending} onChange={(desc) => update({ desc })} />
        </div>
      }
    >
      <DataTable
        columns={[
          { header: 'Account index', align: 'right', cell: (w) => formatUint(w.account_index) },
          {
            header: 'Account',
            truncate: true,
            cell: (w) => (
              <PayloadPreview
                value={w.account}
                decode={{
                  application: application.iapplication_address,
                  kind: 'withdrawalAccount',
                  record: w,
                }}
              />
            ),
          },
          {
            header: 'Output size',
            align: 'right',
            cell: (w) => `${hexByteLength(w.output).toLocaleString()} B`,
          },
          { header: 'Block', align: 'right', cell: (w) => formatUint(w.block_number) },
          { header: 'Transaction', cell: (w) => <TxHash value={w.transaction_hash} /> },
          { header: 'Created', cell: (w) => formatDate(w.created_at) },
        ]}
        rows={withdrawals.data?.data}
        rowKey={(w) => w.account_index}
        rowLink={(w) => `/apps/${appParam}/withdrawals/${uintToDecimal(w.account_index)}`}
        isLoading={withdrawals.isLoading}
        error={withdrawals.error}
        empty="No withdrawals — they appear only after the application is foreclosed and its accounts drive is proved."
      />
      <Pager
        pagination={withdrawals.data?.pagination}
        limit={limit}
        offset={offset}
        onChange={(next) => update(next)}
      />
    </Section>
  )
}
