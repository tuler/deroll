---
"@deroll/rollup": minor
---

Initial release: Cartesi Machine rollup binding with the libcmt protocol (ABI framing, keccak-256, outputs merkle tree, finish/accept semantics and the file-based mock driver) implemented in pure JavaScript. The only native code is a minimal shim for the ioctl+mmap contract of /dev/cmio, built only on riscv64; on the host the package needs no toolchain or prebuilds.
