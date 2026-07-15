// Behavior suite ported from @deroll/cmio's test/rollup.test.mjs: the same
// dapp-visible semantics, driven through the pure-JS mock driver.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeAll, describe, expect, it } from "vitest";
import { Rollup, RollupError } from "../src/index.js";
import { SELECTOR, encodeEvmAdvance } from "./encode.js";

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "deroll-rollup-"));

// gio before any input writes "none.gio-0.bin" relative to cwd
beforeAll(() => {
    process.chdir(tmp);
});

const word = (value: bigint | number): Buffer => {
    let v = BigInt(value);
    const bytes = Buffer.alloc(32);
    for (let i = 31; i >= 0 && v > 0n; i--) {
        bytes[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return bytes;
};

const addressWord = (hex: string): Buffer =>
    Buffer.concat([Buffer.alloc(12), Buffer.from(hex.slice(2), "hex")]);

const ADVANCE = {
    chainId: 31337n,
    appContract: `0x${"02".repeat(20)}` as const,
    msgSender: `0x${"03".repeat(20)}` as const,
    blockNumber: 456n,
    blockTimestamp: 1700000000n,
    prevRandao: 0xdeadbeefn,
    index: 7n,
    payload: Buffer.from("hello from the chain"),
};

function writeInputs(name: string, inputs: [number, string, Buffer][]): string {
    const dir = path.join(tmp, name);
    fs.mkdirSync(dir, { recursive: true });
    const spec = inputs
        .map(([reason, filename, data]) => {
            const file = path.join(dir, filename);
            fs.writeFileSync(file, data);
            return `${reason}:${file}`;
        })
        .join(",");
    process.env.CMT_INPUTS = spec;
    return dir;
}

describe("rollup over the mock driver", () => {
    it("advance request, outputs and reports", () => {
        const dir = writeInputs("advance", [
            [0, "advance.bin", encodeEvmAdvance(ADVANCE)],
        ]);
        const rollup = new Rollup();

        const request = rollup.finish();
        expect(request.type).toBe("advance");
        if (request.type !== "advance") throw new Error("unreachable");
        expect(request.chainId).toBe(ADVANCE.chainId);
        expect(request.appContract).toBe(ADVANCE.appContract);
        expect(request.msgSender).toBe(ADVANCE.msgSender);
        expect(request.blockNumber).toBe(ADVANCE.blockNumber);
        expect(request.blockTimestamp).toBe(ADVANCE.blockTimestamp);
        expect(request.prevRandao).toBe(ADVANCE.prevRandao);
        expect(request.index).toBe(ADVANCE.index);
        expect(request.payload).toEqual(ADVANCE.payload);

        const destination = `0x${"aa".repeat(20)}` as const;
        const voucherPayload = Buffer.from("voucher-payload");
        const noticePayload = Buffer.from("notice-payload");
        const reportPayload = Buffer.from("report-payload");

        expect(
            rollup.emitVoucher({
                destination,
                value: 1000n,
                payload: voucherPayload,
            }),
        ).toBe(0);
        expect(rollup.emitNotice(noticePayload)).toBe(1);
        rollup.emitReport(reportPayload);
        rollup.progress(500);

        // outputs are EVM-ABI encoded and stored next to the input file
        const voucher = fs.readFileSync(path.join(dir, "advance.output-0.bin"));
        expect(voucher.subarray(0, 4).toString("hex")).toBe(SELECTOR.voucher);
        expect(voucher.includes(addressWord(destination))).toBe(true);
        expect(voucher.includes(word(1000n))).toBe(true);
        expect(voucher.includes(voucherPayload)).toBe(true);

        const notice = fs.readFileSync(path.join(dir, "advance.output-1.bin"));
        expect(notice.subarray(0, 4).toString("hex")).toBe(SELECTOR.notice);
        expect(notice.includes(noticePayload)).toBe(true);

        // reports are raw
        expect(fs.readFileSync(path.join(dir, "advance.report-0.bin"))).toEqual(
            reportPayload,
        );

        // no more inputs: finish throws a RollupError carrying the errno
        try {
            rollup.finish();
            expect.unreachable("finish should throw");
        } catch (error) {
            expect(error).toBeInstanceOf(RollupError);
            const re = error as RollupError;
            expect(re.message).toMatch(/cmt_rollup_finish failed/);
            expect(re.errno).toBeLessThan(0);
            expect(re.syscall).toBe("cmt_rollup_finish");
        }

        rollup.close();
        expect(() => rollup.emitNotice(noticePayload)).toThrow(/closed/);
        rollup.close(); // idempotent
    });

    it("inspect request", () => {
        const payload = Buffer.from("inspect-query");
        writeInputs("inspect", [[1, "inspect.bin", payload]]);
        const rollup = new Rollup();

        const request = rollup.finish();
        expect(request.type).toBe("inspect");
        expect(request.payload).toEqual(payload);

        rollup.emitReport(Buffer.from("inspect-response"));
        rollup.close();
    });

    it("delegate call voucher", () => {
        const dir = writeInputs("dcv", [
            [0, "advance.bin", encodeEvmAdvance(ADVANCE)],
        ]);
        const rollup = new Rollup();
        rollup.finish();

        const destination = `0x${"bb".repeat(20)}` as const;
        const payload = Buffer.from("delegate-payload");
        expect(rollup.emitDelegateCallVoucher({ destination, payload })).toBe(
            0,
        );

        const output = fs.readFileSync(path.join(dir, "advance.output-0.bin"));
        expect(output.subarray(0, 4).toString("hex")).toBe(
            SELECTOR.delegateCallVoucher,
        );
        expect(output.includes(addressWord(destination))).toBe(true);
        expect(output.includes(payload)).toBe(true);
        rollup.close();
    });

    it("exception", () => {
        const dir = writeInputs("exception", [
            [0, "advance.bin", encodeEvmAdvance(ADVANCE)],
        ]);
        const rollup = new Rollup();
        rollup.finish();

        const payload = Buffer.from("something went wrong");
        rollup.emitException(payload);
        expect(
            fs.readFileSync(path.join(dir, "advance.exception-0.bin")),
        ).toEqual(payload);
        rollup.close();
    });

    it("gio request", () => {
        const reply = Buffer.from("gio-reply-data");
        writeInputs("gio", [[42, "gio-reply.bin", reply]]);
        const rollup = new Rollup();

        const response = rollup.gio({
            domain: 0xfefe,
            id: Buffer.from("gio-request-id"),
        });
        expect(response.responseCode).toBe(42);
        expect(response.responseData).toEqual(reply);
        rollup.close();
    });

    it("merkle save, reset and load", () => {
        writeInputs("merkle", [[0, "advance.bin", encodeEvmAdvance(ADVANCE)]]);
        const rollup = new Rollup();
        rollup.finish();
        rollup.emitNotice(Buffer.from("leaf"));

        const file = path.join(tmp, "merkle.bin");
        rollup.saveMerkle(file);
        expect(fs.statSync(file).size).toBeGreaterThan(0);
        rollup.resetMerkle();
        rollup.loadMerkle(file);
        rollup.close();

        // only one instance may be open at a time (-EBUSY otherwise)
        const another = new Rollup();
        try {
            new Rollup();
            expect.unreachable("second Rollup should throw");
        } catch (error) {
            expect(error).toBeInstanceOf(RollupError);
            expect((error as RollupError).syscall).toBe("cmt_rollup_init");
            expect((error as RollupError).errno).toBe(-16);
        }
        try {
            another.loadMerkle(path.join(tmp, "missing", "merkle.bin"));
            expect.unreachable("loadMerkle should throw");
        } catch (error) {
            expect(error).toBeInstanceOf(RollupError);
            expect((error as RollupError).syscall).toBe(
                "cmt_rollup_load_merkle",
            );
        }
        another.close();
    });

    it("run loop drives handlers until inputs are exhausted", async () => {
        const payloads = [Buffer.from("input-0"), Buffer.from("input-1")];
        writeInputs("run", [
            [
                0,
                "a.bin",
                encodeEvmAdvance({
                    ...ADVANCE,
                    payload: payloads[0] as Buffer,
                }),
            ],
            [
                0,
                "b.bin",
                encodeEvmAdvance({
                    ...ADVANCE,
                    payload: payloads[1] as Buffer,
                }),
            ],
        ]);
        const rollup = new Rollup();

        const seen: Buffer[] = [];
        await expect(
            rollup.run({
                advance: (request) => {
                    seen.push(request.payload);
                    return undefined;
                },
            }),
        ).rejects.toThrow(/cmt_rollup_finish failed/);
        expect(seen).toEqual(payloads);
        rollup.close();
    });

    it("input validation", () => {
        writeInputs("validation", [
            [0, "advance.bin", encodeEvmAdvance(ADVANCE)],
        ]);
        const rollup = new Rollup();
        rollup.finish();

        expect(() => rollup.emitVoucher({ destination: "0x1234" })).toThrow(
            /destination must be 20 bytes/,
        );
        expect(() =>
            rollup.emitVoucher({
                destination: "not-hex" as `0x${string}`,
            }),
        ).toThrow(TypeError);
        expect(() =>
            rollup.emitVoucher({
                destination: `0x${"aa".repeat(20)}`,
                value: -1n,
            }),
        ).toThrow(RangeError);
        expect(() => rollup.emitNotice(42 as unknown as Buffer)).toThrow(
            TypeError,
        );
        rollup.close();
    });
});
