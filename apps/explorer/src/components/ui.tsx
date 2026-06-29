import { useState, type ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { shortHex } from '../lib/format'

export const linkClass = 'text-sky-700 hover:underline dark:text-sky-400'

/** Monospace hex value with middle truncation and click-to-copy. */
export function Hex({
  value,
  head = 8,
  tail = 6,
  full = false,
  to,
  href,
  hrefTitle = 'Open in block explorer',
}: {
  value?: string | null
  head?: number
  tail?: number
  full?: boolean
  to?: string
  /** When set, render an external-link button opening this URL in a new tab. */
  href?: string
  hrefTitle?: string
}) {
  const [copied, setCopied] = useState(false)
  if (!value) return <span className="text-slate-400 dark:text-slate-500">—</span>

  const text = full ? value : shortHex(value, head, tail)
  const inner = to ? (
    <Link to={to} className={linkClass}>
      {text}
    </Link>
  ) : (
    <span>{text}</span>
  )

  const iconClass =
    'text-slate-300 hover:text-slate-600 dark:text-slate-600 dark:hover:text-slate-300 cursor-pointer'

  return (
    <span className="inline-flex items-center gap-1 font-mono text-[13px] break-all" title={value}>
      {inner}
      <button
        type="button"
        aria-label="Copy"
        className={iconClass}
        onClick={(e) => {
          e.stopPropagation()
          navigator.clipboard.writeText(value)
          setCopied(true)
          setTimeout(() => setCopied(false), 1200)
        }}
      >
        {copied ? (
          <span className="text-emerald-600 dark:text-emerald-400 text-xs">✓</span>
        ) : (
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M4 2a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V2Zm2-.5a.5.5 0 0 0-.5.5v8a.5.5 0 0 0 .5.5h6a.5.5 0 0 0 .5-.5V2a.5.5 0 0 0-.5-.5H6Z" />
            <path d="M2 5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1H8.5v1a.5.5 0 0 1-.5.5H2a.5.5 0 0 1-.5-.5V7a.5.5 0 0 1 .5-.5h1V5H2Z" />
          </svg>
        )}
      </button>
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={hrefTitle}
          title={hrefTitle}
          className={iconClass}
          onClick={(e) => e.stopPropagation()}
        >
          <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
            <path d="M9 1a.5.5 0 0 0 0 1h3.793L7.146 7.646a.5.5 0 1 0 .708.708L13.5 2.707V6.5a.5.5 0 0 0 1 0v-5a.5.5 0 0 0-.5-.5H9Z" />
            <path d="M3 3a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V9a.5.5 0 0 0-1 0v4a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h4a.5.5 0 0 0 0-1H3Z" />
          </svg>
        </a>
      )}
    </span>
  )
}

const GREEN = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-300'
const RED = 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-300'
const GRAY = 'bg-slate-200 text-slate-700 dark:bg-slate-700/50 dark:text-slate-300'
const BLUE = 'bg-sky-100 text-sky-800 dark:bg-sky-500/15 dark:text-sky-300'
const INDIGO = 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-300'
const VIOLET = 'bg-violet-100 text-violet-800 dark:bg-violet-500/15 dark:text-violet-300'
const AMBER = 'bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300'

const STATUS_COLORS: Record<string, string> = {
  // application state
  ENABLED: GREEN,
  DISABLED: GRAY,
  FAILED: RED,
  INOPERABLE: RED,
  // epoch
  OPEN: BLUE,
  CLOSED: GRAY,
  INPUTS_PROCESSED: INDIGO,
  CLAIM_COMPUTED: VIOLET,
  CLAIM_SUBMITTED: AMBER,
  CLAIM_ACCEPTED: GREEN,
  CLAIM_REJECTED: RED,
  // input
  NONE: GRAY,
  ACCEPTED: GREEN,
  REJECTED: RED,
  EXCEPTION: RED,
  MACHINE_HALTED: RED,
  OUTPUTS_LIMIT_EXCEEDED: AMBER,
  CYCLE_LIMIT_EXCEEDED: AMBER,
  TIME_LIMIT_EXCEEDED: AMBER,
  PAYLOAD_LENGTH_LIMIT_EXCEEDED: AMBER,
  // match winner / deletion
  ONE: GREEN,
  TWO: GREEN,
  STEP: VIOLET,
  TIMEOUT: AMBER,
  CHILD_TOURNAMENT: INDIGO,
  NOT_DELETED: GRAY,
  // tournament progress (UI-derived)
  FINISHED: GREEN,
  IN_PROGRESS: BLUE,
}

export function StatusBadge({ status }: { status?: string | null }) {
  if (!status) return <span className="text-slate-400 dark:text-slate-500">—</span>
  const color = STATUS_COLORS[status] ?? GRAY
  return (
    <span
      className={`inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold tracking-wide ${color}`}
    >
      {status}
    </span>
  )
}

export function Section({
  title,
  actions,
  children,
}: {
  title: ReactNode
  actions?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="rounded-lg border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <header className="flex items-center justify-between border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <h2 className="text-sm font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
        {actions}
      </header>
      <div className="p-4">{children}</div>
    </section>
  )
}

/** Key/value rows for detail pages. */
export function KV({ rows }: { rows: Array<[ReactNode, ReactNode] | null> }) {
  return (
    <dl className="grid grid-cols-1 gap-x-8 gap-y-2 sm:grid-cols-[max-content_1fr]">
      {rows
        .filter((row): row is [ReactNode, ReactNode] => row !== null)
        .map(([key, value], i) => (
          <div key={i} className="contents">
            <dt className="text-sm text-slate-500 dark:text-slate-400">{key}</dt>
            <dd className="text-sm text-slate-900 min-w-0 dark:text-slate-100">{value}</dd>
          </div>
        ))}
    </dl>
  )
}

export function Collapsible({
  label,
  children,
  defaultOpen = false,
}: {
  label: ReactNode
  children: ReactNode
  defaultOpen?: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`text-sm cursor-pointer ${linkClass}`}
      >
        {open ? '▾' : '▸'} {label}
      </button>
      {open && <div className="mt-2">{children}</div>}
    </div>
  )
}

export function JsonView({ value }: { value: unknown }) {
  return (
    <pre className="overflow-x-auto rounded-md bg-slate-900 p-3 text-xs leading-relaxed text-slate-100 dark:bg-slate-950 dark:ring-1 dark:ring-slate-800">
      {JSON.stringify(value, null, 2)}
    </pre>
  )
}

export function Spinner({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center gap-2 py-8 text-sm text-slate-500 dark:text-slate-400 justify-center">
      <span className="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-sky-600 dark:border-slate-700 dark:border-t-sky-400" />
      {label}
    </div>
  )
}

export function ErrorBox({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error)
  return (
    <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 dark:border-red-900 dark:bg-red-950/50 dark:text-red-300">
      {message}
    </div>
  )
}

export function EmptyState({ label = 'Nothing found.' }: { label?: string }) {
  return <div className="py-8 text-center text-sm text-slate-400 dark:text-slate-500">{label}</div>
}

export function Crumbs({ items }: { items: Array<{ label: ReactNode; to?: string }> }) {
  return (
    <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <span className="text-slate-300 dark:text-slate-600">/</span>}
          {item.to ? (
            <Link to={item.to} className={linkClass}>
              {item.label}
            </Link>
          ) : (
            <span className="text-slate-700 font-medium dark:text-slate-200">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  )
}
