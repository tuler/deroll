# @tuler/luke-decoder

A small, dependency-free TypeScript toolkit for writing [Cartesi Node Explorer](../../README.md#payload-decoders) payload decoders. It gives you:

- **A fully typed contract** — [`src/types.ts`](src/types.ts) defines `Decoder`, `DecodeContext`, `DecodeResult` and the API record types. The explorer re-exports these same types internally, so the `context.record` your decoder receives is exactly the API record you see in the types. `DecodeContext` is discriminated by `kind`, so narrowing on `context.kind` narrows `context.record` to `Input`, `Output` or `Report`.
- **Standard portal decoding** — [`src/portals.ts`](src/portals.ts) decodes the canonical Cartesi portal deposit messages (Ether, ERC-20, ERC-721, ERC-1155). Asset deposits are identical across every application, so you call `decodePortalInput()` instead of reimplementing the layout.
- **Byte helpers** — [`src/bytes.ts`](src/bytes.ts) provides a big-endian `ByteReader`, `formatUnits`, `toUtf8` and friends for reading packed payloads.

## Writing a decoder

```ts
import { type Decoder, decodePortalInput, ByteReader, formatUnits } from '@tuler/luke-decoder'

export const version = 1
export const name = 'My decoder'

export const decode: Decoder['decode'] = (payload, context) => {
  if (context.kind !== 'input') return null

  // Standard, shared across every app: a deposit from a known portal sender.
  const deposit = decodePortalInput(payload, context)
  if (deposit) return deposit

  // Your application's own messages.
  const r = new ByteReader(payload)
  // …read fields, return { summary, data }, or null when not recognized…
}
```

Return `null`/`undefined` (or throw) when a payload isn't recognized — the explorer falls back to its hex/UTF-8 view.

[`../perp-dex-decoder`](../perp-dex-decoder) is a complete worked example package.

## Loading from GitHub source (no publish)

The simplest way to share a decoder is to skip packaging and point the explorer at its TypeScript source on GitHub — register the file's `github.com` URL or a `gh:owner/repo@ref/path.ts` shorthand on the application's **Overview** page. The explorer routes it through [esm.sh](https://esm.sh), which transpiles the source on the fly. The decoder's `import … from '@tuler/luke-decoder'` needs **nothing published**: the explorer supplies this kit via an import map pointing at its own GitHub source (see the [explorer README](../../README.md#from-a-github-source-no-publish)), so kit-using decoders work even in production over public esm.sh. The repo must be public.

## Distributing as a package

To ship a decoder as a versioned package instead of from source, publish it to npm (or any registry) and serve it through a public [esm.sh](https://esm.sh)-style CDN — esm.sh resolves and bundles its dependencies (including `@tuler/luke-decoder`) on the fly. Register the resulting URL on the application's **Overview** page; esm.sh serves it with CORS enabled. Alternatively, bundle the decoder to a single self-contained `.js` (`bun build my-decoder.ts --target=browser --format=esm --outfile=my-decoder.js`) and host that file directly.

This kit itself is published to npm as [`@tuler/luke-decoder`](https://www.npmjs.com/package/@tuler/luke-decoder); see the [explorer README](../../README.md#publishing-the-kit-to-npm) for the changesets release flow.

## Portal addresses

`PORTAL_ADDRESSES` are the deterministic Cartesi Rollups **v2** deployments (identical across chains for a given Rollups version), sourced from `@cartesi/viem` and the rollups-node address book. Apps on the older v1 (sunodo) deployment used different portal addresses.
