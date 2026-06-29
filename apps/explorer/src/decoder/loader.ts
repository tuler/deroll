import { resolveDecoderImportUrl } from './github'
import type { DecoderModule } from './types'

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
  // GitHub references are rewritten to the esm.sh /gh/ route, which serves the
  // decoder's TypeScript source as a browser ES module; any other URL is used
  // as-is.
  const importUrl = resolveDecoderImportUrl(url)
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
  return validateDecoderModule(typeof mod.decode === 'function' ? mod : mod.default)
}

export function validateDecoderModule(mod: unknown): DecoderModule {
  const candidate = mod as DecoderModule | null | undefined
  if (typeof candidate?.decode !== 'function') {
    throw new Error('The module does not export a decode() function.')
  }
  if (candidate.version !== 1) {
    throw new Error(`Unsupported decoder version ${String(candidate.version)} (expected 1).`)
  }
  return candidate
}
