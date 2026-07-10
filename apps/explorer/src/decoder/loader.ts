import { resolveDecoderImportUrl } from './github'
import type { Decoder, DecoderModule, PayloadKind } from './types'

const DECODE_METHODS: PayloadKind[] = [
  'input',
  'output',
  'report',
  'withdrawalAccount',
  'withdrawalOutput',
]

// One in-flight or resolved import per URL; failed loads are forgotten so a
// retry after fixing the URL or its CORS setup works.
const cache = new Map<string, Promise<DecoderModule>>()

export function loadDecoder(url: string): Promise<DecoderModule> {
  let promise = cache.get(url)
  if (!promise) {
    promise = importDecoder(url)
    promise.catch(() => cache.delete(url))
    cache.set(url, promise)
  }
  return promise
}

async function importDecoder(url: string): Promise<DecoderModule> {
  // GitHub and gist references are rewritten to the esm.sh /gh/ route, which
  // serves the decoder's TypeScript source as a browser ES module; any other
  // URL is used as-is.
  const importUrl = await resolveDecoderImportUrl(url)
  let mod: Record<string, unknown>
  try {
    mod = (await import(/* @vite-ignore */ importUrl)) as Record<string, unknown>
  } catch (err) {
    throw new Error(
      'Failed to load the module — check that the URL serves an ES module and allows CORS.' +
        (err instanceof Error ? ` (${err.message})` : ''),
      { cause: err },
    )
  }
  // Named exports are the documented form; a default-exported object also works.
  return validateDecoderModule(typeof mod.version === 'number' ? mod : mod.default)
}

export function validateDecoderModule(mod: unknown): DecoderModule {
  const candidate = mod as
    | (Partial<Record<keyof Decoder, unknown>> & { version?: number })
    | null
    | undefined
  if (candidate?.version !== 1) {
    throw new Error(`Unsupported decoder version ${String(candidate?.version)} (expected 1).`)
  }
  // Decode methods are all optional — but a decoder exporting none is a mistake.
  if (!DECODE_METHODS.some((m) => typeof candidate[m] === 'function')) {
    throw new Error(`The module exports none of the decode methods (${DECODE_METHODS.join(', ')}).`)
  }
  return candidate as DecoderModule
}
