// End-to-end parity against @deroll/cmio (the native libcmt binding): the
// same scripted session over the same inputs must produce byte-identical
// output files — vouchers, notices, reports, exceptions, outputs root hashes
// and the saved merkle state. Skipped when the native addon is not built.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { Rollup } from "../src/index.js";
import { encodeEvmAdvance } from "./encode.js";

type AnyRollup = InstanceType<typeof Rollup>;

let cmio: { Rollup: new () => AnyRollup } | undefined;
try {
    cmio = (await import("@deroll/cmio")) as unknown as {
        Rollup: new () => AnyRollup;
    };
    // constructing exercises the native addon; close right away
    const probe = new cmio.Rollup();
    probe.close();
} catch {
    cmio = undefined;
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deroll-parity-"));

const ADVANCE = {
    chainId: 31337n,
    appContract: `0x${"02".repeat(20)}`,
    msgSender: `0x${"03".repeat(20)}`,
    blockNumber: 456n,
    blockTimestamp: 1700000000n,
    prevRandao: 0xdeadbeefn,
    index: 0n,
    payload: Buffer.from("first input"),
};

function prepareInputs(dir: string): void {
    fs.mkdirSync(dir, { recursive: true });
    const inputs: [number, string, Buffer][] = [
        [0, "input0.bin", encodeEvmAdvance(ADVANCE)],
        [
            0,
            "input1.bin",
            encodeEvmAdvance({
                ...ADVANCE,
                index: 1n,
                payload: Buffer.from("second input"),
            }),
        ],
        [1, "input2.bin", Buffer.from("inspect-me")],
    ];
    process.env.CMT_INPUTS = inputs
        .map(([reason, filename, data]) => {
            const file = path.join(dir, filename);
            fs.writeFileSync(file, data);
            return `${reason}:${file}`;
        })
        .join(",");
}

/** The scripted dapp session, identical for both implementations. */
function runSession(rollup: AnyRollup, dir: string): void {
    const advance1 = rollup.finish();
    expect(advance1.type).toBe("advance");
    rollup.emitVoucher({
        destination: `0x${"aa".repeat(20)}`,
        value: 1_000_000n,
        payload: Buffer.from("voucher-payload"),
    });
    rollup.emitNotice(Buffer.from("notice-payload"));
    rollup.emitDelegateCallVoucher({
        destination: `0x${"bb".repeat(20)}`,
        payload: Buffer.from("delegate-payload"),
    });
    rollup.emitReport(Buffer.from("report-payload"));

    const advance2 = rollup.finish();
    expect(advance2.type).toBe("advance");
    rollup.emitNotice(advance2.payload);

    const inspect = rollup.finish();
    expect(inspect.type).toBe("inspect");
    rollup.emitReport(inspect.payload);

    expect(() => rollup.finish()).toThrow(/cmt_rollup_finish failed/);
    rollup.saveMerkle(path.join(dir, "merkle.state"));
    rollup.close();
}

describe.runIf(cmio !== undefined)("parity with @deroll/cmio", () => {
    it("produces byte-identical outputs for the same session", () => {
        const nativeDir = path.join(tmp, "native");
        const pureDir = path.join(tmp, "pure");

        prepareInputs(nativeDir);
        // biome-ignore lint/style/noNonNullAssertion: runIf guards this
        runSession(new cmio!.Rollup(), nativeDir);

        prepareInputs(pureDir);
        runSession(new Rollup(), pureDir);

        const outputs = (dir: string): string[] =>
            fs
                .readdirSync(dir)
                .filter((name) => !name.startsWith("input"))
                .sort();

        const nativeFiles = outputs(nativeDir);
        expect(nativeFiles.length).toBeGreaterThan(0);
        expect(outputs(pureDir)).toEqual(nativeFiles);

        for (const name of nativeFiles) {
            const native = fs.readFileSync(path.join(nativeDir, name));
            const pure = fs.readFileSync(path.join(pureDir, name));
            expect(pure.equals(native), `${name} differs`).toBe(true);
        }
    });

    it("requests decode identically", () => {
        const dir = path.join(tmp, "decode-native");
        prepareInputs(dir);
        // biome-ignore lint/style/noNonNullAssertion: runIf guards this
        const nativeRollup = new cmio!.Rollup();
        const nativeRequest = nativeRollup.finish();
        expect(() => nativeRollup.finish({ accept: true })).not.toThrow();
        nativeRollup.close();

        const dir2 = path.join(tmp, "decode-pure");
        prepareInputs(dir2);
        const pureRollup = new Rollup();
        const pureRequest = pureRollup.finish();
        expect(() => pureRollup.finish({ accept: true })).not.toThrow();
        pureRollup.close();

        expect(pureRequest).toEqual(nativeRequest);
    });
});
