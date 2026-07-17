import { createClient, type CartesiClient } from '@cartesi/rpc'
import { JSONRPCErrorException } from 'json-rpc-2.0'

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

// One client per server URL, created lazily and kept for the page lifetime.
const clients = new Map<string, CartesiClient>()

function getClient(server: string): CartesiClient {
  let client = clients.get(server)
  if (!client) {
    client = createClient({ uri: server })
    clients.set(server, client)
  }
  return client
}

/**
 * Runs a request against the server's typed @cartesi/rpc client, normalizing
 * failures. json-rpc-2.0 rejects every failed request with a
 * JSONRPCErrorException: error responses from the server keep their JSON-RPC
 * code, while transport failures (network/CORS, non-200, invalid JSON) are
 * wrapped with its DefaultErrorCode (0). The former become RpcError — proof
 * the server answered — and everything else becomes an Error with a hint
 * about the usual cause (bad URL / missing CORS).
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
