/**
 * Structured form of the xgenext2fs command line, and the translation to argv.
 *
 * Every field maps one to one onto a documented flag; see
 * deps/genext2fs/xgenext2fs.8 for the authoritative descriptions.
 */

/**
 * Value for the creator OS field in the superblock (`-o`). Anything xgenext2fs
 * does not recognize by name falls back to Linux, so a raw number is the way to
 * set one it has no name for.
 */
export type CreatorOs = "linux" | "hurd" | "GNU" | "freebsd" | "lites" | number;

/** Filesystem block size in bytes (`-B`). */
export type BlockSize = 1024 | 2048 | 4096;

/**
 * Sizes accepted by xgenext2fs, which parses an IEC or SI multiplier: a plain
 * number, or a string such as `"64Mi"`, `"1G"` or `"512k"`.
 */
export type Size = number | string;

/** A source of content, applied to the image in the order given. */
export type Layer =
    /** `-d`: add a directory and its contents */
    | { type: "directory"; path: string; target?: string }
    /** `-a`: add the contents of an (uncompressed) tar archive */
    | { type: "tarball"; path: string; target?: string }
    /** `-D`: create/fix up inodes described by a device table file */
    | { type: "devtable"; path: string; target?: string };

export interface Genext2fsOptions {
    /** `-x`: use this image as a starting point instead of an empty one. */
    startingImage?: string;

    /** `-B`: size of a filesystem block in bytes. Defaults to 1024. */
    blockSize?: BlockSize;

    /**
     * `-b`: size of the image in blocks. Computed from the content when
     * omitted.
     */
    sizeInBlocks?: Size;

    /** `-N`: minimum number of inodes. */
    numberOfInodes?: Size;

    /** `-i`: bytes per inode, used to derive the inode count from the size. */
    bytesPerInode?: Size;

    /**
     * `-r`: grow the computed size and inode count by this much, as an absolute
     * number of blocks or a percentage, e.g. `"+10%"` or `"+1024"`.
     */
    readjustment?: string;

    /** `-L`: volume label. */
    volumeLabel?: string;

    /**
     * `-m`: blocks to reserve, as a percentage of the image size. Reserving 0
     * also skips creation of `lost+found`.
     */
    reservedPercentage?: number;

    /** `-o`: value for the creator OS field of the superblock. */
    creatorOs?: CreatorOs;

    /**
     * `-g`: generate a block map for each of these paths. The maps are written
     * to the *current working directory* as `<path>.blk`, with slashes replaced
     * by underscores.
     */
    blockMap?: string[];

    /** `-e`: fill unallocated blocks with this byte value. */
    fillValue?: number;

    /** `-z`: make files with holes. */
    allowHoles?: boolean;

    /**
     * `-f`: use a timestamp of 0 for inode and filesystem creation instead of
     * the present, making the output reproducible. Setting the
     * `SOURCE_DATE_EPOCH` environment variable achieves the same with a chosen
     * timestamp.
     */
    faketime?: boolean;

    /** `-q`: squash both ownership and permissions, owning everything by this uid. */
    squash?: number;

    /** `-U`: squash ownership of added inodes, owning them all by this uid. */
    squashUids?: number;

    /** `-P`: squash permissions of added inodes, analogous to `umask 077`. */
    squashPerms?: boolean;

    /** `-v`: print the resulting filesystem structure to `stdout`. */
    verbose?: boolean;
}

export interface ImageOptions extends Genext2fsOptions {
    /** Content sources, applied in order. */
    layers?: Layer[];

    /**
     * Retry with a slightly larger explicit size when xgenext2fs runs out of
     * blocks part way through, which its own size estimate makes it do for some
     * archives. Both the estimate and the growth are deterministic, so the
     * resulting image is reproducible. Defaults to `true`, and does not apply
     * when `sizeInBlocks` or `startingImage` is set.
     */
    autoSize?: boolean;
}

const layerFlags: Record<Layer["type"], string> = {
    directory: "-d",
    tarball: "-a",
    devtable: "-D",
};

/**
 * xgenext2fs splits a layer argument on its first colon, so neither the source
 * path nor the target path may contain one.
 */
const layerSpec = (layer: Layer): string => {
    if (layer.path.includes(":")) {
        throw new Error(
            `layer path must not contain ":" (xgenext2fs uses it to separate the target path): ${layer.path}`,
        );
    }
    if (layer.target === undefined) {
        return layer.path;
    }
    if (layer.target.includes(":")) {
        throw new Error(`layer target must not contain ":": ${layer.target}`);
    }
    return `${layer.path}:${layer.target}`;
};

/**
 * Build the xgenext2fs argv (without the program name) for the given options
 * and output image path.
 */
export const buildArgs = (
    output: string,
    options: ImageOptions = {},
): string[] => {
    if (output === "-") {
        throw new Error(
            'writing the image to stdout ("-") is not supported; pass a file path',
        );
    }

    const args: string[] = [];
    const push = (flag: string, value?: Size) => {
        args.push(flag);
        if (value !== undefined) {
            args.push(String(value));
        }
    };

    if (options.startingImage !== undefined) {
        push("-x", options.startingImage);
    }
    for (const layer of options.layers ?? []) {
        push(layerFlags[layer.type], layerSpec(layer));
    }
    if (options.blockSize !== undefined) {
        push("-B", options.blockSize);
    }
    if (options.sizeInBlocks !== undefined) {
        push("-b", options.sizeInBlocks);
    }
    if (options.numberOfInodes !== undefined) {
        push("-N", options.numberOfInodes);
    }
    if (options.bytesPerInode !== undefined) {
        push("-i", options.bytesPerInode);
    }
    if (options.readjustment !== undefined) {
        push("-r", options.readjustment);
    }
    if (options.volumeLabel !== undefined) {
        push("-L", options.volumeLabel);
    }
    if (options.reservedPercentage !== undefined) {
        push("-m", options.reservedPercentage);
    }
    if (options.creatorOs !== undefined) {
        push("-o", options.creatorOs);
    }
    for (const path of options.blockMap ?? []) {
        push("-g", path);
    }
    if (options.fillValue !== undefined) {
        push("-e", options.fillValue);
    }
    if (options.allowHoles) {
        push("-z");
    }
    if (options.faketime) {
        push("-f");
    }
    if (options.squash !== undefined) {
        push("-q", options.squash);
    }
    if (options.squashUids !== undefined) {
        push("-U", options.squashUids);
    }
    if (options.squashPerms) {
        push("-P");
    }
    if (options.verbose) {
        push("-v");
    }

    args.push(output);
    return args;
};
