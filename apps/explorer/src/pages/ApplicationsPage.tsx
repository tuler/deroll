import { keepPreviousData } from '@tanstack/react-query'
import { useApplications } from '@cartesi/wagmi'
import { DataTable, Pager, SortToggle, useListControls } from '../components/table'
import { Hex, Section, StatusBadge } from '../components/ui'
import { formatDate, formatUint } from '../lib/format'

export function ApplicationsPage() {
  const { limit, offset, descending, update } = useListControls()
  const apps = useApplications({ limit, offset, descending, placeholderData: keepPreviousData })

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
            { header: 'Address', cell: (app) => <Hex value={app.applicationAddress} /> },
            { header: 'Consensus', cell: (app) => <StatusBadge status={app.consensusType} /> },
            {
              header: 'Status',
              cell: (app) => (
                <span className="inline-flex items-center gap-1.5">
                  <StatusBadge status={app.status} />
                  {!app.enabled && <StatusBadge status="DISABLED" />}
                </span>
              ),
            },
            {
              header: 'Inputs',
              align: 'right',
              cell: (app) => formatUint(app.processedInputs),
            },
            {
              header: 'Epoch length',
              align: 'right',
              cell: (app) => formatUint(app.epochLength),
            },
            { header: 'Created', cell: (app) => formatDate(app.createdAt) },
          ]}
          rows={apps.data?.data}
          rowKey={(app) => app.applicationAddress}
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
