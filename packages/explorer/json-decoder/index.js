// Example payload decoder for the Cartesi Node Explorer.
//
// A decoder is an ES module registered per application on the app's Overview
// page. The explorer imports it at runtime and calls decode() for every
// application-specific raw-bytes payload of that application. Each call names
// the exact bytes being decoded via context.kind:
//
//   'input'               → input.decoded_data.payload (the advance payload)
//   'output'              → output.decoded_data.payload (Notice/Voucher/… payload)
//   'report'              → report.raw_data (the full report body)
//   'withdrawal-account'  → withdrawal.account (app-defined account encoding)
//   'withdrawal-output'   → withdrawal.output (app-defined output blob)
//
// Interface:
//
//   export const version = 2   // required; version 1 decoders predate the
//                              // withdrawal kinds and are never called for them
//   export const name = '…'    // optional, shown in the UI
//   export function decode(payload, context)
//
//     payload: hex byte string, e.g. "0x7b22…"
//     context: {
//       kind: 'input' | 'output' | 'report' | 'withdrawal-account' | 'withdrawal-output',
//       application: string,   // application contract address (lowercase)
//       chainId?: number,      // chain id of the connected node
//       record?: object,       // full API record the payload belongs to
//     }
//
//     returns (sync or async):
//       { summary?: string, tags?: Array<string | Tag>, data?: unknown }
//         summary → one line, shown in table cells
//         tags    → colored tags/pills shown alongside the summary; a Tag is
//                   { label, color?, title? } with color one of gray | blue |
//                   cyan | indigo | violet | pink | green | amber | red (a
//                   bare string is a gray tag)
//         data    → detail view: string renders as text, object/array as JSON
//       or null/undefined when the payload is not recognized — the explorer
//       falls back to its hex/UTF-8 view.
//
// TypeScript authors get all of this typed from the @deroll/decoder package.
//
// This example handles the payloads produced by the mock server
// (mock-server/server.ts): JSON inputs like {"action":"transfer","amount":120}
// and the plain-text output and report payloads.

export const version = 2
export const name = 'Example JSON decoder'

/** @param {string} payload @returns {string | null} */
function toUtf8(payload) {
  const bytes = new Uint8Array((payload.length - 2) / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(payload.slice(2 + i * 2, 4 + i * 2), 16)
  }
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/**
 * @param {string} payload
 * @param {{ kind: string }} context
 */
export function decode(payload, context) {
  const text = toUtf8(payload)
  if (text === null) return null // not text → let the explorer show hex

  try {
    const data = JSON.parse(text)
    if (data && typeof data === 'object' && 'action' in data) {
      return {
        summary: `${data.action} · amount ${data.amount}`,
        // A colored pill for the message kind, e.g. [transfer] in blue.
        tags: [{ label: String(data.action), color: 'blue' }],
        data,
      }
    }
    return { data }
  } catch {
    // not JSON
  }

  // The mock's output and report payloads are plain-text sentences.
  if (context.kind !== 'input') {
    return { summary: text, tags: [{ label: 'text', color: 'gray' }], data: text }
  }
  return null
}
