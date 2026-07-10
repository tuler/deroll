import { useParams } from 'react-router-dom'
import { useWithdrawal } from '../api/hooks'
import { PayloadView } from '../components/PayloadView'
import { TxHash } from '../components/TxHash'
import { Collapsible, Crumbs, ErrorBox, JsonView, KV, Section, Spinner } from '../components/ui'
import { decimalToHex, formatDate, formatUint } from '../lib/format'
import { useApp } from './AppLayout'

export function WithdrawalPage() {
  const { appParam, application } = useApp()
  const { accountIndex = '0' } = useParams()
  const withdrawal = useWithdrawal(appParam, decimalToHex(accountIndex))

  if (withdrawal.isLoading) return <Spinner />
  if (withdrawal.error) return <ErrorBox error={withdrawal.error} />
  const w = withdrawal.data!.data
  const base = `/apps/${appParam}`

  return (
    <div className="space-y-4">
      <Crumbs
        items={[
          { label: 'Withdrawals', to: `${base}/withdrawals` },
          { label: `Account ${formatUint(w.account_index)}` },
        ]}
      />

      <Section title={`Withdrawal — account ${formatUint(w.account_index)}`}>
        <KV
          rows={[
            ['Account index', formatUint(w.account_index)],
            ['Block', formatUint(w.block_number)],
            ['Transaction', <TxHash value={w.transaction_hash} full />],
            ['Log index', formatUint(w.log_index)],
            ['Created', formatDate(w.created_at)],
            ['Updated', formatDate(w.updated_at)],
          ]}
        />
      </Section>

      <Section title="Account">
        <PayloadView
          value={w.account}
          decode={{
            application: application.iapplication_address,
            kind: 'withdrawalAccount',
            record: w,
          }}
        />
      </Section>

      <Section title="Output">
        <PayloadView
          value={w.output}
          decode={{
            application: application.iapplication_address,
            kind: 'withdrawalOutput',
            record: w,
          }}
        />
      </Section>

      <Collapsible label="Raw JSON">
        <JsonView value={w} />
      </Collapsible>
    </div>
  )
}
