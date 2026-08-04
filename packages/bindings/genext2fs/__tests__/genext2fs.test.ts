import { execFileSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, statSync } from "node:fs";
import { mkdirSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { gzipSync } from "node:zlib";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
    createImage,
    genext2fs,
    genext2fsSync,
    tarToExt2,
    tarToExt2Buffer,
    tarToExt2Sync,
    version,
} from "../src/index.js";

let work: string;
let tar: string;
let gzipped: string;

/** `dumpe2fs`/`e2fsck` are not installed everywhere; skip those assertions. */
const has = (tool: string): boolean => {
    try {
        execFileSync(tool, ["-V"], { stdio: "ignore" });
        return true;
    } catch {
        return false;
    }
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

describe("genext2fs", () => {
    it("accepts a raw argument vector", async () => {
        const output = join(work, "raw.ext2");
        const result = await genext2fs([
            "-f",
            "-B",
            "4096",
            "-b",
            "1024",
            "-a",
            tar,
            output,
        ]);
        expect(result.stderr).toContain("copying from tar archive");
        expect(statSync(output).size).toBe(1024 * 4096);
    });

    it("rejects with the tool's own diagnostic", async () => {
        await expect(
            genext2fs(["-a", join(work, "missing.tar"), join(work, "x.ext2")]),
        ).rejects.toThrow(/should be a file|missing\.tar/);
    });

    it("reports errors synchronously too", () => {
        expect(() =>
            genext2fsSync(["--block-size", "3000", join(work, "x.ext2")]),
        ).toThrow(/Valid block sizes/);
    });

    it("stays usable after a failed run", async () => {
        await expect(
            genext2fs(["-B", "3000", join(work, "x.ext2")]),
        ).rejects.toThrow();
        const output = join(work, "after-failure.ext2");
        await expect(
            genext2fs(["-f", "-b", "512", "-a", tar, output]),
        ).resolves.toBeDefined();
    });
});

describe("tarToExt2", () => {
    it("builds an image sized to the archive", async () => {
        const output = join(work, "auto.ext2");
        await tarToExt2(tar, output, { blockSize: 4096, faketime: true });
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
        const a = await tarToExt2Buffer(tar, {
            blockSize: 4096,
            faketime: true,
        });
        const b = await tarToExt2Buffer(tar, {
            blockSize: 4096,
            faketime: true,
        });
        expect(Buffer.compare(a, b)).toBe(0);
    });

    it("accepts the archive as bytes", async () => {
        const fromPath = await tarToExt2Buffer(tar, {
            blockSize: 4096,
            faketime: true,
        });
        const fromBytes = await tarToExt2Buffer(readFileSync(tar), {
            blockSize: 4096,
            faketime: true,
        });
        expect(Buffer.compare(fromPath, fromBytes)).toBe(0);
    });

    it("inflates gzipped archives", async () => {
        const plain = await tarToExt2Buffer(tar, {
            blockSize: 4096,
            faketime: true,
        });
        const compressed = await tarToExt2Buffer(gzipped, {
            blockSize: 4096,
            faketime: true,
        });
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

    it("unpacks at a target path inside the image", async () => {
        if (!has("dumpe2fs")) {
            return;
        }
        const output = join(work, "target.ext2");
        // the target directory has to exist, so lay down the tree first
        await createImage(output, {
            blockSize: 4096,
            faketime: true,
            sizeInBlocks: 2048,
            layers: [
                { type: "tarball", path: tar },
                { type: "tarball", path: tar, target: "/etc" },
            ],
        });
        execFileSync("e2fsck", ["-fn", output], { stdio: "ignore" });
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
