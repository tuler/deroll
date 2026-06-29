const ZERO_RE = /^0x0*$/

/** Parses a hex-encoded unsigned integer; returns null when absent/invalid. */
export function hexToBigInt(hex?: string | null): bigint | null {
  if (!hex) return null
  try {
    return BigInt(hex)
  } catch {
    return null
  }
}

/** Formats a hex-encoded unsigned integer as a decimal string. */
export function formatUint(hex?: string | null): string {
  const value = hexToBigInt(hex)
  return value === null ? '—' : value.toLocaleString('en-US')
}

/** Plain (ungrouped) decimal string of a hex-encoded unsigned integer. */
export function uintToDecimal(hex?: string | null): string {
  const value = hexToBigInt(hex)
  return value === null ? '' : value.toString(10)
}

/** Converts a decimal string (URL param) to the hex encoding the API expects. */
export function decimalToHex(dec: string): string {
  return '0x' + BigInt(dec).toString(16)
}

/** Middle-truncates a hex string for display, e.g. 0x1234…abcd. */
export function shortHex(hex: string, head = 8, tail = 6): string {
  if (hex.length <= 2 + head + tail) return hex
  return `${hex.slice(0, 2 + head)}…${hex.slice(-tail)}`
}

/** True for "0x", "0x0", "0x000…0" — used for sentinel values. */
export function isZeroHex(hex?: string | null): boolean {
  return !hex || ZERO_RE.test(hex)
}

/** Number of bytes encoded in a hex byte array. */
export function hexByteLength(hex?: string | null): number {
  if (!hex || hex.length < 2) return 0
  return Math.floor((hex.length - 2) / 2)
}

/** Decodes a hex byte array as UTF-8; returns null when it is not mostly printable text. */
export function hexToUtf8(hex?: string | null): string | null {
  if (!hex || hex.length <= 2) return null
  const bytes = new Uint8Array(hexByteLength(hex))
  for (let i = 0; i < bytes.length; i++) {
    const byte = parseInt(hex.slice(2 + i * 2, 4 + i * 2), 16)
    if (Number.isNaN(byte)) return null
    bytes[i] = byte
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
    // Reject if it contains control characters other than common whitespace.
    let printable = 0
    for (const ch of text) {
      const code = ch.codePointAt(0)!
      if (code === 9 || code === 10 || code === 13 || code >= 32) printable++
    }
    return printable / [...text].length >= 0.9 ? text : null
  } catch {
    return null
  }
}

/** Formats an ISO date-time for display. */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—'
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return iso
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  })
}

/** Formats a duration given in nanoseconds (hex) into a human readable string. */
export function formatNanos(hex?: string | null): string {
  const value = hexToBigInt(hex)
  if (value === null) return '—'
  const ns = Number(value)
  if (ns < 1_000) return `${ns} ns`
  if (ns < 1_000_000) return `${ns / 1_000} µs`
  if (ns < 1_000_000_000) return `${ns / 1_000_000} ms`
  return `${ns / 1_000_000_000} s`
}

/** Formats a decimal wei string, appending the ether value when meaningful. */
export function formatWei(value?: string | null): string {
  if (!value) return '—'
  try {
    const wei = BigInt(value)
    if (wei === 0n) return '0 wei'
    const ether = Number(wei) / 1e18
    return ether >= 0.000001 ? `${value} wei (${ether} ETH)` : `${value} wei`
  } catch {
    return value
  }
}
