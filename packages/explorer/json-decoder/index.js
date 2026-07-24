// Example payload decoder for the Cartesi Node Explorer.
//
// A decoder is an ES module registered per application on the app's Overview
// page. The explorer imports it at runtime and calls one method per
// application-specific raw-bytes payload — a decoder exports only the methods
// for the payload sources it understands (all optional):
//
//   input(input, context)                → decodes input.decodedData.payload
//                                          (never called for portal deposits —
//                                          the explorer decodes those itself)
//   deposit(deposit, context)            → decodes the app-specific data
//                                          attached to a portal deposit
//                                          (deposit.execLayerData & co); the
//                                          deposit envelope arrives decoded
//   output(output, context)              → decodes output.decodedData.payload
//   report(report, context)              → decodes report.rawData
//   withdrawalAccount(withdrawal, context) → decodes withdrawal.account
//   withdrawalOutput(withdrawal, context)  → decodes withdrawal.output
//
// Interface (version 1):
//
//   export const version = 1   // required
//   export const name = '…'    // optional, shown in the UI
//   export const input = (input, context) => { … }   // and friends
//
//     each method receives the full API record and:
//       context: {
//         application: string,   // application contract address (lowercase)
//         chainId?: number,      // chain id of the connected node
//       }
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
// TypeScript authors get all of this typed from the @deroll/decoder package
// (types-only). For byte/ABI work, `import { … } from 'viem'` just works: the
// explorer provides viem to every decoder through its import map, pinned to
// the version the explorer itself uses — nothing to bundle. (This example
// sticks to TextDecoder because it wants strict UTF-8 validation.)
//
// This example handles the payloads produced by the mock server
// (mock-server/server.ts): JSON inputs like {"action":"transfer","amount":120}
// and the plain-text output and report payloads.

export const version = 1
export const name = 'Example JSON decoder'

/** @param {string | undefined} payload @returns {string | null} */
function toUtf8(payload) {
  if (!payload) return null
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

/** Plain-text payloads (the mock's outputs and reports are sentences). */
function text(payload) {
  const value = toUtf8(payload)
  if (value === null) return null // not text → let the explorer show hex
  return { summary: value, tags: [{ label: 'text', color: 'gray' }], data: value }
}

export const input = (input) => {
  const value = toUtf8(input.decodedData?.payload)
  if (value === null) return null
  try {
    const data = JSON.parse(value)
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
    return null // not JSON
  }
}

export const output = (output) => text(output.decodedData?.payload)

export const report = (report) => text(report.rawData)
