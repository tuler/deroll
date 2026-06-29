import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { loadDecoder } from '../decoder/loader'
import { useDecoders } from '../decoder/registry'
import { filterInputClass } from './table'
import { Section } from './ui'

/** Registration UI for an application's payload decoder module. */
export function DecoderSettings({ application }: { application: string }) {
  const { decoders, setDecoder, removeDecoder } = useDecoders()
  const url = decoders[application.toLowerCase()]
  const [draft, setDraft] = useState(url ?? '')

  const module = useQuery({
    queryKey: ['decoder-module', url],
    queryFn: () => loadDecoder(url!),
    enabled: !!url,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  return (
    <Section title="Payload decoder">
      <div className="space-y-2">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          A module that translates this application's payloads into readable data — a built ES
          module URL, or a decoder's TypeScript source on GitHub (paste the file's{' '}
          <code className="font-mono">github.com</code> URL, or use{' '}
          <code className="font-mono">gh:owner/repo@ref/path.ts</code>). It runs with full access
          to this page — only add sources you trust.
        </p>
        <form
          className="flex flex-wrap items-center gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            setDecoder(application, draft)
          }}
        >
          <input
            type="url"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="https://github.com/owner/repo/blob/main/decoder.ts"
            className={`${filterInputClass} min-w-0 flex-1`}
          />
          <button
            type="submit"
            disabled={!draft.trim() || draft.trim() === url}
            className="rounded-md bg-sky-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-sky-700 disabled:cursor-default disabled:opacity-50 cursor-pointer"
          >
            {url ? 'Update' : 'Add'}
          </button>
          {url && (
            <button
              type="button"
              onClick={() => {
                removeDecoder(application)
                setDraft('')
              }}
              className="rounded-md border border-slate-300 bg-white px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50 cursor-pointer dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              Remove
            </button>
          )}
        </form>
        {url && (
          <div className="text-xs">
            {module.isPending ? (
              <span className="text-slate-500 dark:text-slate-400">Loading decoder…</span>
            ) : module.error ? (
              <span className="text-red-700 dark:text-red-400">{module.error.message}</span>
            ) : module.data ? (
              <span className="text-emerald-700 dark:text-emerald-400">
                Loaded ✓ {module.data.name ?? 'unnamed decoder'} (v{module.data.version})
              </span>
            ) : null}
          </div>
        )}
      </div>
    </Section>
  )
}
