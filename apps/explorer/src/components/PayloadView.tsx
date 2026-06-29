import { useState } from 'react'
import { useDecodedPayload, type DecodeProps } from '../decoder/useDecodedPayload'
import type { DecodeResult } from '../decoder/types'
import { hexByteLength, hexToUtf8 } from '../lib/format'
import { Hex, JsonView, linkClass } from './ui'

type Mode = 'decoded' | 'utf8' | 'hex'

const MODE_LABELS: Record<Mode, string> = { decoded: 'Decoded', utf8: 'UTF-8', hex: 'Hex' }

/** Text representation of a decode result, for copying and plain display. */
function decodedToText(result: DecodeResult, indent?: number): string {
  if (typeof result.data === 'string') return result.data
  if (result.data !== undefined) return JSON.stringify(result.data, null, indent)
  return result.summary ?? ''
}

/** Displays a hex byte array with a decoded/UTF-8/hex toggle and byte size. */
export function PayloadView({ value, decode }: { value?: string | null; decode?: DecodeProps }) {
  const decoded = useDecodedPayload(value, decode)
  const utf8 = hexToUtf8(value)
  // Only an explicit user choice is stored; the default is derived so the
  // decoded view takes over when the (async) decoder result arrives.
  const [choice, setChoice] = useState<Mode | null>(null)
  const size = hexByteLength(value)

  if (!value || value === '0x') {
    return <span className="text-sm text-slate-400 dark:text-slate-500">empty (0 bytes)</span>
  }

  const result = decoded.status === 'decoded' ? decoded.result : undefined
  const modes: Mode[] = ['hex']
  if (utf8 !== null) modes.unshift('utf8')
  if (result) modes.unshift('decoded')
  const mode = choice !== null && modes.includes(choice) ? choice : modes[0]

  const text =
    mode === 'decoded' && result ? decodedToText(result, 2) : mode === 'utf8' && utf8 !== null ? utf8 : value
  const json =
    mode === 'decoded' && result && typeof result.data === 'object' && result.data !== null
      ? result.data
      : undefined

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
        <span>{size.toLocaleString()} bytes</span>
        {modes.length > 1 && (
          <div className="flex overflow-hidden rounded-md border border-slate-300 dark:border-slate-700">
            {modes.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setChoice(m)}
                className={`px-2 py-0.5 cursor-pointer ${
                  mode === m
                    ? 'bg-sky-600 text-white'
                    : 'bg-white text-slate-600 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800'
                }`}
              >
                {MODE_LABELS[m]}
              </button>
            ))}
          </div>
        )}
        {decoded.error && (
          <span title={decoded.error.message} className="text-amber-600 dark:text-amber-400">
            decoder failed
          </span>
        )}
        <Copy value={text} />
      </div>
      {mode === 'decoded' && result?.summary && result.data !== undefined && (
        <div className="text-xs text-slate-600 dark:text-slate-300">{result.summary}</div>
      )}
      {json !== undefined ? (
        <div className="max-h-64 overflow-auto">
          <JsonView value={json} />
        </div>
      ) : (
        <pre className="max-h-64 overflow-auto rounded-md bg-slate-50 border border-slate-200 p-3 text-xs leading-relaxed whitespace-pre-wrap break-all font-mono text-slate-800 dark:bg-slate-950 dark:border-slate-800 dark:text-slate-200">
          {text}
        </pre>
      )}
    </div>
  )
}

function Copy({ value }: { value: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <button
      type="button"
      onClick={() => {
        navigator.clipboard.writeText(value)
        setCopied(true)
        setTimeout(() => setCopied(false), 1200)
      }}
      className={`cursor-pointer ${linkClass}`}
    >
      {copied ? 'copied ✓' : 'copy'}
    </button>
  )
}

/**
 * Inline preview of a payload for table cells. Renders the full summary/text;
 * place it in a column marked `truncate` so it fills the available width and
 * clips overflow with an ellipsis (the full value is shown on hover).
 */
export function PayloadPreview({ value, decode }: { value?: string | null; decode?: DecodeProps }) {
  const decoded = useDecodedPayload(value, decode)
  if (!value || value === '0x') return <span className="text-slate-400 dark:text-slate-500">—</span>
  if (decoded.status === 'decoded' && decoded.result) {
    const full = decoded.result.summary ?? decodedToText(decoded.result)
    if (full) {
      return (
        <span className="text-slate-700 dark:text-slate-300" title={full}>
          {full}
        </span>
      )
    }
  }
  const utf8 = hexToUtf8(value)
  if (utf8 !== null) {
    return (
      <span className="text-slate-700 dark:text-slate-300" title={utf8}>
        “{utf8}”
      </span>
    )
  }
  return <Hex value={value} head={10} tail={4} />
}
