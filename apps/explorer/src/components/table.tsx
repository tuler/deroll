import type { ReactNode } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { Pagination } from '../api/types'
import { EmptyState, ErrorBox, Spinner } from './ui'

/** Reads list controls (limit/offset/descending + arbitrary filters) from the URL. */
export function useListControls(defaultLimit = 25) {
  const [searchParams, setSearchParams] = useSearchParams()
  const limit = Math.max(1, parseInt(searchParams.get('limit') ?? '', 10) || defaultLimit)
  const offset = Math.max(0, parseInt(searchParams.get('offset') ?? '', 10) || 0)
  const descending = searchParams.get('desc') === '1'

  /** Merges new params into the URL; pass null/'' to remove a key. Resets offset unless provided. */
  const update = (next: Record<string, string | number | boolean | null>) => {
    const params = new URLSearchParams(searchParams)
    if (!('offset' in next)) params.delete('offset')
    for (const [key, value] of Object.entries(next)) {
      if (value === null || value === '' || value === false) params.delete(key)
      else if (value === true) params.set(key, '1')
      else params.set(key, String(value))
    }
    setSearchParams(params, { replace: true })
  }

  return { searchParams, limit, offset, descending, update }
}

export function Pager({
  pagination,
  limit,
  offset,
  onChange,
}: {
  pagination?: Pagination
  limit: number
  offset: number
  onChange: (next: { limit?: number; offset?: number }) => void
}) {
  const total = pagination?.total_count ?? 0
  const from = total === 0 ? 0 : offset + 1
  const to = Math.min(offset + limit, total)

  const controlClass =
    'rounded-md border border-slate-300 bg-white dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200'

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 pt-3 text-sm text-slate-600 dark:text-slate-300">
      <span>
        {from.toLocaleString()}–{to.toLocaleString()} of {total.toLocaleString()}
      </span>
      <div className="flex items-center gap-2">
        <select
          value={limit}
          onChange={(e) => onChange({ limit: Number(e.target.value), offset: 0 })}
          className={`${controlClass} px-2 py-1 text-sm`}
        >
          {[10, 25, 50, 100].map((n) => (
            <option key={n} value={n}>
              {n} / page
            </option>
          ))}
        </select>
        <button
          type="button"
          disabled={offset === 0}
          onClick={() => onChange({ offset: Math.max(0, offset - limit) })}
          className={`${controlClass} px-3 py-1 disabled:opacity-40 enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800 enabled:cursor-pointer`}
        >
          ← Prev
        </button>
        <button
          type="button"
          disabled={offset + limit >= total}
          onClick={() => onChange({ offset: offset + limit })}
          className={`${controlClass} px-3 py-1 disabled:opacity-40 enabled:hover:bg-slate-50 dark:enabled:hover:bg-slate-800 enabled:cursor-pointer`}
        >
          Next →
        </button>
      </div>
    </div>
  )
}

export function SortToggle({
  descending,
  onChange,
}: {
  descending: boolean
  onChange: (desc: boolean) => void
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!descending)}
      className="rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
      title="Toggle sort order"
    >
      {descending ? '↓ Descending' : '↑ Ascending'}
    </button>
  )
}

interface Column<T> {
  header: ReactNode
  cell: (row: T) => ReactNode
  align?: 'left' | 'right'
  /** Absorb the table's leftover width and clip overflow with an ellipsis. */
  truncate?: boolean
}

export function DataTable<T>({
  columns,
  rows,
  rowKey,
  rowLink,
  isLoading,
  error,
  empty,
}: {
  columns: Column<T>[]
  rows?: T[]
  rowKey: (row: T) => string
  rowLink?: (row: T) => string
  isLoading?: boolean
  error?: unknown
  empty?: string
}) {
  const navigate = useNavigate()

  if (error) return <ErrorBox error={error} />
  if (isLoading && !rows) return <Spinner />
  if (!rows || rows.length === 0) return <EmptyState label={empty} />

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="border-b border-slate-200 text-left text-xs uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-400">
            {columns.map((col, i) => (
              <th
                key={i}
                className={`whitespace-nowrap px-3 py-2 font-semibold ${col.align === 'right' ? 'text-right' : ''}`}
              >
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={rowKey(row)}
              onClick={rowLink ? () => navigate(rowLink(row)) : undefined}
              className={`border-b border-slate-100 dark:border-slate-800 ${
                rowLink ? 'cursor-pointer hover:bg-sky-50/60 dark:hover:bg-sky-950/30' : ''
              }`}
            >
              {columns.map((col, i) => (
                <td
                  key={i}
                  className={`whitespace-nowrap px-3 py-2 align-middle ${
                    col.align === 'right' ? 'text-right' : ''
                  }${col.truncate ? ' w-full max-w-0' : ''}`}
                >
                  {col.truncate ? <div className="truncate">{col.cell(row)}</div> : col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/** Labeled filter wrapper for list pages. */
export function Filter({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-300">
      <span>{label}</span>
      {children}
    </label>
  )
}

export const filterInputClass =
  'rounded-md border border-slate-300 bg-white px-2 py-1.5 text-sm font-mono placeholder:font-sans focus:outline-2 focus:outline-sky-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:placeholder:text-slate-500'
