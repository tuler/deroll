import { CartesiProvider } from '@cartesi/wagmi'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { StrictMode, type ReactNode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import App from './App'
import './index.css'
import { DecoderProvider } from './decoder/registry'
import { ServerProvider, useServer } from './server'

const queryClient = new QueryClient()

/** Binds @cartesi/wagmi's client to the user-selected server URL. */
function CartesiNode({ children }: { children: ReactNode }) {
  const { server } = useServer()
  return <CartesiProvider rpcUrl={server}>{children}</CartesiProvider>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ServerProvider>
      <DecoderProvider>
        <QueryClientProvider client={queryClient}>
          <CartesiNode>
            <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
              <App />
            </BrowserRouter>
          </CartesiNode>
        </QueryClientProvider>
      </DecoderProvider>
    </ServerProvider>
  </StrictMode>,
)
