// Turn a GitHub reference to a decoder's source into a URL the browser can
// import(). esm.sh's /gh/ route fetches a .ts/.tsx file straight from a GitHub
// repo, transpiles it, and resolves its bare imports (e.g. @deroll/decoder)
// from its configured npm registry — so a decoder can be loaded from source,
// with no build or publish step. Defaults to the public esm.sh; override with
// VITE_ESM_BASE.

const DEFAULT_ESM_BASE = 'https://esm.sh'

/** Base URL of the esm.sh that serves GitHub-hosted decoders. */
export const ESM_BASE = String(import.meta.env.VITE_ESM_BASE ?? DEFAULT_ESM_BASE).replace(/\/+$/, '')

/** Drop the `refs/heads/` or `refs/tags/` prefix GitHub's "Raw" links carry. */
function cleanRef(ref: string): string {
  return ref.replace(/^refs\/(?:heads|tags)\//, '')
}

/**
 * Split `<ref>/<path…>`, where <ref> may be the multi-segment
 * `refs/heads/<branch>` / `refs/tags/<tag>` form that raw.githubusercontent.com
 * uses. Returns the cleaned ref and the remaining file path.
 */
function splitRefAndPath(rest: string): { ref: string; path: string } | null {
  const refs = /^(refs\/(?:heads|tags)\/[^/]+)\/(.+)$/.exec(rest)
  if (refs) return { ref: cleanRef(refs[1]), path: refs[2] }
  const m = /^([^/]+)\/(.+)$/.exec(rest)
  return m ? { ref: m[1], path: m[2] } : null
}

// The kit is provided by the explorer through an import map (see vite.config.ts),
// so esm.sh is told to leave the bare `@deroll/decoder` import alone rather
// than resolve it from npm. That import map points it at the kit's own GitHub
// source — which is what lets a kit-using decoder load from a repo with nothing
// published to a registry.
const KIT_SPECIFIER = '@deroll/decoder'

function withKitExternal(url: string): string {
  return `${url}${url.includes('?') ? '&' : '?'}external=${KIT_SPECIFIER}`
}

function ghUrl(base: string, owner: string, repo: string, ref: string, path: string): string {
  return withKitExternal(`${base}/gh/${owner}/${repo}@${ref}/${path.replace(/^\/+/, '')}`)
}

/**
 * Normalize a decoder reference into a URL the browser can import().
 *
 * GitHub references are rewritten to the esm.sh /gh/ route so a decoder's
 * TypeScript source can be loaded straight from a repo — no build or publish
 * step. Recognized forms:
 *
 *   https://github.com/<owner>/<repo>/blob/<ref>/<path>           (file page)
 *   https://github.com/<owner>/<repo>/raw/<ref>/<path>
 *   https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path> (Raw button)
 *   gh:<owner>/<repo>@<ref>/<path>  ·  github:<owner>/<repo>@<ref>/<path>
 *
 * Any other http(s) URL (an esm.sh package URL, a self-hosted .js, …) is
 * returned unchanged, so already-registered decoders keep working.
 */
export function resolveDecoderImportUrl(input: string, esmBase: string = ESM_BASE): string {
  const ref = input.trim()

  // Shorthand — already esm.sh's own gh syntax (owner/repo@ref/path), just
  // needs the host prepended.
  const short = /^(?:gh|github):\/*(.+)$/i.exec(ref)
  if (short) return withKitExternal(`${esmBase}/gh/${short[1].replace(/^\/+/, '')}`)

  let url: URL
  try {
    url = new URL(ref)
  } catch {
    return ref // not a URL we can parse — let import() surface the error
  }

  if (url.hostname === 'github.com') {
    const m = /^\/([^/]+)\/([^/]+)\/(?:blob|raw)\/(.+)$/.exec(url.pathname)
    if (m) {
      const parts = splitRefAndPath(m[3])
      if (parts) return ghUrl(esmBase, m[1], m[2], parts.ref, parts.path)
    }
  }

  if (url.hostname === 'raw.githubusercontent.com') {
    const m = /^\/([^/]+)\/([^/]+)\/(.+)$/.exec(url.pathname)
    if (m) {
      const parts = splitRefAndPath(m[3])
      if (parts) return ghUrl(esmBase, m[1], m[2], parts.ref, parts.path)
    }
  }

  return ref
}
