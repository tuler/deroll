---
"@deroll/cm": minor
---

Target cartesi-machine 0.21 (currently the v0.21.0-test7 pre-release). Breaking changes follow the emulator's new C API:

- `sendCmioResponse` and `logSendCmioResponse` take a revert root hash (defaults to the machine's current root hash, which is what the emulator requires for advance-state responses); `verifySendCmioResponse` requires it as its first argument.
- The verify functions (`verifyStep`, `verifyStepUarch`, `verifyResetUarch`, `verifySendCmioResponse`) now return the obtained root hash after the operation as a `Buffer`, and `rootHashAfter` became an optional check.
- `CmioYieldCommand`/`CmioYieldReason` renamed to `HtifYieldCommand`/`HtifYieldReason` (matching the `CM_CMIO_YIELD_*` → `CM_HTIF_YIELD_*` rename in `cm.h`).
- `ErrorCode` renumbered: `RegexError` and `SystemError` removed, codes after `UnderflowError` shifted up by 2.
- `BreakReason` gained `McycleOverflow`; `UarchBreakReason` members renamed to `ReachedTargetUarchCycle`/`UarchCycleOverflow`.
- `Reg` gained `Imcyclemax`, shifting device/uarch register values by one; `UarchHaltFlag` renamed to `UarchHalt`.
- New machine methods: `readRevertRootHash`, `writeRevertRootHash`, `getAddressName`, `isJsonrpcMachine`, `syncStored`.
- Config types: `nvram` machine config, `label` on memory ranges, `dpt_filename` backing store, richer `AddressRangeDescription` attributes, uarch `halt` register (formerly `halt_flag`), and new constants (`PmaDriverId`, HTIF device/yield constants, rollup limits).
- The native addon now builds against the renamed `cm.h`/`cm-jsonrpc.h` headers and requires an installed cartesi-machine 0.21.x distribution.
