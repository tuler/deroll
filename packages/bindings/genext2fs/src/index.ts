import {
    closeSync,
    mkdtempSync,
    openSync,
    readFileSync,
    readSync,
    rmSync,
    statSync,
    writeFileSync,
} from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gunzipSync } from "node:zlib";
import { addon } from "./addon.js";
import { type ImageOptions, buildArgs } from "./options.js";

export type {
    BlockSize,
    CreatorOs,
    Genext2fsOptions,
    ImageOptions,
    Layer,
    Size,
} from "./options.js";

/** Diagnostics the tool produced while building the image. */
export interface Genext2fsResult {
    /** `verbose` filesystem dump, empty otherwise. */
    stdout: string;
    /** Progress and warnings, e.g. `copying from tar archive ...`. */
    stderr: string;
}

/** Error thrown when xgenext2fs fails; carries its captured output. */
export interface Genext2fsError extends Error {
    status: number;
    stdout: string;
    stderr: string;
}

/** A tar archive: a path to one, or its bytes. Gzipped input is accepted. */
export type TarInput = string | Uint8Array;

/** Version of the vendored xgenext2fs this binding was built against. */
export const version: string = addon.version;

/**
 * Run xgenext2fs with a raw argument vector (without the program name), the
 * escape hatch for anything this package does not model. No sizing retry is
 * applied here; see {@link createImage}.
 *
 * ```ts
 * await genext2fs(["-f", "-a", "rootfs.tar", "-b", "8192", "image.ext2"]);
 * ```
 */
export const genext2fs = (args: string[]): Promise<Genext2fsResult> =>
    addon.run(args);

/** Blocking counterpart of {@link genext2fs}. */
export const genext2fsSync = (args: string[]): Genext2fsResult =>
    addon.runSync(args);

// -----------------------------------------------------------------------------
// image sizing
// -----------------------------------------------------------------------------

const DEFAULT_BLOCK_SIZE = 1024;

/**
 * xgenext2fs derives the image size from a pre-pass over the content, and that
 * estimate comes out a handful of blocks short for some inputs -- the run then
 * dies part way through with this message. The estimate itself is deterministic,
 * so retrying with a slightly larger explicit size is too.
 */
const EXHAUSTED = /no free space/i;

/** Sizes to try, in blocks, after an estimate of `blocks` proved too small. */
const growthPlan = (blocks: number): number[] => [
    blocks + Math.max(32, Math.ceil(blocks * 0.05)),
    blocks + Math.max(256, Math.ceil(blocks * 0.25)),
];

const isExhausted = (error: unknown): boolean =>
    error instanceof Error && EXHAUSTED.test(error.message);

/**
 * Number of blocks the failed attempt sized the image for. xgenext2fs truncates
 * the output to `blocks * blockSize` before populating it, so the partial file
 * left behind reports the estimate it settled on.
 */
const attemptedBlocks = (
    output: string,
    blockSize: number,
): number | undefined => {
    try {
        const { size } = statSync(output);
        return size > 0 ? Math.floor(size / blockSize) : undefined;
    } catch {
        return undefined;
    }
};

/** Whether a failed run is worth retrying with an explicit size. */
const canResize = (options: ImageOptions): boolean =>
    options.autoSize !== false &&
    options.sizeInBlocks === undefined &&
    options.startingImage === undefined;

/**
 * Build an ext2 image at `output` from an arbitrary set of layers.
 *
 * ```ts
 * await createImage("image.ext2", {
 *     layers: [{ type: "tarball", path: "rootfs.tar" }],
 *     blockSize: 4096,
 *     faketime: true,
 * });
 * ```
 */
export const createImage = async (
    output: string,
    options: ImageOptions = {},
): Promise<Genext2fsResult> => {
    try {
        return await genext2fs(buildArgs(output, options));
    } catch (error) {
        const sizes = resizePlan(output, options, error);
        let last = error;
        for (const sizeInBlocks of sizes) {
            try {
                return await genext2fs(
                    buildArgs(output, { ...options, sizeInBlocks }),
                );
            } catch (retryError) {
                last = retryError;
            }
        }
        throw last;
    }
};

/** Blocking counterpart of {@link createImage}. */
export const createImageSync = (
    output: string,
    options: ImageOptions = {},
): Genext2fsResult => {
    try {
        return genext2fsSync(buildArgs(output, options));
    } catch (error) {
        const sizes = resizePlan(output, options, error);
        let last = error;
        for (const sizeInBlocks of sizes) {
            try {
                return genext2fsSync(
                    buildArgs(output, { ...options, sizeInBlocks }),
                );
            } catch (retryError) {
                last = retryError;
            }
        }
        throw last;
    }
};

const resizePlan = (
    output: string,
    options: ImageOptions,
    error: unknown,
): number[] => {
    if (!isExhausted(error) || !canResize(options)) {
        return [];
    }
    const blocks = attemptedBlocks(
        output,
        options.blockSize ?? DEFAULT_BLOCK_SIZE,
    );
    return blocks === undefined ? [] : growthPlan(blocks);
};

// -----------------------------------------------------------------------------
// tar handling
// -----------------------------------------------------------------------------

const GZIP = [0x1f, 0x8b];
const compressedMagics: [number[], string][] = [
    [[0x42, 0x5a, 0x68], "bzip2"],
    [[0xfd, 0x37, 0x7a, 0x58, 0x5a], "xz"],
    [[0x28, 0xb5, 0x2f, 0xfd], "zstd"],
    [[0x1f, 0x9d], "compress"],
    [[0x04, 0x22, 0x4d, 0x18], "lz4"],
];

const startsWith = (bytes: Uint8Array, magic: number[]): boolean =>
    magic.every((byte, index) => bytes[index] === byte);

/**
 * The vendored libarchive subset carries no decompression filters (see
 * src/libarchive_formats.c), so gzip is inflated here and anything else is
 * rejected with an actionable message instead of a tar parse error.
 */
const detectCompression = (head: Uint8Array): "none" | "gzip" => {
    if (startsWith(head, GZIP)) {
        return "gzip";
    }
    for (const [magic, name] of compressedMagics) {
        if (startsWith(head, magic)) {
            throw new Error(
                `${name}-compressed archives are not supported; decompress the archive first (gzip is handled transparently)`,
            );
        }
    }
    return "none";
};

const readHead = (path: string): Uint8Array => {
    const head = Buffer.alloc(8);
    const fd = openSync(path, "r");
    try {
        const read = readSync(fd, head, 0, head.length, 0);
        return head.subarray(0, read);
    } finally {
        closeSync(fd);
    }
};

/** A tar ready for xgenext2fs, plus the scratch directory to clean up. */
interface Staged {
    path: string;
    scratch?: string;
}

const scratchPrefix = () => join(tmpdir(), "deroll-genext2fs-");

const stageTar = async (tar: TarInput): Promise<Staged> => {
    if (
        typeof tar === "string" &&
        detectCompression(readHead(tar)) === "none"
    ) {
        return { path: tar };
    }
    const scratch = await mkdtemp(scratchPrefix());
    const path = join(scratch, "input.tar");
    await writeFile(path, await inflate(tar));
    return { path, scratch };
};

const stageTarSync = (tar: TarInput): Staged => {
    if (
        typeof tar === "string" &&
        detectCompression(readHead(tar)) === "none"
    ) {
        return { path: tar };
    }
    const scratch = mkdtempSync(scratchPrefix());
    const path = join(scratch, "input.tar");
    writeFileSync(path, inflateSync(tar));
    return { path, scratch };
};

const inflate = async (tar: TarInput): Promise<Uint8Array> =>
    inflateSync(typeof tar === "string" ? await readFile(tar) : tar);

const inflateSync = (tar: TarInput): Uint8Array => {
    const bytes = typeof tar === "string" ? readFileSync(tar) : tar;
    return detectCompression(bytes) === "gzip" ? gunzipSync(bytes) : bytes;
};

const discard = (scratch?: string): void => {
    if (scratch !== undefined) {
        rmSync(scratch, { recursive: true, force: true });
    }
};

// -----------------------------------------------------------------------------
// tar -> ext2
// -----------------------------------------------------------------------------

export interface TarToExt2Options extends Omit<ImageOptions, "layers"> {
    /** Path inside the image to unpack the archive at. Defaults to the root. */
    target?: string;
}

const tarOptions = (path: string, options: TarToExt2Options): ImageOptions => {
    const { target, ...rest } = options;
    return { ...rest, layers: [{ type: "tarball", path, target }] };
};

/**
 * Convert a tar archive into an ext2 image written to `output`.
 *
 * The image is sized to fit its contents unless `sizeInBlocks` says otherwise.
 * Gzipped archives are inflated transparently.
 *
 * ```ts
 * await tarToExt2("rootfs.tar", "rootfs.ext2", {
 *     blockSize: 4096,
 *     faketime: true,
 * });
 * ```
 */
export const tarToExt2 = async (
    tar: TarInput,
    output: string,
    options: TarToExt2Options = {},
): Promise<Genext2fsResult> => {
    const staged = await stageTar(tar);
    try {
        return await createImage(output, tarOptions(staged.path, options));
    } finally {
        discard(staged.scratch);
    }
};

/** Blocking counterpart of {@link tarToExt2}. */
export const tarToExt2Sync = (
    tar: TarInput,
    output: string,
    options: TarToExt2Options = {},
): Genext2fsResult => {
    const staged = stageTarSync(tar);
    try {
        return createImageSync(output, tarOptions(staged.path, options));
    } finally {
        discard(staged.scratch);
    }
};

/**
 * Convert a tar archive into an ext2 image returned as bytes.
 *
 * xgenext2fs always writes to a file, so the image is built in a temporary
 * directory and read back; prefer {@link tarToExt2} for images large enough
 * that holding one in memory matters.
 */
export const tarToExt2Buffer = async (
    tar: TarInput,
    options: TarToExt2Options = {},
): Promise<Buffer> => {
    const scratch = await mkdtemp(scratchPrefix());
    try {
        const output = join(scratch, "image.ext2");
        await tarToExt2(tar, output, options);
        return await readFile(output);
    } finally {
        await rm(scratch, { recursive: true, force: true });
    }
};

/** Blocking counterpart of {@link tarToExt2Buffer}. */
export const tarToExt2BufferSync = (
    tar: TarInput,
    options: TarToExt2Options = {},
): Buffer => {
    const scratch = mkdtempSync(scratchPrefix());
    try {
        const output = join(scratch, "image.ext2");
        tarToExt2Sync(tar, output, options);
        return readFileSync(output);
    } finally {
        discard(scratch);
    }
};
