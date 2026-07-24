# @deroll/decoder

A small TypeScript toolkit for writing [Cartesi Node Explorer](https://explorer.deroll.dev) payload decoders.

## What a decoder decodes

The rollups node serves several **raw-bytes fields whose encoding is defined by the application**, not by the protocol. The explorer cannot render those beyond hex/UTF-8 on its own — a decoder registered for the application turns them into a readable summary, colored tags and structured data. A decoder exports **one method per payload source it understands** (all optional); each method receives the full API record:

| method | record | bytes decoded |
| --- | --- | --- |
| `input` | `Input` | `input.decodedData.payload` — the advance payload sent by the user. Never called for portal deposits: the explorer decodes those itself |
| `deposit` | `PortalDeposit` | the app-specific data attached to a portal deposit (`execLayerData`, and `baseLayerData` on the NFT portals). The deposit envelope — asset, amounts, sender — arrives already decoded |
| `output` | `Output` | `output.decodedData.payload` — the payload of a Notice, Voucher or DelegateCallVoucher |
| `report` | `Report` | `report.rawData` — the full report body (inspect responses, error messages, …) |
| `withdrawalAccount` | `Withdrawal` | `withdrawal.account` — the account encoding produced by the app's `WithdrawalOutputBuilder` (opaque to the node) |
| `withdrawalOutput` | `Withdrawal` | `withdrawal.output` — the raw output blob emitted for that account |

An exported method is also the capability signal: the explorer only calls what you export and falls back to its hex/UTF-8 view for everything else, so new payload sources added to the contract later are simply methods you don't have yet.

Everything else the node serves (hashes, indices, proofs, tournament data, …) is protocol-defined and rendered by the explorer itself; decoders are never called for those. **That includes the portal deposit envelope**: deposits are identical across every application (`InputEncoding.sol` in rollups-contracts), so the explorer recognizes them by sender and renders summary, tags and the structured deposit natively — with or without a registered decoder. Your `deposit` method only decodes the app-specific bytes riding inside, and its result is shown alongside the native deposit view.

## What the kit gives you

This package is **types-only** — the decoder contract and nothing else: [`src/types.ts`](src/types.ts) defines `Decoder` (the per-method interface), `DecodeContext`, `DecodeResult` and the `PortalDeposit` record the `deposit` method receives. The API record types (`Input`, `Output`, `Report`, `Withdrawal`, …) are re-exported verbatim from [`@cartesi/viem`](https://cartesi.github.io/rollups-ts), the typed toolkit for the node — that package is the source of truth, and the explorer re-exports these same types internally, so the record your method receives is exactly the API record you see.

All protocol decoding (the portal deposit envelope, portal addresses, …) lives in the explorer, not here. Being types-only, importing the kit adds nothing to a decoder's bundle.

## Batteries: viem

For the byte/ABI work itself, use [viem](https://viem.sh) — the blessed library for decoders. Import it bare and **don't bundle it**: the explorer serves viem to every decoder through its import map, pinned to the version the explorer itself uses (and leaves the import external when transpiling GitHub-hosted sources through esm.sh), so every decoder shares one vetted copy.

```ts
import { decodeAbiParameters, hexToString, formatUnits, slice } from 'viem'
```

If you bundle a decoder into a single self-contained `.js` yourself, mark `viem` (and `@deroll/decoder`) as external — or bundle viem in if you prefer; both work, the import map only applies to bare imports.

## What a decode method returns

Each method receives `(record, context)` — `context` is `{ application, chainId? }` — and returns a `DecodeResult`, every field optional:

- `summary` — one human-readable line, shown in table cells.
- `tags` — colored tags/pills shown alongside the summary, in tables and the detail view. Each tag is `{ label, color?, title? }` (or a bare string for a gray tag); `color` is one of `gray | blue | cyan | indigo | violet | pink | green | amber | red`, mapped by the explorer to theme-aware styles. Use tags for short categorical facts: the message kind (`transfer`), the asset (`ERC-20`), a severity (`error`).
- `data` — structured value for the detail view: a string renders as text, objects/arrays as JSON.

Return `null`/`undefined` (or throw) when a payload isn't recognized — the explorer falls back to its hex/UTF-8 view.

## Writing a decoder

```ts
import type { DepositDecoder, InputDecoder } from '@deroll/decoder'
import { decodeAbiParameters, formatUnits, hexToString } from 'viem'

export const version = 1
export const name = 'My decoder'

export const input: InputDecoder = (input, context) => {
  // Your application's own messages. Portal deposits never reach this
  // method — the explorer decodes those itself.
  if (!input.decodedData) return null
  const [action, amount] = decodeAbiParameters(
    [{ type: 'string' }, { type: 'uint256' }],
    input.decodedData.payload,
  )
  return {
    summary: `${action} · ${formatUnits(amount, 18)}`,
    tags: [{ label: action, color: 'blue' }],
    data: { action, amount },
  }
}

export const deposit: DepositDecoder = (deposit, context) => {
  // Only the app-specific data attached to a deposit; the envelope (asset,
  // amounts, sender) is already decoded and rendered by the explorer.
  if (!deposit.execLayerData) return null
  return {
    summary: hexToString(deposit.execLayerData),
    data: deposit.execLayerData,
  }
}
```

Each method has a named type — `InputDecoder`, `DepositDecoder`, `OutputDecoder`, `ReportDecoder`, `WithdrawalAccountDecoder`, `WithdrawalOutputDecoder` — and the `Decoder` interface types a whole module.

## Loading from GitHub source (no publish)

The simplest way to share a decoder is to skip packaging and point the explorer at its TypeScript source on GitHub — register the file's `github.com` URL or a `gh:owner/repo@ref/path.ts` shorthand on the application's **Overview** page. The explorer routes it through [esm.sh](https://esm.sh), which transpiles the source on the fly. The decoder's `import … from '@deroll/decoder'` needs **nothing published**: the explorer supplies this kit via an import map pointing at its own GitHub source, so kit-using decoders work even in production over public esm.sh. The repo must be public.

## Distributing as a package

To ship a decoder as a versioned package instead of from source, publish it to npm (or any registry) and serve it through a public [esm.sh](https://esm.sh)-style CDN — esm.sh resolves and bundles its dependencies (including `@deroll/decoder`) on the fly. Register the resulting URL on the application's **Overview** page; esm.sh serves it with CORS enabled. Alternatively, bundle the decoder to a single self-contained `.js` (`bun build my-decoder.ts --target=browser --format=esm --outfile=my-decoder.js`) and host that file directly.

This kit itself is published to npm as [`@deroll/decoder`](https://www.npmjs.com/package/@deroll/decoder).
