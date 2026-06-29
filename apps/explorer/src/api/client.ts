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

interface JsonRpcResponse<T> {
  jsonrpc: '2.0'
  id: number
  result?: T
  error?: { code: number; message: string; data?: unknown }
}

let nextId = 0

/**
 * Performs a JSON-RPC 2.0 call against the given server URL using named
 * (by-name) parameters. Keys with undefined values are omitted by
 * JSON.stringify, so optional filters can be passed as undefined.
 */
export async function rpcCall<T>(
  server: string,
  method: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  let response: Response
  try {
    response = await fetch(server, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ jsonrpc: '2.0', id: ++nextId, method, params }),
    })
  } catch (err) {
    throw new Error(
      `Cannot reach ${server} — check the server URL and that the node allows ` +
        `cross-origin requests (CARTESI_JSONRPC_API_CORS_ALLOWED_ORIGINS). ` +
        `(${err instanceof Error ? err.message : String(err)})`,
    )
  }
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`)
  }
  const body = (await response.json()) as JsonRpcResponse<T>
  if (body.error) {
    throw new RpcError(body.error.code, body.error.message, body.error.data)
  }
  return body.result as T
}
