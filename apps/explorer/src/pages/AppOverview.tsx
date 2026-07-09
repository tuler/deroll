import { useLastAcceptedEpochIndex, useProcessedInputCount } from '../api/hooks'
import { DecoderSettings } from '../components/DecoderSettings'
import { TxHash } from '../components/TxHash'
import { Collapsible, Hex, JsonView, KV, Section, StatusBadge } from '../components/ui'
import { formatDate, formatNanos, formatUint, isZeroHex } from '../lib/format'
import { useApp } from './AppLayout'

function StatCard({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <div className="text-xs uppercase tracking-wide text-slate-500 dark:text-slate-400">{label}</div>
      <div className="mt-1 text-xl font-semibold text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  )
}

export function AppOverview() {
  const { appParam, application: app } = useApp()
  const processedCount = useProcessedInputCount(appParam)
  const lastAccepted = useLastAcceptedEpochIndex(appParam)
  const ep = app.execution_parameters

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Processed inputs" value={formatUint(processedCount.data?.data)} />
        <StatCard
          label="Last accepted epoch"
          value={lastAccepted.isSuccess ? formatUint(lastAccepted.data.data) : '—'}
        />
        <StatCard label="Epoch length" value={formatUint(app.epoch_length)} />
        <StatCard
          label="Status"
          value={
            <span className="inline-flex items-center gap-1.5">
              <StatusBadge status={app.status} />
              {!app.enabled && <StatusBadge status="DISABLED" />}
            </span>
          }
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Contracts">
          <KV
            rows={[
              ['Application', <Hex value={app.iapplication_address} />],
              ['Consensus', <Hex value={app.iconsensus_address} />],
              ['Input box', <Hex value={app.iinputbox_address} />],
              ['Template hash', <Hex value={app.template_hash} />],
              ['Data availability', <Hex value={app.data_availability} />],
              ['Input box deployed at block', formatUint(app.iinputbox_block)],
            ]}
          />
        </Section>

        <Section title="Status">
          <KV
            rows={[
              ['Status', <StatusBadge status={app.status} />],
              ['Enabled', <StatusBadge status={app.enabled ? 'ENABLED' : 'DISABLED'} />],
              ['Consensus type', <StatusBadge status={app.consensus_type} />],
              app.reason ? (['Reason', app.reason] as [React.ReactNode, React.ReactNode]) : null,
              ['Claim staging period', `${formatUint(app.claim_staging_period)} blocks`],
              ['Created', formatDate(app.created_at)],
              ['Updated', formatDate(app.updated_at)],
            ]}
          />
        </Section>

        <Section title="Withdrawal config">
          {app.withdrawal_config ? (
            <KV
              rows={[
                ['Guardian', <Hex value={app.withdrawal_config.guardian} />],
                [
                  'Output builder',
                  <Hex value={app.withdrawal_config.withdrawal_output_builder} />,
                ],
                [
                  'Accounts drive start index',
                  <Hex value={app.withdrawal_config.accounts_drive_start_index} />,
                ],
                [
                  'Max accounts (log2)',
                  formatUint(app.withdrawal_config.log2_max_num_of_accounts),
                ],
                [
                  'Leaves per account (log2)',
                  formatUint(app.withdrawal_config.log2_leaves_per_account),
                ],
              ]}
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Not available.</p>
          )}
        </Section>

        <Section title="Foreclosure">
          {isZeroHex(app.foreclose_block) ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">Not foreclosed.</p>
          ) : (
            <KV
              rows={[
                ['Foreclosed at block', formatUint(app.foreclose_block)],
                ['Foreclose transaction', <TxHash value={app.foreclose_transaction} />],
                [
                  'Accounts drive proved at block',
                  isZeroHex(app.accounts_drive_proved_block)
                    ? '—'
                    : formatUint(app.accounts_drive_proved_block),
                ],
                [
                  'Accounts drive proved transaction',
                  <TxHash value={app.accounts_drive_proved_transaction} />,
                ],
                ['Accounts drive merkle root', <Hex value={app.accounts_drive_merkle_root} />],
              ]}
            />
          )}
        </Section>

        <Section title="Sync checkpoints (last scanned block)">
          <KV
            rows={[
              ['Epochs', formatUint(app.last_epoch_check_block)],
              ['Inputs', formatUint(app.last_input_check_block)],
              ['Outputs', formatUint(app.last_output_check_block)],
              ['Tournaments', formatUint(app.last_tournament_check_block)],
              ['Foreclosures', formatUint(app.last_foreclose_check_block)],
              ['Accounts drive proofs', formatUint(app.last_accounts_drive_proved_check_block)],
              ['Withdrawals', formatUint(app.last_withdrawal_check_block)],
            ]}
          />
        </Section>

        <Section title="Execution parameters">
          {ep ? (
            <KV
              rows={[
                ['Snapshot policy', <StatusBadge status={ep.snapshot_policy} />],
                ['Advance cycles (inc / max)', `${formatUint(ep.advance_inc_cycles)} / ${formatUint(ep.advance_max_cycles)}`],
                ['Inspect cycles (inc / max)', `${formatUint(ep.inspect_inc_cycles)} / ${formatUint(ep.inspect_max_cycles)}`],
                ['Advance deadline (inc / max)', `${formatNanos(ep.advance_inc_deadline)} / ${formatNanos(ep.advance_max_deadline)}`],
                ['Inspect deadline (inc / max)', `${formatNanos(ep.inspect_inc_deadline)} / ${formatNanos(ep.inspect_max_deadline)}`],
                ['Load / store deadline', `${formatNanos(ep.load_deadline)} / ${formatNanos(ep.store_deadline)}`],
                ['Fast deadline', formatNanos(ep.fast_deadline)],
                ['Max concurrent inspects', ep.max_concurrent_inspects],
              ]}
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Not available.</p>
          )}
        </Section>
      </div>

      <DecoderSettings key={app.iapplication_address} application={app.iapplication_address} />

      <Collapsible label="Raw JSON">
        <JsonView value={app} />
      </Collapsible>
    </div>
  )
}
