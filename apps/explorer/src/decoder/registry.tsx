import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'cartesi-explorer.decoders'
const URL_PARAM = 'decoder'

/** Decoder module URLs keyed by lowercase application contract address. */
type DecoderUrls = Record<string, string>

interface DecoderContextValue {
  decoders: DecoderUrls
  setDecoder: (application: string, url: string) => void
  removeDecoder: (application: string) => void
}

const DecoderContext = createContext<DecoderContextValue>({
  decoders: {},
  setDecoder: () => {},
  removeDecoder: () => {},
})

export function DecoderProvider({ children }: { children: ReactNode }) {
  const [decoders, setDecoders] = useState<DecoderUrls>(() => {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as DecoderUrls
    } catch {
      return {}
    }
  })

  const update = useCallback((mutate: (prev: DecoderUrls) => DecoderUrls) => {
    setDecoders((prev) => {
      const next = mutate(prev)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [])

  const setDecoder = useCallback(
    (application: string, url: string) => {
      const trimmed = url.trim()
      if (!trimmed) return
      update((prev) => ({ ...prev, [application.toLowerCase()]: trimmed }))
    },
    [update],
  )

  const removeDecoder = useCallback(
    (application: string) => {
      update((prev) => {
        const next = { ...prev }
        delete next[application.toLowerCase()]
        return next
      })
    },
    [update],
  )

  return (
    <DecoderContext.Provider value={{ decoders, setDecoder, removeDecoder }}>
      {children}
    </DecoderContext.Provider>
  )
}

export function useDecoders() {
  return useContext(DecoderContext)
}

/** URL of the decoder registered for an application address, if any. */
export function useDecoderUrl(application?: string): string | undefined {
  const { decoders } = useDecoders()
  return application ? decoders[application.toLowerCase()] : undefined
}

/**
 * Mirrors the application's registered decoder into a ?decoder= query param so
 * the address bar is a shareable link, and offers a decoder suggested by such
 * a link. Unlike ?server=, a suggestion is never adopted silently — a decoder
 * is executable code, so a banner asks for explicit confirmation first.
 * Must be mounted inside an application route.
 */
export function DecoderUrlSync({ application }: { application: string }) {
  const { decoders, setDecoder } = useDecoders()
  const registered = decoders[application.toLowerCase()]
  const location = useLocation()
  const navigate = useNavigate()
  const [dismissed, setDismissed] = useState<string | null>(null)

  const suggested = new URLSearchParams(location.search).get(URL_PARAM)?.trim()
  const pending = suggested && suggested !== registered && suggested !== dismissed ? suggested : null

  useEffect(() => {
    if (pending) return // keep the suggested param while the banner is up
    const params = new URLSearchParams(location.search)
    if ((params.get(URL_PARAM) ?? undefined) !== registered) {
      if (registered) params.set(URL_PARAM, registered)
      else params.delete(URL_PARAM)
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true })
    }
  }, [location, registered, pending, navigate])

  if (!pending) return null

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950/40 dark:text-amber-200">
      <span className="min-w-0">
        This link suggests payload decoder <code className="font-mono break-all">{pending}</code>{' '}
        for this application. A decoder runs with full access to this page — only add it if you
        trust the source.
      </span>
      <span className="flex gap-2">
        <button
          type="button"
          onClick={() => setDecoder(application, pending)}
          className="rounded-md bg-amber-600 px-3 py-1 text-xs font-medium text-white hover:bg-amber-700 cursor-pointer"
        >
          Add decoder
        </button>
        <button
          type="button"
          onClick={() => setDismissed(pending)}
          className="rounded-md border border-amber-400 px-3 py-1 text-xs text-amber-800 hover:bg-amber-100 cursor-pointer dark:border-amber-600 dark:text-amber-200 dark:hover:bg-amber-900/40"
        >
          Dismiss
        </button>
      </span>
    </div>
  )
}
