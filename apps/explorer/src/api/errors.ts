import { BaseError, HttpRequestError, RpcRequestError } from "viem";

/**
 * True when the failure is a JSON-RPC error RESPONSE — proof the server is
 * answering (e.g. a node without an EVM reader errors on cartesi_getChainId
 * while serving everything else). Transport failures (network/CORS, non-200)
 * are not.
 */
export function isRpcResponseError(error: unknown): boolean {
    return (
        error instanceof BaseError &&
        error.walk((e) => e instanceof RpcRequestError) !== null
    );
}

/** Human-readable message for a failed API call, with a hint for the usual cause. */
export function apiErrorMessage(error: unknown, server?: string): string {
    if (error instanceof BaseError) {
        if (
            error.walk((e) => e instanceof HttpRequestError) &&
            !isRpcResponseError(error)
        ) {
            return (
                `Cannot reach ${server ?? "the server"} — check the server URL and that the node ` +
                `allows cross-origin requests (CARTESI_JSONRPC_API_CORS_ALLOWED_ORIGINS). ` +
                `(${error.shortMessage})`
            );
        }
        return error.shortMessage;
    }
    return error instanceof Error ? error.message : String(error);
}
