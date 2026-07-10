import { useQuery } from '@tanstack/react-query'
import { useChainId } from '../api/hooks'
import { hexToBigInt } from '../lib/format'
import { loadDecoder } from './loader'
import { useDecoderUrl } from './registry'
import type { DecodeResult, PayloadKind } from './types'

/** Identifies a payload for decoding; passed through to the registered decoder. */
export interface DecodeProps {
  /** Application contract address (not the route param, which may be a name). */
  application: string
  /** Payload source — also the name of the decoder method to call. */
  kind: PayloadKind
  /** Full API record (Input, Output, Report or Withdrawal) the bytes belong to. */
  record: unknown
}

export interface DecodedPayload {
  /** 'off' when nothing applies: no decoder registered or empty payload. */
  status: 'off' | 'loading' | 'decoded' | 'failed'
  result?: DecodeResult
  /** Set when the module failed to load or decode() threw; a null return is silent. */
  error?: Error
}

/** Runs the application's registered decoder (if any) over a payload. */
export function useDecodedPayload(payload?: string | null, props?: DecodeProps): DecodedPayload {
  const url = useDecoderUrl(props?.application)
  const chainId = hexToBigInt(useChainId().data?.data)
  const enabled = !!url && !!props && !!payload && payload !== '0x'

  const query = useQuery<DecodeResult | null>({
    queryKey: ['decode', url, props?.kind, payload],
    queryFn: async () => {
      const decoder = await loadDecoder(url!)
      const { kind, application, record } = props!
      const context = {
        application: application.toLowerCase(),
        chainId: chainId === null ? undefined : Number(chainId),
      }
      // An exported method is the capability signal: only call what the
      // decoder declares, and fall back to the hex/UTF-8 view otherwise.
      const method = decoder[kind]
      if (!method) return null
      // Cast: kind is a runtime value and record is unknown here, so the
      // per-method record type can't be proven, though the shape is correct.
      const result = await (method as (r: unknown, c: typeof context) => unknown)(record, context)
      return (result ?? null) as DecodeResult | null
    },
    enabled,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  })

  if (!enabled) return { status: 'off' }
  if (query.isPending) return { status: 'loading' }
  if (query.error) return { status: 'failed', error: query.error }
  if (query.data === null) return { status: 'failed' }
  return { status: 'decoded', result: query.data }
}
