import { Link, useParams } from 'react-router-dom'
import { useReport } from '../api/hooks'
import { PayloadView } from '../components/PayloadView'
import { Collapsible, Crumbs, ErrorBox, JsonView, KV, Section, Spinner } from '../components/ui'
import { decimalToHex, formatDate, formatUint, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function ReportPage() {
  const { appParam, application } = useApp()
  const { reportIndex = '0' } = useParams()
  const report = useReport(appParam, decimalToHex(reportIndex))

  if (report.isLoading) return <Spinner />
  if (report.error) return <ErrorBox error={report.error} />
  const r = report.data!.data
  const base = `/apps/${appParam}`

  return (
    <div className="space-y-4">
      <Crumbs
        items={[
          { label: 'Reports', to: `${base}/reports` },
          { label: `Report ${formatUint(r.index)}` },
        ]}
      />

      <Section title={`Report ${formatUint(r.index)}`}>
        <KV
          rows={[
            ['Index', formatUint(r.index)],
            [
              'Epoch',
              <Link
                className="text-sky-700 hover:underline dark:text-sky-400"
                to={`${base}/epochs/${uintToDecimal(r.epoch_index)}`}
              >
                {formatUint(r.epoch_index)}
              </Link>,
            ],
            [
              'Input',
              <Link
                className="text-sky-700 hover:underline dark:text-sky-400"
                to={`${base}/inputs/${uintToDecimal(r.input_index)}`}
              >
                {formatUint(r.input_index)}
              </Link>,
            ],
            ['Created', formatDate(r.created_at)],
            ['Updated', formatDate(r.updated_at)],
          ]}
        />
      </Section>

      <Section title="Payload">
        <PayloadView
          value={r.raw_data}
          decode={{ application: application.iapplication_address, kind: 'report', record: r }}
        />
      </Section>

      <Collapsible label="Raw JSON">
        <JsonView value={r} />
      </Collapsible>
    </div>
  )
}
