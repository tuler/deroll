// Example payload decoder for the Cartesi Node Explorer.
//
// A decoder is an ES module registered per application on the app's Overview
// page. The explorer imports it at runtime and calls decode() for every input,
// output and report payload of that application.
//
// Interface (version 1):
//
//   export const version = 1   // required
//   export const name = '…'    // optional, shown in the UI
//   export function decode(payload, context)
//
//     payload: hex byte string, e.g. "0x7b22…"
//     context: {
//       kind: 'input' | 'output' | 'report',
//       application: string,   // application contract address (lowercase)
//       chainId?: number,      // chain id of the connected node
//       record?: object,       // full API record the payload belongs to
//     }
//
//     returns (sync or async):
//       { summary?: string, data?: unknown }
//         summary → one line, shown in table cells
//         data    → detail view: string renders as text, object/array as JSON
//       or null/undefined when the payload is not recognized — the explorer
//       falls back to its hex/UTF-8 view.
//
// This example handles the payloads produced by the mock server
// (mock/server.ts, which serves this file at http://localhost:10011/decoder.js):
// JSON inputs like {"action":"transfer","amount":120} and the plain-text
// output and report payloads.

export const version = 1
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
 * @param {{ kind: 'input' | 'output' | 'report' }} context
 */
export function decode(payload, context) {
  const text = toUtf8(payload)
  if (text === null) return null // not text → let the explorer show hex

  try {
    const data = JSON.parse(text)
    const summary =
      data && typeof data === 'object' && 'action' in data
        ? `${data.action} · amount ${data.amount}`
        : undefined
    return { summary, data }
  } catch {
    // not JSON
  }

  // The mock's output and report payloads are plain-text sentences.
  if (context.kind !== 'input') return { summary: text, data: text }
  return null
}
