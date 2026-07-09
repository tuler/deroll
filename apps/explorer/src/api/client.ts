import type { CartesiClient } from '@cartesi/rpc'
import { JSONRPCClient, JSONRPCErrorException } from 'json-rpc-2.0'

export class RpcError extends Error {
  code: number
  data?: unknown

  constructor(code: number, message: string, data?: unknown) {
    super(message)
    this.name = 'RpcError'
    this.code = code
    this.data = data
  }
}

/**
 * Builds the same typed json-rpc-2.0 client that @cartesi/rpc's createClient()
 * returns, but with a send function that propagates transport failures.
 * createClient() in @cartesi/rpc 2.0.0-alpha.22 does not return its fetch
 * chain from the send callback, so a network/CORS failure, a non-200 response
 * or an invalid JSON body never settles the request — the UI would spin
 * forever. Swap back to createClient() once that is fixed upstream; the
 * types (CartesiClient and every method signature) already come from
 * @cartesi/rpc.
 */
function createCartesiClient(server: string): CartesiClient {
  const client: JSONRPCClient = new JSONRPCClient(async (request) => {
    const response = await fetch(server, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(request),
    })
    if (!response.ok) throw new Error(`HTTP ${response.status} ${response.statusText}`)
    client.receive(await response.json())
  })
  return client as CartesiClient
}

// One client per server URL, created lazily and kept for the page lifetime.
const clients = new Map<string, CartesiClient>()

function getClient(server: string): CartesiClient {
  let client = clients.get(server)
  if (!client) {
    client = createCartesiClient(server)
    clients.set(server, client)
  }
  return client
}

/**
 * Runs a request against the server's typed client, normalizing failures.
 * json-rpc-2.0 rejects every failed request with a JSONRPCErrorException:
 * error responses from the server keep their JSON-RPC code, while send/
 * transport failures are wrapped with its DefaultErrorCode (0). The former
 * become RpcError — proof the server answered — and everything else becomes
 * an Error with a hint about the usual cause (bad URL / missing CORS).
 */
export async function rpc<T>(
  server: string,
  run: (client: CartesiClient) => PromiseLike<T>,
): Promise<T> {
  try {
    return await run(getClient(server))
  } catch (err) {
    if (err instanceof JSONRPCErrorException && err.code !== 0) {
      throw new RpcError(err.code, err.message, err.data)
    }
    throw new Error(
      `Cannot reach ${server} — check the server URL and that the node allows ` +
        `cross-origin requests (CARTESI_JSONRPC_API_CORS_ALLOWED_ORIGINS). ` +
        `(${err instanceof Error ? err.message : String(err)})`,
    )
  }
}
