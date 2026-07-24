import { Link, useParams } from 'react-router-dom'
import { useOutput } from '@cartesi/wagmi'
import { PayloadView } from '../components/PayloadView'
import { Collapsible, Crumbs, ErrorBox, Hex, JsonView, KV, Section, Spinner } from '../components/ui'
import { TxHash } from '../components/TxHash'
import { parseUintParam, formatDate, formatUint, formatWei, uintToDecimal } from '../lib/format'
import { outputDestination, outputTypeLabel, outputValue } from '../api/types'
import { useApp } from './AppLayout'

export function OutputPage() {
  const { appParam, application } = useApp()
  const { outputIndex = '0' } = useParams()
  const output = useOutput({ application: appParam, outputIndex: parseUintParam(outputIndex) })

  if (output.isLoading) return <Spinner />
  if (output.error) return <ErrorBox error={output.error} />
  const o = output.data!
  const base = `/apps/${appParam}`
  const decoded = o.decodedData
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
                to={`${base}/epochs/${uintToDecimal(o.epochIndex)}`}
              >
                {formatUint(o.epochIndex)}
              </Link>,
            ],
            [
              'Input',
              <Link
                className="text-sky-700 hover:underline dark:text-sky-400"
                to={`${base}/inputs/${uintToDecimal(o.inputIndex)}`}
              >
                {formatUint(o.inputIndex)}
              </Link>,
            ],
            ['Hash', <Hex value={o.hash} full />],
            ['Execution transaction', <TxHash value={o.executionTransactionHash} full />],
            ['Created', formatDate(o.createdAt)],
            ['Updated', formatDate(o.updatedAt)],
          ]}
        />
      </Section>

      {decoded && (
        <Section title={`Decoded ${typeLabel}`}>
          <KV
            rows={[
              ['Type', typeLabel],
              outputDestination(decoded) !== undefined
                ? ['Destination', <Hex value={outputDestination(decoded)} full />]
                : null,
              outputValue(decoded) !== undefined
                ? ['Value', formatWei(outputValue(decoded))]
                : null,
              [
                'Payload',
                <PayloadView
                  value={decoded.payload}
                  decode={{ application: application.applicationAddress, kind: 'output', record: o }}
                />,
              ],
            ]}
          />
        </Section>
      )}

      <div className="space-y-2">
        <Collapsible
          label={`Output hashes siblings (${o.outputHashesSiblings?.length ?? 0} hashes)`}
        >
          {o.outputHashesSiblings && o.outputHashesSiblings.length > 0 ? (
            <ol className="space-y-1 font-mono text-xs">
              {o.outputHashesSiblings.map((h, i) => (
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
          <PayloadView value={o.rawData} />
        </Collapsible>
        <Collapsible label="Raw JSON">
          <JsonView value={o} />
        </Collapsible>
      </div>
    </div>
  )
}
