import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), 'VITE_')

  // Base URL of the esm.sh that serves GitHub-hosted decoders — must match the
  // default in src/decoder/github.ts. Override with VITE_ESM_BASE.
  const esmBase = (env.VITE_ESM_BASE || 'https://esm.sh').replace(/\/+$/, '')

  // A GitHub-hosted decoder imports the kit as a bare `@deroll/decoder` and
  // is served by esm.sh with that import left external (see github.ts). This
  // import map resolves that bare specifier to the kit's own GitHub source on
  // esm.sh, so a kit-using decoder needs nothing published to a registry.
  // Pinned to a commit — esm.sh resolves floating refs like a branch name at
  // request time and intermittently fails doing so, taking every kit-using
  // decoder down with it. Bump the sha when packages/explorer/decoder changes.
  // Relocate or re-pin with VITE_KIT_URL.
  const kitUrl = env.VITE_KIT_URL || `${esmBase}/gh/tuler/deroll@dd6d84d/packages/explorer/decoder/src/index.ts`
  const importMap = JSON.stringify({ imports: { '@deroll/decoder': kitUrl } })

  return {
    // BASE_PATH is set by the GitHub Pages workflow (e.g. /luke/); defaults to / for local dev.
    base: process.env.BASE_PATH || '/',
    plugins: [
      react(),
      tailwindcss(),
      {
        name: 'decoder-kit-import-map',
        transformIndexHtml: () => [
          { tag: 'script', attrs: { type: 'importmap' }, children: importMap, injectTo: 'head-prepend' },
        ],
      },
    ],
  }
})
