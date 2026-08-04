---
"@deroll/cm": minor
---

Target cartesi-machine 0.21.0. Breaking changes follow the emulator's new C API:

- `sendCmioResponse` takes an optional trailing revert root hash: required for advance-state responses (defaults to the machine's current root hash, the value the emulator checks for) and refused for other responses. `logSendCmioResponse` also takes it (defaulting to the current root hash), and `verifySendCmioResponse` requires it as its last argument.
- The verify functions (`verifyStep`, `verifyStepUarch`, `verifyResetUarch`, `verifySendCmioResponse`) no longer take `rootHashAfter`; they return the obtained root hash after the operation as a `Buffer`, for the caller to check.
- `CmioYieldCommand`/`CmioYieldReason` renamed to `HtifYieldCommand`/`HtifYieldReason` (matching the `CM_CMIO_YIELD_*` → `CM_HTIF_YIELD_*` rename in `cm.h`).
- `ErrorCode` renumbered: `RegexError` and `SystemError` removed, codes after `UnderflowError` shifted up by 2.
- `BreakReason` gained `McycleOverflow`; `UarchBreakReason` members renamed to `ReachedTargetUarchCycle`/`UarchCycleOverflow`.
- `Reg` gained `Imcyclemax`, shifting device/uarch register values by one; `UarchHaltFlag` renamed to `UarchHalt`.
- New machine methods: `readRevertRootHash`, `writeRevertRootHash`, `getAddressName`, `isJsonrpcMachine`, `renameStored`, `syncStored`.
- Machine config restructured: `clint`, `plic`, and `htif` moved into `processor.registers`, `iflags_X/Y/H` collapsed into an `iflags` object, `HTIFConfig` now holds the `ihalt`/`iconsole`/`iyield` registers, and uarch RAM lost its `length` field.
- Config types: `nvram` machine config, `label` on memory ranges, `dpt_filename` backing store, richer `AddressRangeDescription` attributes, uarch `halt` register (formerly `halt_flag`), and new constants (`PmaDriverId`, HTIF device/yield constants, rollup limits).
- The native addon now builds against the renamed `cm.h`/`cm-jsonrpc.h` headers and requires an installed cartesi-machine 0.21.x distribution.
