---
"@deroll/cmio": minor
"@deroll/create-app": patch
---

Target libcmt 0.18.0 (machine-guest-tools `v0.18.0`). The binding's public JavaScript API is unchanged; the upgrade is internal and to the build:

- `HTIF_YIELD_REASON_ADVANCE`/`HTIF_YIELD_REASON_INSPECT` were renamed to `HTIF_YIELD_REASON_ADVANCE_STATE`/`HTIF_YIELD_REASON_INSPECT_STATE` in libcmt; the addon's request dispatch in `finish()` follows the rename.
- libcmt now bundles the `cmio` ioctl ABI (`include/libcmt/ioctl.h`) instead of including `<linux/cartesi/cmio.h>`, so cross-building the linux-riscv64 prebuild no longer needs the Cartesi Linux headers. The `linux-libc-dev-riscv64-cross` install was dropped from CI, the release workflow and `test/machine/Dockerfile.prebuild`.
- The mock IO driver writes the outputs Merkle root to `<input>.outputs_merkle_root<ext>` (was `<input>.outputs_root_hash<ext>`), matching the terminology used by rollups-contracts and the machine emulator. Only affects test harnesses that read that file directly.
- The riscv64 end-to-end machine test now boots the v0.21.0 Cartesi kernel (6.5.13-ctsi-2) with machine-guest-tools `v0.18.0`, matching what the submodule targets.
- `create-app`'s generated Dockerfile installs machine-guest-tools 0.18.0.
