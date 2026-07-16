---
"@deroll/cm": minor
---

Link the addon against the static libraries of the official machine-emulator distribution instead of compiling libcartesi from a vendored submodule. Source builds now require an installed emulator (the `machine-emulator` `.deb` on Debian/Ubuntu, `brew install cartesi-machine-emulator` on macOS; override locations with `CARTESI_INC`/`CARTESI_LIB`) instead of Boost headers and a C++23 compiler — and the consensus-relevant bits are exactly the official release binaries'. The machine-emulator submodule and the committed generated files are gone, keeping the binding independent of the emulator's build system. libslirp symbols referenced by the official library are stubbed out by default (no runtime dependency; virtio net-user fails at runtime) — build with `CARTESI_SLIRP=yes` to link the real library. Prebuilt platform packages bundle the distribution's `cartesi-jsonrpc-machine` server, so nothing changes for prebuild users.
