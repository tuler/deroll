import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const STORAGE_KEY = 'cartesi-explorer.server'
const URL_PARAM = 'server'
export const DEFAULT_SERVER = 'http://localhost:10011/rpc'

interface ServerContextValue {
  server: string
  setServer: (url: string) => void
}

const ServerContext = createContext<ServerContextValue>({
  server: DEFAULT_SERVER,
  setServer: () => {},
})

export function ServerProvider({ children }: { children: ReactNode }) {
  const [server, setServerState] = useState(() => {
    // A ?server= param in a shared link takes precedence over the saved URL.
    const fromUrl = new URLSearchParams(window.location.search).get(URL_PARAM)
    if (fromUrl?.trim()) {
      localStorage.setItem(STORAGE_KEY, fromUrl.trim())
      return fromUrl.trim()
    }
    return localStorage.getItem(STORAGE_KEY) ?? DEFAULT_SERVER
  })

  const setServer = useCallback((url: string) => {
    const trimmed = url.trim()
    if (!trimmed) return
    localStorage.setItem(STORAGE_KEY, trimmed)
    setServerState(trimmed)
  }, [])

  return <ServerContext.Provider value={{ server, setServer }}>{children}</ServerContext.Provider>
}

export function useServer() {
  return useContext(ServerContext)
}

/**
 * Mirrors the active server into a ?server= query param on every navigation,
 * so the address bar is always a shareable link that pins the node.
 * Renders nothing; must be mounted inside the router.
 */
export function ServerUrlSync() {
  const { server } = useServer()
  const location = useLocation()
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(location.search)
    if (params.get(URL_PARAM) !== server) {
      params.set(URL_PARAM, server)
      navigate({ pathname: location.pathname, search: params.toString() }, { replace: true })
    }
  }, [location, server, navigate])

  return null
}
