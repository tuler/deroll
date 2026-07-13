import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
    type Advance,
    type Hex,
    encodeAdvance,
    encodeCallVoucher,
    encodeErc20Transfer,
    encodeNotice,
    zeroHash,
} from "@deroll/codec";
import { Bytes, Hex as OxHex } from "ox";
import { afterEach, describe, expect, it } from "vitest";
import { createApp } from "../src/index.js";
import type { App, AppOptions } from "@deroll/core";

// the libcmt mock writes output files next to the process cwd
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deroll-app-"));
process.chdir(tmp);

const APP_CONTEXT: Hex = `0x${"42".padStart(64, "0")}`;

const ADVANCE: Advance = {
    chainId: 31337n,
    appContract: `0x${"02".repeat(20)}`,
    msgSender: `0x${"03".repeat(20)}`,
    blockNumber: 456n,
    blockTimestamp: 1700000000n,
    prevRandao: 0xdeadbeefn,
    index: 0n,
    payload: OxHex.fromString("hello"),
};

let dirCount = 0;

// stage input files and point CMT_INPUTS at them; returns the directory the
// mock will write outputs into
const writeInputs = (inputs: [number, Uint8Array][]): string => {
    const dir = path.join(tmp, `t${dirCount++}`);
    fs.mkdirSync(dir, { recursive: true });
    process.env.CMT_INPUTS = inputs
        .map(([reason, data], i) => {
            const file = path.join(dir, `input-${i}.bin`);
            fs.writeFileSync(file, data);
            return `${reason}:${file}`;
        })
        .join(",");
    return dir;
};

const advanceInput = (advance: Advance): [number, Uint8Array] => [
    0,
    Bytes.fromHex(encodeAdvance(advance)),
];

let app: App | undefined;

const startApp = (options?: AppOptions): App => {
    const started = createApp(options);
    app = started;
    return started;
};

afterEach(() => {
    app?.stop();
    app = undefined;
});

describe("advance dispatch", () => {
    it("delivers the decoded advance and emits outputs", async () => {
        const dir = writeInputs([advanceInput(ADVANCE)]);
        const app = startApp();

        const seen: Advance[] = [];
        app.addAdvanceHandler(async (data) => {
            seen.push(data);
            app.createNotice({ payload: data.payload });
            app.createCallVoucher({
                destination: data.msgSender,
                value: 1000n,
                payload: "0x",
            });
            app.createReport(OxHex.fromString("done"));
            return true;
        });
        await app.start();

        expect(seen).toEqual([ADVANCE]);

        const notice = fs.readFileSync(path.join(dir, "input-0.output-0.bin"));
        expect(OxHex.fromBytes(notice)).toEqual(
            encodeNotice({ payload: ADVANCE.payload }),
        );
        const voucher = fs.readFileSync(path.join(dir, "input-0.output-1.bin"));
        expect(OxHex.fromBytes(voucher)).toEqual(
            encodeCallVoucher({
                destination: ADVANCE.msgSender,
                value: 1000n,
                payload: "0x",
            }),
        );
        const report = fs.readFileSync(path.join(dir, "input-0.report-0.bin"));
        expect(report.toString()).toEqual("done");
    });

    it("short-circuits on first accept by default", async () => {
        writeInputs([advanceInput(ADVANCE)]);
        const app = startApp();

        const calls: string[] = [];
        app.addAdvanceHandler(async () => {
            calls.push("first");
            return true;
        });
        app.addAdvanceHandler(async () => {
            calls.push("second");
            return true;
        });
        await app.start();

        expect(calls).toEqual(["first"]);
    });

    it("broadcasts to all handlers when configured", async () => {
        writeInputs([advanceInput(ADVANCE)]);
        const app = startApp({ broadcastAdvanceRequests: true });

        const calls: string[] = [];
        app.addAdvanceHandler(async () => {
            calls.push("first");
            return true;
        });
        app.addAdvanceHandler(async () => {
            calls.push("second");
            return false;
        });
        await app.start();

        expect(calls).toEqual(["first", "second"]);
    });

    it("keeps running after a handler throws", async () => {
        writeInputs([advanceInput(ADVANCE)]);
        const app = startApp();

        const calls: string[] = [];
        app.addAdvanceHandler(async () => {
            calls.push("throwing");
            throw new Error("boom");
        });
        app.addAdvanceHandler(async () => {
            calls.push("accepting");
            return true;
        });
        await app.start();

        expect(calls).toEqual(["throwing", "accepting"]);
    });

    it("reports and rejects undecodable advances", async () => {
        // rejecting on the mock swallows the next queued input (no revert
        // support), so stage a filler between the bad and the good input
        const dir = writeInputs([
            [0, Bytes.fromHex("0xdeadbeef")],
            advanceInput({ ...ADVANCE, index: 9n }), // swallowed by the reject
            advanceInput({ ...ADVANCE, index: 5n }),
        ]);
        const app = startApp();

        const seen: bigint[] = [];
        app.addAdvanceHandler(async (data) => {
            seen.push(data.index);
            return true;
        });
        await app.start();

        // the bad input produced an error report, and the loop kept going
        const report = fs.readFileSync(path.join(dir, "input-0.report-0.bin"));
        expect(report.toString()).toMatch(/not an EvmAdvance/);
        expect(seen).toEqual([5n]);
    });
});

describe("inspect dispatch", () => {
    it("delivers the raw query payload", async () => {
        const dir = writeInputs([[1, Bytes.fromHex("0x11223344")]]);
        const app = startApp();

        const seen: Hex[] = [];
        app.addInspectHandler(async (payload) => {
            seen.push(payload);
            app.createReport(payload);
        });
        await app.start();

        expect(seen).toEqual(["0x11223344"]);
        const report = fs.readFileSync(path.join(dir, "input-0.report-0.bin"));
        expect(OxHex.fromBytes(report)).toEqual("0x11223344");
    });
});

describe("appContext", () => {
    it("stamps the app-level default on outputs", async () => {
        const dir = writeInputs([advanceInput(ADVANCE)]);
        const app = startApp({ appContext: APP_CONTEXT });

        app.addAdvanceHandler(async () => {
            app.createNotice({ payload: "0x1234" });
            app.createErc20Transfer({
                recipient: `0x${"aa".repeat(20)}`,
                token: `0x${"bb".repeat(20)}`,
                value: 1n,
                appContext: zeroHash, // per-output value wins over the default
            });
            return true;
        });
        await app.start();

        const notice = fs.readFileSync(path.join(dir, "input-0.output-0.bin"));
        expect(OxHex.fromBytes(notice)).toEqual(
            encodeNotice({ appContext: APP_CONTEXT, payload: "0x1234" }),
        );
        const transfer = fs.readFileSync(
            path.join(dir, "input-0.output-1.bin"),
        );
        expect(OxHex.fromBytes(transfer)).toEqual(
            encodeErc20Transfer({
                recipient: `0x${"aa".repeat(20)}`,
                token: `0x${"bb".repeat(20)}`,
                value: 1n,
            }),
        );
    });
});

describe("forward compatibility", () => {
    it("skips requests of unknown type", async () => {
        writeInputs([[7, Bytes.fromHex("0x00")], advanceInput(ADVANCE)]);
        const app = startApp();

        const seen: bigint[] = [];
        app.addAdvanceHandler(async (data) => {
            seen.push(data.index);
            return true;
        });
        await app.start();

        expect(seen).toEqual([0n]);
    });
});
