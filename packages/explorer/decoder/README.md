# @deroll/decoder

A small TypeScript toolkit for writing [Cartesi Node Explorer](https://explorer.deroll.dev) payload decoders.

## What a decoder decodes

The rollups node serves several **raw-bytes fields whose encoding is defined by the application**, not by the protocol. The explorer cannot render those beyond hex/UTF-8 on its own — a decoder registered for the application turns them into a readable summary, colored tags and structured data. A decoder exports **one method per payload source it understands** (all optional); each method receives the full API record:

| method | record | bytes decoded |
| --- | --- | --- |
| `input` | `Input` | `input.decoded_data.payload` — the advance payload sent by the user (for deposits, the portal message) |
| `output` | `Output` | `output.decoded_data.payload` — the payload of a Notice, Voucher or DelegateCallVoucher |
| `report` | `Report` | `report.raw_data` — the full report body (inspect responses, error messages, …) |
| `withdrawalAccount` | `Withdrawal` | `withdrawal.account` — the account encoding produced by the app's `WithdrawalOutputBuilder` (opaque to the node) |
| `withdrawalOutput` | `Withdrawal` | `withdrawal.output` — the raw output blob emitted for that account |

An exported method is also the capability signal: the explorer only calls what you export and falls back to its hex/UTF-8 view for everything else, so new payload sources added to the contract later are simply methods you don't have yet.

Everything else the node serves (hashes, indices, proofs, tournament data, …) is protocol-defined and rendered by the explorer itself; decoders are never called for those.

## What the kit gives you

- **A fully typed contract** — [`src/types.ts`](src/types.ts) defines `Decoder` (the per-method interface), `DecodeContext` and `DecodeResult`. The API record types (`Input`, `Output`, `Report`, `Withdrawal`, …) are re-exported verbatim from [`@cartesi/rpc`](https://cartesi.github.io/rollups-ts), the typed client for the node's JSON-RPC API — that package is the source of truth, and the explorer re-exports these same types internally, so the record your method receives is exactly the API record you see.
- **Standard portal decoding** — [`src/portals.ts`](src/portals.ts) decodes the canonical Cartesi portal deposit messages (Ether, ERC-20, ERC-721, ERC-1155). Asset deposits are identical across every application, so you call `decodePortalInput(input)` instead of reimplementing the layout.
- **Byte helpers** — [`src/bytes.ts`](src/bytes.ts) provides a big-endian `ByteReader`, `formatUnits`, `toUtf8` and friends for reading packed payloads.

The `@cartesi/rpc` dependency is **type-only**: the built module stays dependency-free and adds nothing to your bundle.

## What a decode method returns

Each method receives `(record, context)` — `context` is `{ application, chainId? }` — and returns a `DecodeResult`, every field optional:

- `summary` — one human-readable line, shown in table cells.
- `tags` — colored tags/pills shown alongside the summary, in tables and the detail view. Each tag is `{ label, color?, title? }` (or a bare string for a gray tag); `color` is one of `gray | blue | cyan | indigo | violet | pink | green | amber | red`, mapped by the explorer to theme-aware styles. Use tags for short categorical facts: the message kind (`transfer`), the asset (`ERC-20`), a severity (`error`).
- `data` — structured value for the detail view: a string renders as text, objects/arrays as JSON.

Return `null`/`undefined` (or throw) when a payload isn't recognized — the explorer falls back to its hex/UTF-8 view.

## Writing a decoder

```ts
import { type InputDecoder, type ReportDecoder, decodePortalInput, ByteReader, formatUnits } from '@deroll/decoder'

export const version = 1
export const name = 'My decoder'

export const input: InputDecoder = (input, context) => {
  // Standard, shared across every app: a deposit from a known portal sender.
  // Comes back with summary, deposit/asset tags, and the structured deposit.
  const deposit = decodePortalInput(input)
  if (deposit) return deposit

  // Your application's own messages.
  const r = new ByteReader(input.decoded_data?.payload ?? '0x')
  const action = r.u8()
  if (action === 1) {
    return {
      summary: `transfer ${formatUnits(r.u256(), 18)} to ${r.address()}`,
      tags: [{ label: 'transfer', color: 'blue' }],
      data: { action: 'transfer' /* … */ },
    }
  }
  return null // not recognized → explorer shows hex/UTF-8
}

export const report: ReportDecoder = (report) => {
  // …decode report.raw_data…
  return null
}
```

Each method has a named type — `InputDecoder`, `OutputDecoder`, `ReportDecoder`, `WithdrawalAccountDecoder`, `WithdrawalOutputDecoder` — and the `Decoder` interface types a whole module.

## Loading from GitHub source (no publish)

The simplest way to share a decoder is to skip packaging and point the explorer at its TypeScript source on GitHub — register the file's `github.com` URL or a `gh:owner/repo@ref/path.ts` shorthand on the application's **Overview** page. The explorer routes it through [esm.sh](https://esm.sh), which transpiles the source on the fly. The decoder's `import … from '@deroll/decoder'` needs **nothing published**: the explorer supplies this kit via an import map pointing at its own GitHub source, so kit-using decoders work even in production over public esm.sh. The repo must be public.

## Distributing as a package

To ship a decoder as a versioned package instead of from source, publish it to npm (or any registry) and serve it through a public [esm.sh](https://esm.sh)-style CDN — esm.sh resolves and bundles its dependencies (including `@deroll/decoder`) on the fly. Register the resulting URL on the application's **Overview** page; esm.sh serves it with CORS enabled. Alternatively, bundle the decoder to a single self-contained `.js` (`bun build my-decoder.ts --target=browser --format=esm --outfile=my-decoder.js`) and host that file directly.

This kit itself is published to npm as [`@deroll/decoder`](https://www.npmjs.com/package/@deroll/decoder).

## Portal addresses

`PORTAL_ADDRESSES_V2`/`PORTAL_ADDRESSES_V3` are the deterministic Cartesi Rollups **v2**/**v3** deployments (identical across chains for a given Rollups version), sourced from `@cartesi/viem` and the rollups-node address book. Apps on the older v1 (sunodo) deployment used different portal addresses.
