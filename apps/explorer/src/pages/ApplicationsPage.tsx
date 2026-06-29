import { useApplications } from '../api/hooks'
import { DataTable, Pager, SortToggle, useListControls } from '../components/table'
import { Hex, Section, StatusBadge } from '../components/ui'
import { formatDate, formatUint } from '../lib/format'

export function ApplicationsPage() {
  const { limit, offset, descending, update } = useListControls()
  const apps = useApplications({ limit, offset, descending })

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-slate-800 dark:text-slate-100">Applications</h1>
        <SortToggle descending={descending} onChange={(desc) => update({ desc })} />
      </div>
      <Section title={`Registered applications`}>
        <DataTable
          columns={[
            {
              header: 'Name',
              cell: (app) => <span className="font-medium text-sky-700 dark:text-sky-400">{app.name}</span>,
            },
            { header: 'Address', cell: (app) => <Hex value={app.iapplication_address} /> },
            { header: 'Consensus', cell: (app) => <StatusBadge status={app.consensus_type} /> },
            { header: 'State', cell: (app) => <StatusBadge status={app.state} /> },
            {
              header: 'Inputs',
              align: 'right',
              cell: (app) => formatUint(app.processed_inputs),
            },
            {
              header: 'Epoch length',
              align: 'right',
              cell: (app) => formatUint(app.epoch_length),
            },
            { header: 'Created', cell: (app) => formatDate(app.created_at) },
          ]}
          rows={apps.data?.data}
          rowKey={(app) => app.iapplication_address}
          rowLink={(app) => `/apps/${app.name}`}
          isLoading={apps.isLoading}
          error={apps.error}
          empty="No applications registered on this node."
        />
        <Pager
          pagination={apps.data?.pagination}
          limit={limit}
          offset={offset}
          onChange={(next) => update(next)}
        />
      </Section>
    </div>
  )
}
