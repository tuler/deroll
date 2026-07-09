import { createClient, type CartesiClient } from '@cartesi/rpc'

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

// One @cartesi/rpc client per server URL, created lazily and kept for the
// lifetime of the page (the client itself is stateless beyond a request id).
const clients = new Map<string, CartesiClient>()

export function getClient(server: string): CartesiClient {
  let client = clients.get(server)
  if (!client) {
    client = createClient({ uri: server })
    clients.set(server, client)
  }
  return client
}

/**
 * Runs a request against the server's typed @cartesi/rpc client, normalizing
 * failures: JSON-RPC error responses become RpcError (code/message/data);
 * anything else (network failure, CORS, non-200) becomes an Error with a hint
 * about the usual cause.
 */
export async function rpc<T>(
  server: string,
  run: (client: CartesiClient) => PromiseLike<T>,
): Promise<T> {
  try {
    return await run(getClient(server))
  } catch (err) {
    // json-rpc-2.0 rejects RPC error responses with a JSONRPCErrorException,
    // recognizable by its numeric code.
    if (err instanceof Error && typeof (err as { code?: unknown }).code === 'number') {
      const e = err as Error & { code: number; data?: unknown }
      throw new RpcError(e.code, e.message, e.data)
    }
    throw new Error(
      `Cannot reach ${server} — check the server URL and that the node allows ` +
        `cross-origin requests (CARTESI_JSONRPC_API_CORS_ALLOWED_ORIGINS). ` +
        `(${err instanceof Error ? err.message : String(err)})`,
    )
  }
}
