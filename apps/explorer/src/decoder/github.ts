// Turn a GitHub reference to a decoder's source into a URL the browser can
// import(). esm.sh's /gh/ route fetches a .ts/.tsx file straight from a GitHub
// repo, transpiles it, and resolves its bare imports (e.g. @deroll/decoder)
// from its configured npm registry — so a decoder can be loaded from source,
// with no build or publish step. Gists are git repos too: codeload serves them
// under the `gist` pseudo-owner, so the same /gh/ route handles gist files as
// /gh/gist/<id>@<rev>/<file>. Defaults to the public esm.sh; override with
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

function gistUrl(base: string, id: string, rev: string | undefined, path: string): string {
  const ref = rev ? `@${rev}` : ''
  return withKitExternal(`${base}/gh/gist/${id}${ref}/${path.replace(/^\/+/, '')}`)
}

/** A gist page's per-file anchor (`#file-my-decoder-ts`) for a filename. */
function gistFileAnchor(filename: string): string {
  return `file-${filename.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`
}

/**
 * Find the decoder's filename in a gist via the (CORS-enabled, unauthenticated)
 * gists API: the file the page URL's #file- anchor points at, or the gist's
 * only file, or its only script file.
 */
async function resolveGistFilename(id: string, rev: string | undefined, anchor: string | undefined): Promise<string> {
  const res = await fetch(`https://api.github.com/gists/${id}${rev ? `/${rev}` : ''}`)
  if (!res.ok) {
    throw new Error(
      res.status === 404
        ? 'Gist not found — check the URL (secret gists work, but the gist must exist).'
        : `Failed to look up the gist (GitHub API returned ${res.status}).`,
    )
  }
  const gist = (await res.json()) as { files?: Record<string, unknown> }
  const files = Object.keys(gist.files ?? {})
  if (anchor) {
    const match = files.find((f) => gistFileAnchor(f) === anchor.toLowerCase())
    if (match) return match
    throw new Error(`The gist has no file matching #${anchor}.`)
  }
  if (files.length === 1) return files[0]
  const scripts = files.filter((f) => /\.(?:ts|tsx|mts|js|mjs|jsx)$/i.test(f))
  if (scripts.length === 1) return scripts[0]
  throw new Error(
    'The gist has several files — pick one by opening it on gist.github.com and copying the link with its #file-… anchor, or the file\'s "Raw" URL.',
  )
}

/**
 * Normalize a decoder reference into a URL the browser can import().
 *
 * GitHub references are rewritten to the esm.sh /gh/ route so a decoder's
 * TypeScript source can be loaded straight from a repo or gist — no build or
 * publish step. Recognized forms:
 *
 *   https://github.com/<owner>/<repo>/blob/<ref>/<path>           (file page)
 *   https://github.com/<owner>/<repo>/raw/<ref>/<path>
 *   https://raw.githubusercontent.com/<owner>/<repo>/<ref>/<path> (Raw button)
 *   gh:<owner>/<repo>@<ref>/<path>  ·  github:<owner>/<repo>@<ref>/<path>
 *
 *   https://gist.github.com/<owner>/<id>[/<rev>][#file-…]         (gist page)
 *   https://gist.githubusercontent.com/<owner>/<id>/raw/[<rev>/]<file>
 *   gist:<id>[@<rev>]/<file>
 *
 * A gist page URL names no file, so the filename is resolved through the
 * gists API (the #file- anchor, the only file, or the only script file).
 * Any other http(s) URL (an esm.sh package URL, a self-hosted .js, …) is
 * returned unchanged, so already-registered decoders keep working.
 */
export async function resolveDecoderImportUrl(input: string, esmBase: string = ESM_BASE): Promise<string> {
  const ref = input.trim()

  // Shorthand — already esm.sh's own gh syntax (owner/repo@ref/path), just
  // needs the host prepended.
  const short = /^(?:gh|github):\/*(.+)$/i.exec(ref)
  if (short) return withKitExternal(`${esmBase}/gh/${short[1].replace(/^\/+/, '')}`)

  // Gist shorthand — gist:<id>[@rev]/<file>, tolerating an <owner>/ prefix
  // (the id alone identifies a gist).
  const gistShort = /^gist:\/*(?:[\w-]+\/)?([0-9a-f]+)(?:@([0-9a-f]+))?\/(.+)$/i.exec(ref)
  if (gistShort) return gistUrl(esmBase, gistShort[1], gistShort[2], gistShort[3])

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

  if (url.hostname === 'gist.github.com' || url.hostname === 'gist.githubusercontent.com') {
    // Per-file "Raw" URL — /<owner>/<id>/raw/[<rev>/]<file>. A 40-hex first
    // segment after /raw/ is the revision pin the Raw button includes.
    const raw = /^\/[^/]+\/([0-9a-f]+)\/raw\/(?:([0-9a-f]{40})\/)?(.+)$/i.exec(url.pathname)
    if (raw) return gistUrl(esmBase, raw[1], raw[2], raw[3])

    // Gist page — /<owner>/<id>[/<rev>] (the owner may be missing in old
    // links; gist ids are unique on their own).
    const page = /^\/(?:[\w-]+\/)?([0-9a-f]+)(?:\/([0-9a-f]{40}))?\/?$/i.exec(url.pathname)
    if (page) {
      const anchor = /^#(file-.+)$/.exec(url.hash)?.[1]
      const filename = await resolveGistFilename(page[1], page[2], anchor)
      return gistUrl(esmBase, page[1], page[2], filename)
    }
  }

  return ref
}
