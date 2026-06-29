import { Link, useParams } from 'react-router-dom'
import { useInput } from '../api/hooks'
import { PayloadView } from '../components/PayloadView'
import { Collapsible, Crumbs, ErrorBox, Hex, JsonView, KV, Section, Spinner, StatusBadge } from '../components/ui'
import { TxHash } from '../components/TxHash'
import { decimalToHex, formatDate, formatUint, hexToBigInt, uintToDecimal } from '../lib/format'
import { useApp } from './AppLayout'

export function InputPage() {
  const { appParam, application } = useApp()
  const { inputIndex = '0' } = useParams()
  const input = useInput(appParam, decimalToHex(inputIndex))

  if (input.isLoading) return <Spinner />
  if (input.error) return <ErrorBox error={input.error} />
  const i = input.data!.data
  const base = `/apps/${appParam}`
  const decoded = i.decoded_data
  const timestamp = hexToBigInt(decoded?.block_timestamp)

  return (
    <div className="space-y-4">
      <Crumbs
        items={[
          { label: 'Inputs', to: `${base}/inputs` },
          { label: `Input ${formatUint(i.index)}` },
        ]}
      />

      <Section
        title={
          <span className="flex items-center gap-3">
            Input {formatUint(i.index)} <StatusBadge status={i.status} />
          </span>
        }
      >
        <KV
          rows={[
            ['Index', formatUint(i.index)],
            [
              'Epoch',
              <Link
                className="text-sky-700 hover:underline dark:text-sky-400"
                to={`${base}/epochs/${uintToDecimal(i.epoch_index)}`}
              >
                {formatUint(i.epoch_index)}
              </Link>,
            ],
            ['Status', <StatusBadge status={i.status} />],
            ['Block number', formatUint(i.block_number)],
            ['Machine hash', <Hex value={i.machine_hash} full />],
            ['Outputs hash', <Hex value={i.outputs_hash} full />],
            ['Transaction reference', <TxHash value={i.transaction_reference} full />],
            ['Created', formatDate(i.created_at)],
            ['Updated', formatDate(i.updated_at)],
          ]}
        />
      </Section>

      {decoded && (
        <Section title="Decoded EvmAdvance">
          <KV
            rows={[
              ['Sender', <Hex value={decoded.sender} full />],
              ['Application contract', <Hex value={decoded.application_contract} full />],
              ['Chain ID', formatUint(decoded.chain_id)],
              ['Block number', formatUint(decoded.block_number)],
              [
                'Block timestamp',
                timestamp !== null
                  ? `${formatDate(new Date(Number(timestamp) * 1000).toISOString())} (${timestamp})`
                  : '—',
              ],
              ['Prev randao', <Hex value={decoded.prev_randao} />],
              [
                'Payload',
                <PayloadView
                  value={decoded.payload}
                  decode={{ application: application.iapplication_address, kind: 'input', record: i }}
                />,
              ],
            ]}
          />
        </Section>
      )}

      <Section title="Produced by this input">
        <div className="flex flex-wrap gap-2">
          <Link
            to={`${base}/outputs?input=${inputIndex}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
          >
            Outputs →
          </Link>
          <Link
            to={`${base}/reports?input=${inputIndex}`}
            className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-sky-700 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-900 dark:text-sky-400 dark:hover:bg-slate-800"
          >
            Reports →
          </Link>
        </div>
      </Section>

      <div className="space-y-2">
        <Collapsible label="Raw input data">
          <PayloadView value={i.raw_data} />
        </Collapsible>
        <Collapsible label="Raw JSON">
          <JsonView value={i} />
        </Collapsible>
      </div>
    </div>
  )
}
