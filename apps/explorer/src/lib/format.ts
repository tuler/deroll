const ZERO_RE = /^0x0*$/

/** Formats an unsigned integer for display, with thousands separators. */
export function formatUint(value?: bigint | number | null): string {
  return value === undefined || value === null ? '—' : value.toLocaleString('en-US')
}

/** Plain (ungrouped) decimal string, for URLs. */
export function uintToDecimal(value?: bigint | null): string {
  return value === undefined || value === null ? '' : value.toString(10)
}

/** Parses a decimal route param into a bigint; garbage becomes 0n. */
export function parseUintParam(dec?: string): bigint {
  try {
    return BigInt(dec ?? 0)
  } catch {
    return 0n
  }
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

/** Parses a hex-encoded unsigned integer; returns null when absent/invalid. */
export function hexToBigInt(hex?: string | null): bigint | null {
  if (!hex) return null
  try {
    return BigInt(hex)
  } catch {
    return null
  }
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

/** Formats a date-time for display. */
export function formatDate(value?: Date | string | null): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return String(value)
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

/** Formats a duration given in nanoseconds into a human readable string. */
export function formatNanos(value?: bigint | null): string {
  if (value === undefined || value === null) return '—'
  const ns = Number(value)
  if (ns < 1_000) return `${ns} ns`
  if (ns < 1_000_000) return `${ns / 1_000} µs`
  if (ns < 1_000_000_000) return `${ns / 1_000_000} ms`
  return `${ns / 1_000_000_000} s`
}

/** Formats a wei amount, appending the ether value when meaningful. */
export function formatWei(value?: bigint | null): string {
  if (value === undefined || value === null) return '—'
  if (value === 0n) return '0 wei'
  const ether = Number(value) / 1e18
  return ether >= 0.000001 ? `${value} wei (${ether} ETH)` : `${value} wei`
}
