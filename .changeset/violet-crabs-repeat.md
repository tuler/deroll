---
"@deroll/decoder": minor
---

Redesign the decoder contract around the JSON-RPC API and richer results:

- The API record types (`Input`, `Output`, `Report`, `Withdrawal`, `Notice`, `Voucher`, `DelegateCallVoucher`, `Address`, `Hash`, `Hex`, `HexNumber`) are now re-exported from `@cartesi/rpc` — the typed client for the node's JSON-RPC API and the source of truth for what the node serves — instead of being hand-duplicated. The dependency is type-only; the built module stays dependency-free. `Output["decoded_data"]` is now the properly discriminated `Notice | Voucher | DelegateCallVoucher` union.
- The contract now names exactly which application-defined raw bytes each call decodes, and covers all of them: new `withdrawal-account` and `withdrawal-output` payload kinds expose the `Withdrawal.account` / `Withdrawal.output` bytes (defined by the app's `WithdrawalOutputBuilder`, opaque to the node) alongside the existing `input`, `output` and `report` kinds. Decoders declare `version = 2` to receive the withdrawal kinds; version-1 decoders keep working and are never called for them. The old type names remain available as deprecated aliases (`EvmAdvance`, `DecodedOutput`, `HexUint`, `ByteArray`, `FunctionSelector`).
- `DecodeResult` gains `tags` — colored tags/pills (`{ label, color?, title? }` with a fixed theme-aware color palette, or bare strings) rendered by the explorer next to the summary in tables and detail views. `decodePortalInput()` now returns deposit/asset tags, and the new `portalDepositTags()` helper builds them from a decoded deposit.
