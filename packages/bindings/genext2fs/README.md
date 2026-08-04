# @deroll/genext2fs

Node.js bindings for [xgenext2fs](https://github.com/cartesi/genext2fs), the ext2
filesystem generator Cartesi uses to turn a root filesystem into a drive image.

The main use case is converting a tar archive into an ext2 image without leaving
the Node process — no `docker run`, no `xgenext2fs` on the `PATH`, no temporary
shell out:

```ts
import { tarToExt2 } from "@deroll/genext2fs";

await tarToExt2("rootfs.tar", "rootfs.ext2", {
    blockSize: 4096,
    faketime: true,
});
```

## Install

```sh
npm install @deroll/genext2fs
```

The addon is self-contained: it has no system dependencies beyond a C/C++
toolchain, so the install-time source build works anywhere `node-gyp` does.
Prebuilt binaries ship for linux and macOS on x64 and arm64.

## API

### `tarToExt2(tar, output, options?)`

Convert a tar archive into an ext2 image written to `output`. `tar` is a path or
the archive bytes; gzipped archives are inflated transparently. Resolves with the
diagnostics the tool produced (`{ stdout, stderr }`).

```ts
await tarToExt2(await readFile("rootfs.tar.gz"), "rootfs.ext2", {
    blockSize: 4096,
    sizeInBlocks: 65536, // 256 MiB
    volumeLabel: "rootfs",
    faketime: true,
});
```

### `tarToExt2Buffer(tar, options?)`

Same, but returns the image as a `Buffer`. xgenext2fs always writes to a file, so
this builds in a temporary directory and reads the result back — prefer
`tarToExt2` for images large enough that holding one in memory matters.

### `createImage(output, options?)`

The general form, for images assembled from more than one source. Layers are
applied in order, each optionally at a path inside the image:

```ts
await createImage("rootfs.ext2", {
    blockSize: 4096,
    layers: [
        { type: "tarball", path: "rootfs.tar" },
        { type: "directory", path: "./overlay", target: "/opt" },
        { type: "devtable", path: "./device_table.txt" },
    ],
});
```

### `genext2fs(args)`

The escape hatch: run xgenext2fs with a raw argument vector (without the program
name), exactly as the CLI would.

```ts
await genext2fs(["-f", "-B", "4096", "-a", "rootfs.tar", "rootfs.ext2"]);
```

Every function has a blocking counterpart (`tarToExt2Sync`, `createImageSync`,
`genext2fsSync`, …). The async ones generate the image off the main thread.

### Options

Each option maps onto one documented flag; see
[`xgenext2fs.8`](https://github.com/cartesi/genext2fs/blob/cartesi/xgenext2fs.8)
for the full descriptions.

| Option               | Flag | Meaning                                              |
| -------------------- | ---- | ---------------------------------------------------- |
| `blockSize`          | `-B` | filesystem block size: 1024 (default), 2048 or 4096  |
| `sizeInBlocks`       | `-b` | image size; computed from the content when omitted   |
| `numberOfInodes`     | `-N` | minimum inode count                                  |
| `bytesPerInode`      | `-i` | inode count derived from the size                    |
| `readjustment`       | `-r` | grow the computed size, e.g. `"+10%"`                |
| `volumeLabel`        | `-L` | volume label                                         |
| `reservedPercentage` | `-m` | reserved blocks; `0` also skips `lost+found`         |
| `creatorOs`          | `-o` | superblock creator OS                                |
| `blockMap`           | `-g` | write a block map per path, into the current dir      |
| `fillValue`          | `-e` | byte to fill unallocated blocks with                 |
| `allowHoles`         | `-z` | make files with holes                                |
| `faketime`           | `-f` | timestamp 0 everywhere, for reproducible output      |
| `squash`             | `-q` | squash ownership and permissions to this uid         |
| `squashUids`         | `-U` | squash ownership to this uid                         |
| `squashPerms`        | `-P` | squash permissions, like `umask 077`                 |
| `startingImage`      | `-x` | start from an existing image                         |
| `verbose`            | `-v` | dump the resulting structure to `stdout`             |

Errors reject (or throw) with the tool's own diagnostic, carrying `status`,
`stdout` and `stderr`:

```ts
try {
    await tarToExt2("rootfs.tar", "rootfs.ext2", { sizeInBlocks: 8 });
} catch (error) {
    console.error(error.message); // couldn't allocate a block (no free space)
    console.error(error.stderr); // everything the run printed
}
```

## Reproducibility

With `faketime` (or `SOURCE_DATE_EPOCH` in the environment) the same archive
always produces byte-identical images, which is what makes a drive's hash stable
across builds.

## Sizing

Left to itself, xgenext2fs sizes the image from a pre-pass over the content. That
estimate comes out a handful of blocks short for some archives, and the run then
dies part way through with `couldn't allocate a block (no free space)` — the same
thing happens with the upstream CLI, which is why Cartesi's tooling always passes
an explicit `-b`.

`createImage` and the `tarToExt2` helpers absorb this: when a run fails that way
they retry with a slightly larger explicit size, derived from the size the failed
attempt settled on. Both the estimate and the growth are deterministic, so images
stay reproducible. Set `autoSize: false` to get the raw behaviour, or pin
`sizeInBlocks` to take sizing into your own hands. `genext2fs(args)` never
retries.

## Compressed archives

gzip is inflated in JavaScript before the archive reaches the tool. Other
compression formats are rejected with an explicit message rather than a tar parse
error — decompress them first.

## How this is built

`xgenext2fs` is a command line program, not a library: a single 100 KB
`xgenext2fs.c` that parses `argv`, prints to `stderr`, and calls `exit()` on
every error. Rather than fork it, this package vendors both upstream projects as
git submodules and compiles them into the addon unmodified:

- **`deps/genext2fs`** — [cartesi/genext2fs](https://github.com/cartesi/genext2fs)
  at `v1.5.6`. `src/xgenext2fs_lib.c` textually includes `xgenext2fs.c` with
  `main` renamed, `exit()` redirected through `longjmp()`, and `stdout`/`stderr`
  redirected into temporary files, which is what turns the CLI into a callable
  function whose failures unwind and whose diagnostics become strings.
- **`deps/libarchive`** — [libarchive](https://github.com/libarchive/libarchive)
  at `v3.8.9`, which the Cartesi fork requires for its tar reader. Only the 16
  translation units needed to read an uncompressed tar are compiled, so the addon
  links against nothing but libc.

Neither project's build system runs: `node-gyp` cannot invoke `./configure`, so
the two generated `config.h` files are replaced by the hand-written ones under
[`config/`](./config), which assert the POSIX features both projects probe for
and branch on the few that genuinely differ between Linux and Darwin.

Because xgenext2fs keeps parser state in globals and `chdir()`s while reading
directory layers, calls are serialized behind a mutex in the addon. Concurrent
`tarToExt2` calls are safe; they just queue.

### Updating the vendored sources

```sh
git -C deps/genext2fs fetch --tags && git -C deps/genext2fs checkout v1.5.7
```

Then re-check `configure.ac` against `config/genext2fs/config.h`, bump `VERSION`
there, and rebuild. The same goes for libarchive: if the tar reader grows a new
dependency, the build fails at link time with an undefined symbol, and the file
list in `binding.gyp` needs the corresponding translation unit added.

## License

GPL-2.0-only, inherited from xgenext2fs, which this package compiles in. The
vendored libarchive subset is BSD-2-Clause. Note that this differs from the rest
of the deroll packages, which are Apache-2.0.
