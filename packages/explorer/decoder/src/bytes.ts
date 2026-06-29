// Runtime helpers for reading packed binary payloads. All multi-byte integers
// are read big-endian, matching the EVM/ABI convention.

/** Convert a "0x…" hex payload to a byte array. */
export function toBytes(payload: string): Uint8Array {
  const hex = payload.startsWith('0x') ? payload.slice(2) : payload
  const bytes = new Uint8Array(hex.length / 2)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

/** True for a well-formed "0x"-prefixed byte string (even number of hex digits). */
export function isHex(payload: string): boolean {
  return /^0x([0-9a-fA-F]{2})*$/.test(payload)
}

/** Sequential big-endian reader over a byte array or "0x…" payload. */
export class ByteReader {
  readonly bytes: Uint8Array
  pos = 0

  constructor(source: Uint8Array | string) {
    this.bytes = typeof source === 'string' ? toBytes(source) : source
  }

  /** Bytes left to read. */
  get remaining(): number {
    return this.bytes.length - this.pos
  }

  /** Read an unsigned 8-bit integer. */
  u8(): number {
    return this.bytes[this.pos++]
  }

  /** Read an unsigned 16-bit big-endian integer. */
  u16(): number {
    return (this.bytes[this.pos++] << 8) | this.bytes[this.pos++]
  }

  /** Read an unsigned big-endian integer of `size` bytes as a bigint. */
  uint(size: number): bigint {
    let value = 0n
    for (let i = 0; i < size; i++) value = (value << 8n) | BigInt(this.bytes[this.pos++])
    return value
  }

  /** Read an unsigned 64-bit big-endian integer. */
  u64(): bigint {
    return this.uint(8)
  }

  /** Read an unsigned 256-bit big-endian integer. */
  u256(): bigint {
    return this.uint(32)
  }

  /** Read `size` bytes as a 0x-prefixed hex string. */
  hex(size: number): string {
    let out = '0x'
    for (let i = 0; i < size; i++) out += this.bytes[this.pos++].toString(16).padStart(2, '0')
    return out
  }

  /** Read the next 20 bytes as an address (lowercase 0x hex). */
  address(): string {
    return this.hex(20)
  }

  /** 0x-prefixed hex of the unread tail, or undefined when nothing is left. */
  rest(): string | undefined {
    return this.remaining > 0 ? this.hex(this.remaining) : undefined
  }
}

/**
 * Render `value / 10^decimals` as a decimal string, without floating-point
 * rounding. Trailing zeros in the fraction are trimmed.
 */
export function formatUnits(value: bigint, decimals: number | bigint): string {
  const d = BigInt(decimals)
  if (d <= 0n) return value.toString()
  const negative = value < 0n
  const abs = negative ? -value : value
  const scale = 10n ** d
  const integral = abs / scale
  const fraction = (abs % scale).toString().padStart(Number(d), '0').replace(/0+$/, '')
  const text = fraction === '' ? integral.toString() : `${integral}.${fraction}`
  return negative ? `-${text}` : text
}

/** Decode a byte array (or its tail) as UTF-8 text, or null when it is not valid UTF-8. */
export function toUtf8(source: Uint8Array | string): string | null {
  const bytes = typeof source === 'string' ? toBytes(source) : source
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
  } catch {
    return null
  }
}

/** Shorten an address/hash for display, e.g. "0x12345678…". */
export function shortHex(value: string, lead = 10): string {
  return value.length > lead ? `${value.slice(0, lead)}…` : value
}
