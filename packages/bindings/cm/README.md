# @deroll/cm

Node.js bindings for the [Cartesi Machine](https://github.com/cartesi/machine-emulator) emulator.

The package is a native N-API addon: `libcartesi` (and the JSON-RPC client, `libcartesi_jsonrpc`) are compiled from the `machine-emulator` sources vendored as a git submodule at `deps/machine-emulator`, so no system-wide emulator installation is required. The build also produces the `cartesi-jsonrpc-machine` server executable, which `spawn()` uses automatically (override with the `CARTESI_JSONRPC_MACHINE` environment variable).

## Prebuilt platform packages

Published releases ship prebuilt binaries as per-platform packages (`@deroll/cm-linux-x64`, `@deroll/cm-linux-arm64`, `@deroll/cm-darwin-x64`, `@deroll/cm-darwin-arm64`), declared as `optionalDependencies` so the package manager installs only the one matching the host. Each contains the N-API addon **and** the `cartesi-jsonrpc-machine` server executable, so `spawn()` works without any toolchain. Resolution order at runtime: a local source build (`build/Release`) wins, then the platform package, and the server binary falls back to the `PATH`.

The `optionalDependencies` are injected at publish time (`scripts/inject-platform-deps.mjs`); the platform packages are assembled per-platform in CI (`scripts/package-platform.mjs`) and published by `scripts/publish-platform-packages.mjs` right before `@deroll/cm` itself.

## Build requirements

On platforms without a prebuilt package, the install script compiles from source, which requires:

- a C++23 compiler (gcc 13+ or clang 16+ / Xcode 15+)
- Boost headers (`libboost-dev` on Debian/Ubuntu, `brew install boost` on macOS; the usage is header-only, nothing is linked). Set `BOOST_INC` if they live in a non-standard location.
- the `deps/machine-emulator` submodule checked out (`git submodule update --init`) when building from a git checkout; the npm tarball already contains the needed sources.

## Generated files (`gen/`)

The emulator build normally generates a few files that are committed here so consumers never need a RISC-V toolchain:

- `uarch-pristine-ram.c` — generated from the **official** `uarch-ram.bin` shipped in the `cartesi/machine-emulator` 0.20.0 release. These bytes are consensus-relevant (they are part of the machine root hash) and must never be rebuilt with a different toolchain.
- `uarch-pristine-hash.c` — computed from the RAM image above with the emulator's `compute-uarch-pristine-hash` tool, and cross-checked against the hash embedded in the official release binaries.
- `machine-c-version.h`, `interpret-jump-table.h`, `jsonrpc-discover.cpp` — deterministically generated from the submodule sources (`make -C src machine-c-version.h interpret-jump-table.h`, plus the `jsonrpc-discover.cpp` recipe in `src/Makefile`).

When bumping the submodule to a new emulator version, regenerate all of them (the uarch files from the matching release artifacts, e.g. the `add-generated-files.diff` release asset).

## Usage

```typescript
import { create, load, rollups, spawn } from "@deroll/cm";

// local machine
const machine = create({ ram: { length: 0x4000000 } });
machine.run(1000n);

// remote machine (spawns the bundled cartesi-jsonrpc-machine server)
const remote = spawn();
remote.load("path/to/snapshot");

// rollups machine
const machine = rollups("path/to/snapshot");
const { outputs, reports } = machine.advance(input, { collect: true });
```

## Scripts

```shell
bun run build             # bundle the TypeScript layer (tsup)
bun run build:native      # rebuild the native addon (node-gyp rebuild)
bun run package:platform  # assemble npm/<platform>-<arch> prebuilt package
bun run test:integration
```

## License

Licensed under [Apache-2](./LICENSE). The vendored machine-emulator sources are licensed under [LGPL-3.0-or-later](./deps/machine-emulator/COPYING); the addon compiles and statically links them, and the full corresponding source is included in the published package.
