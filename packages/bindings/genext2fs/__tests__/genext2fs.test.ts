import { execFileSync } from "node:child_process";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    createImage,
    createImageSync,
    tarToExt2,
    tarToExt2Sync,
    version,
} from "../src/index.js";

let work: string;
let tar: string;
let gzipped: string;

/** `e2fsck` is not installed everywhere; skip the assertions that need it. */
const has = (tool: string): boolean => {
    try {
        execFileSync(tool, ["-V"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
};

/** Build an image in a throwaway file and read it back, for comparisons. */
const image = async (
    name: string,
    build: (output: string) => Promise<unknown>,
): Promise<Buffer> => {
    const output = join(work, name);
    await build(output);
    return readFileSync(output);
};

beforeAll(() => {
    work = mkdtempSync(join(tmpdir(), "genext2fs-test-"));

    // a tree with a few of the entry kinds tar can carry
    const root = join(work, "root");
    mkdirSync(join(root, "etc"), { recursive: true });
    mkdirSync(join(root, "bin"), { recursive: true });
    writeFileSync(join(root, "etc", "hello.txt"), "hello world\n");
    writeFileSync(join(root, "bin", "blob"), Buffer.alloc(200_000, 0x5a));
    symlinkSync("/etc/hello.txt", join(root, "bin", "link"));

    tar = join(work, "root.tar");
    execFileSync("tar", ["--format=gnu", "-cf", tar, "-C", root, "."]);

    gzipped = join(work, "root.tar.gz");
    writeFileSync(gzipped, gzipSync(readFileSync(tar)));
});

afterAll(() => {
    rmSync(work, { recursive: true, force: true });
});

describe("version", () => {
    it("reports the vendored xgenext2fs version", () => {
        expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
});

describe("tarToExt2", () => {
    it("builds an image sized to the archive", async () => {
        const output = join(work, "auto.ext2");
        const result = await tarToExt2(tar, output, {
            blockSize: 4096,
            faketime: true,
        });
        expect(result.stderr).toContain("copying from tar archive");
        expect(statSync(output).size).toBeGreaterThan(200_000);
    });

    it("produces a filesystem e2fsck considers clean", async () => {
        if (!has("e2fsck")) {
            return;
        }
        const output = join(work, "fsck.ext2");
        await tarToExt2(tar, output, { blockSize: 4096, faketime: true });
        // e2fsck exits 0 only when it found nothing to fix
        execFileSync("e2fsck", ["-fn", output], { stdio: "ignore" });
    });

    it("is reproducible with faketime", async () => {
        const options = { blockSize: 4096, faketime: true } as const;
        const a = await image("repro-a.ext2", (out) =>
            tarToExt2(tar, out, options),
        );
        const b = await image("repro-b.ext2", (out) =>
            tarToExt2(tar, out, options),
        );
        expect(Buffer.compare(a, b)).toBe(0);
    });

    it("accepts the archive as bytes", async () => {
        const options = { blockSize: 4096, faketime: true } as const;
        const fromPath = await image("from-path.ext2", (out) =>
            tarToExt2(tar, out, options),
        );
        const fromBytes = await image("from-bytes.ext2", (out) =>
            tarToExt2(readFileSync(tar), out, options),
        );
        expect(Buffer.compare(fromPath, fromBytes)).toBe(0);
    });

    it("inflates gzipped archives", async () => {
        const options = { blockSize: 4096, faketime: true } as const;
        const plain = await image("plain.ext2", (out) =>
            tarToExt2(tar, out, options),
        );
        const compressed = await image("gzipped.ext2", (out) =>
            tarToExt2(gzipped, out, options),
        );
        expect(Buffer.compare(plain, compressed)).toBe(0);
    });

    it("refuses archives compressed with something it cannot inflate", async () => {
        const xz = join(work, "root.tar.xz");
        writeFileSync(
            xz,
            Buffer.concat([
                Buffer.from([0xfd, 0x37, 0x7a, 0x58, 0x5a, 0x00]),
                Buffer.alloc(64),
            ]),
        );
        await expect(tarToExt2(xz, join(work, "xz.ext2"))).rejects.toThrow(
            /xz-compressed/,
        );
    });

    it("honours an explicit size", async () => {
        const output = join(work, "sized.ext2");
        await tarToExt2(tar, output, { blockSize: 4096, sizeInBlocks: 2048 });
        expect(statSync(output).size).toBe(2048 * 4096);
    });

    it("dumps the structure when verbose", async () => {
        const result = await tarToExt2(tar, join(work, "verbose.ext2"), {
            blockSize: 4096,
            verbose: true,
        });
        expect(result.stdout).toContain("hello.txt");
    });

    it("works synchronously", () => {
        const output = join(work, "sync.ext2");
        tarToExt2Sync(tar, output, { blockSize: 4096, faketime: true });
        expect(statSync(output).size).toBeGreaterThan(200_000);
    });

    it("rejects an output of stdout", async () => {
        await expect(tarToExt2(tar, "-")).rejects.toThrow(/stdout/);
    });

    it("runs concurrent conversions without interleaving", async () => {
        const outputs = [0, 1, 2, 3].map((i) =>
            join(work, `parallel${i}.ext2`),
        );
        await Promise.all(
            outputs.map((output) =>
                tarToExt2(tar, output, { blockSize: 4096, faketime: true }),
            ),
        );
        const first = readFileSync(outputs[0]);
        for (const output of outputs.slice(1)) {
            expect(Buffer.compare(first, readFileSync(output))).toBe(0);
        }
    });
});

describe("createImage", () => {
    it("applies layers in order, at their target paths", async () => {
        const output = join(work, "layers.ext2");
        // /etc only exists once the first layer has been laid down
        await createImage(output, {
            blockSize: 4096,
            faketime: true,
            sizeInBlocks: 2048,
            layers: [
                { type: "tarball", path: tar },
                { type: "tarball", path: tar, target: "/etc" },
            ],
        });
        if (has("e2fsck")) {
            execFileSync("e2fsck", ["-fn", output], { stdio: "ignore" });
        }
    });

    it("passes the whole option surface through to the tool", async () => {
        const result = await createImage(join(work, "options.ext2"), {
            layers: [{ type: "tarball", path: tar }],
            blockSize: 2048,
            sizeInBlocks: "4Ki", // SI/IEC suffixes are parsed by the tool
            numberOfInodes: 512,
            bytesPerInode: 4096,
            volumeLabel: "rootfs",
            reservedPercentage: 0,
            creatorOs: "freebsd",
            fillValue: 0,
            allowHoles: true,
            faketime: true,
            squashUids: 0,
            squashPerms: true,
            verbose: true,
        });
        expect(result.stdout).toContain("hello.txt");
    });

    it("rejects a layer path containing a colon", async () => {
        await expect(
            createImage(join(work, "colon.ext2"), {
                layers: [{ type: "tarball", path: "/tmp/we:ird.tar" }],
            }),
        ).rejects.toThrow(/must not contain/);
    });

    it("surfaces the tool's own diagnostic", async () => {
        await expect(
            createImage(join(work, "missing.ext2"), {
                layers: [{ type: "tarball", path: join(work, "missing.tar") }],
            }),
        ).rejects.toThrow(/should be a file|missing\.tar/);
    });

    it("carries status and captured output on the error", async () => {
        try {
            await createImage(join(work, "bad-block-size.ext2"), {
                blockSize: 3000 as 4096,
            });
            expect.unreachable("expected an invalid block size to be rejected");
        } catch (e) {
            const error = e as Error & { status: number; stderr: string };
            expect(error.message).toMatch(/Valid block sizes/);
            expect(error.status).toBe(1);
            expect(error.stderr).toContain("Valid block sizes");
        }
    });

    it("stays usable after a failed run", () => {
        expect(() =>
            createImageSync(join(work, "bad.ext2"), {
                blockSize: 3000 as 4096,
            }),
        ).toThrow(/Valid block sizes/);

        const output = join(work, "after-failure.ext2");
        createImageSync(output, {
            layers: [{ type: "tarball", path: tar }],
            blockSize: 4096,
            faketime: true,
        });
        expect(statSync(output).size).toBeGreaterThan(200_000);
    });

    it("grows past an under-estimated size, and does not when told not to", async () => {
        // this archive is one xgenext2fs sizes a few blocks short of what it
        // needs, which is what autoSize exists to absorb
        const output = join(work, "grow.ext2");
        await expect(
            createImage(output, {
                layers: [{ type: "tarball", path: tar }],
                blockSize: 4096,
                autoSize: false,
            }),
        ).rejects.toThrow(/no free space/);

        await expect(
            createImage(output, {
                layers: [{ type: "tarball", path: tar }],
                blockSize: 4096,
            }),
        ).resolves.toBeDefined();
    });
});
