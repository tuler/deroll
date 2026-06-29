// deno-fmt-ignore-file
// biome-ignore format: generated types do not need formatting
// prettier-ignore
import type { PathsForPages } from 'waku/router'

// prettier-ignore
type Page =
  | { path: '/api'; render: 'static' }
  | { path: '/building'; render: 'static' }
  | { path: '/getting-started'; render: 'static' }
  | { path: '/'; render: 'static' }
  | { path: '/testing'; render: 'static' }

// prettier-ignore
declare module 'waku/router' {
  interface RouteConfig {
    paths: PathsForPages<Page>
  }
  interface CreatePagesConfig {
    pages: Page
  }
}
