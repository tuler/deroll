import { useEffect, useState } from 'react'
import { Link, Outlet } from 'react-router-dom'
import { useChainId, useNodeVersion } from '../api/hooks'
import { formatUint } from '../lib/format'
import { useServer } from '../server'
import { useTheme } from '../theme'

function ServerBar() {
  const { server, setServer } = useServer()
  const [draft, setDraft] = useState(server)
  useEffect(() => setDraft(server), [server])

  const chainId = useChainId()
  const version = useNodeVersion()
  const connected = chainId.isSuccess
  const checking = chainId.isLoading

  return (
    <form
      className="flex flex-1 items-center justify-end gap-3"
      onSubmit={(e) => {
        e.preventDefault()
        setServer(draft)
      }}
    >
      <div className="flex items-center gap-2 text-xs text-slate-300">
        <span
          className={`h-2.5 w-2.5 rounded-full ${
            checking ? 'bg-amber-400' : connected ? 'bg-emerald-400' : 'bg-red-500'
          }`}
          title={connected ? 'Connected' : checking ? 'Connecting…' : 'Unreachable'}
        />
        {connected ? (
          <span className="hidden sm:inline whitespace-nowrap">
            chain {formatUint(chainId.data?.data)} · node v{version.data?.data ?? '?'}
          </span>
        ) : (
          <span className="hidden sm:inline">{checking ? 'connecting…' : 'unreachable'}</span>
        )}
      </div>
      <input
        type="url"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={() => setServer(draft)}
        placeholder="http://localhost:10011/rpc"
        spellCheck={false}
        className="w-full max-w-xs rounded-md border border-slate-600 bg-slate-800 px-3 py-1.5 font-mono text-xs text-slate-100 placeholder:text-slate-500 focus:outline-2 focus:outline-sky-400 sm:max-w-sm"
        aria-label="JSON-RPC server URL"
      />
    </form>
  )
}

function ThemeToggle() {
  const { theme, toggle } = useTheme()
  return (
    <button
      type="button"
      onClick={toggle}
      title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label="Toggle dark mode"
      className="grid h-8 w-8 shrink-0 place-items-center rounded-md text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
    >
      {theme === 'dark' ? (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M8 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM8 0a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 8 0Zm0 13.5a.75.75 0 0 1 .75.75v1a.75.75 0 0 1-1.5 0v-1A.75.75 0 0 1 8 13.5ZM16 8a.75.75 0 0 1-.75.75h-1a.75.75 0 0 1 0-1.5h1A.75.75 0 0 1 16 8ZM2.5 8a.75.75 0 0 1-.75.75h-1a.75.75 0 0 1 0-1.5h1A.75.75 0 0 1 2.5 8Zm10.97-5.47a.75.75 0 0 1 0 1.06l-.71.71a.75.75 0 1 1-1.06-1.06l.71-.71a.75.75 0 0 1 1.06 0ZM4.3 11.7a.75.75 0 0 1 0 1.06l-.71.71a.75.75 0 0 1-1.06-1.06l.71-.71a.75.75 0 0 1 1.06 0Zm9.17 1.77a.75.75 0 0 1-1.06 0l-.71-.71a.75.75 0 1 1 1.06-1.06l.71.71a.75.75 0 0 1 0 1.06ZM4.3 4.3a.75.75 0 0 1-1.06 0l-.71-.71a.75.75 0 0 1 1.06-1.06l.71.71a.75.75 0 0 1 0 1.06Z" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M6.2 1.1a.5.5 0 0 1 .1.55 6 6 0 0 0 8.05 8.05.5.5 0 0 1 .67.66A7 7 0 1 1 5.64.98a.5.5 0 0 1 .55.12Z" />
        </svg>
      )}
    </button>
  )
}

export function Layout() {
  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
      <header className="bg-slate-900 text-white shadow dark:border-b dark:border-slate-800">
        <div className="mx-auto flex max-w-6xl items-center gap-4 px-4 py-3">
          <Link to="/" className="flex items-center gap-2 whitespace-nowrap">
            <span className="grid h-7 w-7 place-items-center rounded bg-sky-500 font-bold text-white">
              C
            </span>
            <span className="font-semibold tracking-tight">Cartesi Node Explorer</span>
          </Link>
          <ServerBar />
          <ThemeToggle />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-6">
        <Outlet />
      </main>
      <footer className="mx-auto max-w-6xl px-4 pb-6 text-xs text-slate-400 dark:text-slate-600">
        Cartesi Rollups Node JSON-RPC API v2.0.0 — read-only explorer
      </footer>
    </div>
  )
}
