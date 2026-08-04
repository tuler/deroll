---
"@deroll/genext2fs": minor
---

Add `@deroll/genext2fs` — Node.js bindings for [xgenext2fs](https://github.com/cartesi/genext2fs), the ext2 filesystem generator, so a tar archive can be turned into a drive image from inside a Node process.

`tarToExt2(tar, output, options)` is the main entry point; `tarToExt2Buffer`, `createImage` (arbitrary layers), and `genext2fs(args)` (raw argv) cover the rest, each with a blocking counterpart. Options map one to one onto the CLI flags, errors carry the tool's own diagnostics, and gzipped archives are inflated transparently.

Both upstream projects are vendored as git submodules and compiled unmodified into the addon: `cartesi/genext2fs` at `v1.5.6`, plus the 16 translation units of `libarchive` `v3.8.9` needed to read a tar. Neither build system runs — hand-written `config.h` files under `config/` replace the generated ones — so the addon links against nothing but libc.

Note this package is GPL-2.0-only, inherited from xgenext2fs, unlike the Apache-2.0 packages around it.
