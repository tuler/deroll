import { useQuery } from '@tanstack/react-query'
import { useChainId } from '../api/hooks'
import { hexToBigInt } from '../lib/format'
import { loadDecoder } from './loader'
import { useDecoderUrl } from './registry'
import type { DecodeContext, DecodeResult, PayloadKind } from './types'

/** Identifies a payload for decoding; passed through to the registered decoder. */
export interface DecodeProps {
  /** Application contract address (not the route param, which may be a name). */
  application: string
  kind: PayloadKind
  /** Full API record (Input, Output or Report), forwarded to the decoder. */
  record?: unknown
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
      // Cast: kind is a runtime value and record is unknown here, so the
      // discriminated DecodeContext can't be proven, though the shape is correct.
      const context = {
        kind: props!.kind,
        application: props!.application.toLowerCase(),
        chainId: chainId === null ? undefined : Number(chainId),
        record: props!.record,
      } as DecodeContext
      const result = await decoder.decode(payload!, context)
      return result ?? null
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
