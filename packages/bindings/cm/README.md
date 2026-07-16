# @deroll/cm

Node.js bindings for the [Cartesi Machine](https://github.com/cartesi/machine-emulator) emulator.

The package is a native N-API addon linked against the static libraries (`libcartesi.a`, `libcartesi_jsonrpc.a`) of the official [machine-emulator](https://github.com/cartesi/machine-emulator) distribution. Prebuilt platform packages also bundle the distribution's `cartesi-jsonrpc-machine` server executable, which `spawn()` uses automatically (override with the `CARTESI_JSONRPC_MACHINE` environment variable).

## Prebuilt platform packages

Published releases ship prebuilt binaries as per-platform packages (`@deroll/cm-linux-x64`, `@deroll/cm-linux-arm64`, `@deroll/cm-darwin-x64`, `@deroll/cm-darwin-arm64`), declared as `optionalDependencies` so the package manager installs only the one matching the host. Each contains the N-API addon **and** the `cartesi-jsonrpc-machine` server executable, so `spawn()` works without any toolchain. Resolution order at runtime: a local source build (`build/Release`) wins, then the platform package, and the server binary falls back to the `PATH`.

The `optionalDependencies` are injected at publish time (`scripts/inject-platform-deps.mjs`); the platform packages are assembled per-platform in CI (`scripts/package-platform.mjs`) and published by `scripts/publish-platform-packages.mjs` right before `@deroll/cm` itself.

## Build requirements

On platforms without a prebuilt package, the install script compiles the addon from source, which requires:

- a C++ compiler and the usual node-gyp toolchain;
- an installed cartesi-machine emulator **0.20.x** distribution providing the C API headers and static libraries: the `machine-emulator` `.deb` from the [official releases](https://github.com/cartesi/machine-emulator/releases) on Debian/Ubuntu, or `brew install cartesi/tap/cartesi-machine-emulator` on macOS. Non-standard locations can be pointed at with the `CARTESI_INC` / `CARTESI_LIB` environment variables.

When no usable emulator installation is found, the install prints a warning and **skips** the native build instead of failing — type-only consumers and workspace siblings (docs, explorer) stay installable anywhere; loading the binding without it fails at require() time with a clear error.

Linking against the official static libraries (instead of compiling the emulator from source) keeps the binding independent of the emulator's build system, and means the consensus-relevant bits (uarch pristine state, hash tree) are exactly the official release's.

### slirp

The official `libcartesi.a` is built with libslirp support (virtio net-user networking). By default the addon stubs those symbols out, so it has no libslirp dependency and machines configured with a `net-user` virtio device fail at runtime. Build with `CARTESI_SLIRP=yes` to link the real libslirp instead.

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

The native build links against an installed emulator distribution (see build requirements above).

## License

Licensed under [Apache-2](./LICENSE). The machine-emulator static libraries the addon links against are licensed under LGPL-3.0-or-later; their source is available at [cartesi/machine-emulator](https://github.com/cartesi/machine-emulator), and the addon source shipped in this package allows relinking against a modified version.
