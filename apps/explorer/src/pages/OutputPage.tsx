import { Link, useParams } from 'react-router-dom'
import { useOutput } from '../api/hooks'
import { PayloadView } from '../components/PayloadView'
import { Collapsible, Crumbs, ErrorBox, Hex, JsonView, KV, Section, Spinner } from '../components/ui'
import { TxHash } from '../components/TxHash'
import { decimalToHex, formatDate, formatUint, formatWei, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'
import { outputTypeLabel } from './OutputsPage'

export function OutputPage() {
  const { appParam, application } = useApp()
  const { outputIndex = '0' } = useParams()
  const output = useOutput(appParam, decimalToHex(outputIndex))

  if (output.isLoading) return <Spinner />
  if (output.error) return <ErrorBox error={output.error} />
  const o = output.data!.data
  const base = `/apps/${appParam}`
  const decoded = o.decoded_data
  const typeLabel = outputTypeLabel(decoded?.type)

  return (
    <div className="space-y-4">
      <Crumbs
        items={[
          { label: 'Outputs', to: `${base}/outputs` },
          { label: `Output ${formatUint(o.index)}` },
        ]}
      />

      <Section
        title={
          <span className="flex items-center gap-3">
            Output {formatUint(o.index)}
            <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-300">
              {typeLabel}
            </span>
          </span>
        }
      >
        <KV
          rows={[
            ['Index', formatUint(o.index)],
            [
              'Epoch',
              <Link
                className="text-sky-700 hover:underline dark:text-sky-400"
                to={`${base}/epochs/${uintToDecimal(o.epoch_index)}`}
              >
                {formatUint(o.epoch_index)}
              </Link>,
            ],
            [
              'Input',
              <Link
                className="text-sky-700 hover:underline dark:text-sky-400"
                to={`${base}/inputs/${uintToDecimal(o.input_index)}`}
              >
                {formatUint(o.input_index)}
              </Link>,
            ],
            ['Hash', <Hex value={o.hash} full />],
            ['Execution transaction', <TxHash value={o.execution_transaction_hash} full />],
            ['Created', formatDate(o.created_at)],
            ['Updated', formatDate(o.updated_at)],
          ]}
        />
      </Section>

      {decoded && (
        <Section title={`Decoded ${typeLabel}`}>
          <KV
            rows={[
              ['Type selector', <Hex value={decoded.type} full />],
              decoded.destination !== undefined
                ? ['Destination', <Hex value={decoded.destination} full />]
                : null,
              decoded.value !== undefined ? ['Value', formatWei(decoded.value)] : null,
              [
                'Payload',
                <PayloadView
                  value={decoded.payload}
                  decode={{ application: application.iapplication_address, kind: 'output', record: o }}
                />,
              ],
            ]}
          />
        </Section>
      )}

      <div className="space-y-2">
        <Collapsible
          label={`Output hashes siblings (${o.output_hashes_siblings?.length ?? 0} hashes)`}
        >
          {o.output_hashes_siblings && o.output_hashes_siblings.length > 0 ? (
            <ol className="space-y-1 font-mono text-xs">
              {o.output_hashes_siblings.map((h, i) => (
                <li key={i} className="flex gap-2">
                  <span className="w-6 text-right text-slate-400 dark:text-slate-500">{i}</span>
                  <Hex value={h} full />
                </li>
              ))}
            </ol>
          ) : (
            <span className="text-sm text-slate-400 dark:text-slate-500">—</span>
          )}
        </Collapsible>
        <Collapsible label="Raw output data">
          <PayloadView value={o.raw_data} />
        </Collapsible>
        <Collapsible label="Raw JSON">
          <JsonView value={o} />
        </Collapsible>
      </div>
    </div>
  )
}
