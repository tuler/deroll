import { useLastAcceptedEpochIndex, useProcessedInputCount } from '../api/hooks'
import { DecoderSettings } from '../components/DecoderSettings'
import { Collapsible, Hex, JsonView, KV, Section, StatusBadge } from '../components/ui'
import { formatDate, formatNanos, formatUint } from '../lib/format'
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
        <StatCard label="State" value={<StatusBadge status={app.state} />} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Section title="Contracts">
          <KV
            rows={[
              ['Application', <Hex value={app.iapplication_address} full />],
              ['Consensus', <Hex value={app.iconsensus_address} full />],
              ['Input box', <Hex value={app.iinputbox_address} full />],
              ['Template hash', <Hex value={app.template_hash} />],
              ['Data availability', <Hex value={app.data_availability} />],
              ['Input box deployed at block', formatUint(app.iinputbox_block)],
            ]}
          />
        </Section>

        <Section title="Status">
          <KV
            rows={[
              ['State', <StatusBadge status={app.state} />],
              ['Consensus type', <StatusBadge status={app.consensus_type} />],
              app.reason ? (['Reason', app.reason] as [React.ReactNode, React.ReactNode]) : null,
              ['Created', formatDate(app.created_at)],
              ['Updated', formatDate(app.updated_at)],
            ]}
          />
        </Section>

        <Section title="Sync checkpoints (last scanned block)">
          <KV
            rows={[
              ['Epochs', formatUint(app.last_epoch_check_block)],
              ['Inputs', formatUint(app.last_input_check_block)],
              ['Outputs', formatUint(app.last_output_check_block)],
              ['Tournaments', formatUint(app.last_tournament_check_block)],
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
