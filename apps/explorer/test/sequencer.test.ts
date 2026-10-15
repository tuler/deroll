import { describe, expect, test } from "vitest";
import { type Address, type Hex, getAddress, hexToBytes } from "viem";
import { type Batch, decodeBatch } from "../src/sequencer/batch";
import { FEE_MAX_EXPONENT, feeToLinear } from "../src/sequencer/fee";
import { recoverUserOpSigner } from "../src/sequencer/recover";
import vectors from "./fixtures/sequencer-vectors.json";

// Every vector here is produced by the sequencer's own Rust types
// (scripts/fixturegen, run through scripts/generate-fixtures.sh, pinned to a
// cartesi/sequencer revision): the encodings
// by `as_ssz_bytes`, the accept/reject verdicts by `from_ssz_bytes`, the
// recovered signers by a copy of the scheduler's `recover_sender`, and the fee
// values by `fee_to_linear`. Matching them is the whole contract.

interface RustBatch {
    nonce: string;
    frames: {
        safe_block: string;
        fee_price: number;
        user_ops: {
            nonce: number;
            max_fee: number;
            data: string;
            signature: string;
        }[];
    }[];
}

function fromRust(batch: RustBatch): Batch {
    return {
        nonce: BigInt(batch.nonce),
        frames: batch.frames.map((frame) => ({
            userOps: frame.user_ops.map((op) => ({
                nonce: op.nonce,
                maxFee: op.max_fee,
                data: op.data as Hex,
                signature: op.signature as Hex,
            })),
            safeBlock: BigInt(frame.safe_block),
            feePrice: frame.fee_price,
        })),
    };
}

/** Mirror of `digest` in scripts/fixturegen. */
function digest(batch: Batch): string {
    const frames = batch.frames.map((frame) => {
        const ops = frame.userOps
            .map(
                (op) =>
                    `${op.nonce}.${op.maxFee}.${op.data.slice(2)}.${op.signature.slice(2)}`,
            )
            .join(",");
        return `${frame.safeBlock}/${frame.feePrice}/${ops}`;
    });
    return `${batch.nonce}|${frames.join(";")}`;
}

const application = vectors.application as Address;

/** The valid vector with this name; a missing one fails the test. */
function named(name: string) {
    const vector = vectors.valid.find((v) => v.name === name);
    if (!vector) throw new Error(`no ${name} vector`);
    return vector;
}

/** The value, asserting that it is present. */
function present<T>(value: T | undefined): T {
    if (value === undefined) throw new Error("missing value");
    return value;
}

describe("decodeBatch", () => {
    test.each(vectors.valid.map((v) => [v.name, v] as const))(
        "decodes the Rust encoding of the %s batch",
        (_, vector) => {
            const result = decodeBatch(vector.bytes as Hex);
            expect(result).toEqual({
                ok: true,
                batch: fromRust(vector.batch),
            });
        },
    );

    test("accepts bytes and hex alike", () => {
        const vector = named("mixed");
        expect(decodeBatch(hexToBytes(vector.bytes as Hex))).toEqual(
            decodeBatch(vector.bytes as Hex),
        );
    });

    test(`agrees with ethereum_ssz on ${vectors.adversarial.length} truncated, mutated and random payloads`, () => {
        let accepted = 0;
        for (const [bytes, expected] of vectors.adversarial) {
            const result = decodeBatch(bytes as Hex);
            const actual = result.ok ? digest(result.batch) : null;
            expect({ bytes, actual }).toEqual({ bytes, actual: expected });
            if (result.ok) accepted++;
        }
        // Both verdicts are exercised, not just rejection.
        expect(accepted).toBeGreaterThan(50);
        expect(vectors.adversarial.length - accepted).toBeGreaterThan(50);
    });

    test("rejects a list whose first offset is not a whole offset table", () => {
        // ethereum_ssz rejects this before reading any item. Without the check
        // the item count is fractional and the reader would carve items out of
        // the offset table itself.
        const vector = named("empty-frame");
        const bytes = hexToBytes(vector.bytes as Hex);
        const list = bytes.subarray(12);
        const shifted = new Uint8Array(bytes.length + 1);
        shifted.set(bytes.subarray(0, 12));
        shifted.set([5, 0, 0, 0, 0], 12);
        shifted.set(list.subarray(4), 17);
        expect(decodeBatch(shifted)).toEqual({
            ok: false,
            reason: "frames: first offset is not a whole offset table",
        });
    });

    test("bytes past the encoded end become the last signature, as in Rust", () => {
        // ethereum_ssz has no notion of trailing bytes in a container whose
        // last field is variable-size: the field runs to the end of its slice.
        // Tightening this would call a batch malformed that the scheduler
        // accepts.
        const vector = named("rust-sample");
        const result = decodeBatch(`${vector.bytes}00ff` as Hex);
        if (!result.ok) throw new Error(result.reason);
        const last = present(
            present(result.batch.frames.at(-1)).userOps.at(-1),
        );
        expect(last.signature).toBe(`0x${"ee".repeat(65)}00ff`);
    });

    test("never throws on input that is not hex", () => {
        for (const payload of ["", "0x0", "0xzz", "deadbeef", "0x123"]) {
            expect(decodeBatch(payload as Hex).ok).toBe(false);
        }
    });

    test("never throws on random bytes", () => {
        let seed = 0x2545f491;
        const next = () => {
            seed ^= seed << 13;
            seed ^= seed >>> 17;
            seed ^= seed << 5;
            return seed >>> 0;
        };
        for (let round = 0; round < 20_000; round++) {
            const bytes = new Uint8Array(next() % 160);
            for (let index = 0; index < bytes.length; index++) {
                const value = next();
                bytes[index] = value % 3 === 0 ? value >>> 24 : value % 32;
            }
            // Plausible offsets reach the nested readers more often.
            if (bytes.length >= 12 && next() % 2 === 0) bytes[8] = 12;
            if (bytes.length >= 16 && next() % 2 === 0) bytes[12] = 4;
            expect(() => decodeBatch(bytes)).not.toThrow();
        }
    });

    test("rejects an offset table claiming more items than the region holds", () => {
        // frames offset 12, then a list whose first offset is 0xfffffffc.
        const bytes = new Uint8Array(16);
        bytes[8] = 12;
        bytes.set([0xfc, 0xff, 0xff, 0xff], 12);
        expect(decodeBatch(bytes)).toEqual({
            ok: false,
            reason: "frames: first offset is out of bounds",
        });
    });
});

describe("recoverUserOpSigner", () => {
    test("recovers the scheduler's sender for every op of the mixed batch", async () => {
        const vector = named("mixed");
        const batch = fromRust(vector.batch);
        const ops = batch.frames.flatMap((frame) => frame.userOps);
        const recovered = await Promise.all(
            ops.map((userOp) =>
                recoverUserOpSigner({
                    userOp,
                    application,
                    chainId: vectors.chain_id,
                }),
            ),
        );
        expect(recovered).toEqual(vectors.mixed_senders as (Address | null)[]);
        expect(recovered).toContain(getAddress(vectors.signers.alice));
        expect(recovered).toContain(getAddress(vectors.signers.bob));
    });

    const mixedOp = present(
        present(fromRust(named("mixed").batch).frames[0]).userOps[0],
    );
    // The signature cases are all over one message; only the signature varies.
    const message = { ...mixedOp, nonce: 5, maxFee: 300 };

    test.each(vectors.signature_cases.map((c) => [c.name, c] as const))(
        "matches alloy on signature case %s",
        async (_, vector) => {
            const recovered = await recoverUserOpSigner({
                userOp: { ...message, signature: vector.signature as Hex },
                application,
                chainId: vector.chain_id,
            });
            expect(recovered).toBe(vector.recovered as Address | null);
        },
    );

    test("binds to the application address", async () => {
        const canonical = present(
            vectors.signature_cases.find((c) => c.name === "canonical-27-28"),
        );
        const recovered = await recoverUserOpSigner({
            userOp: { ...message, signature: canonical.signature as Hex },
            application: "0x0000000000000000000000000000000000000001",
            chainId: vectors.chain_id,
        });
        expect(recovered).not.toBeNull();
        expect(recovered).not.toBe(canonical.recovered as Address);
    });
});

describe("feeToLinear", () => {
    test("pins the maximum exponent to fee.rs", () => {
        expect(FEE_MAX_EXPONENT).toBe(vectors.fee.max_exponent);
    });

    test.each(vectors.fee.vectors.map(([e, v]) => [e as number, v as string]))(
        "matches fee_to_linear(%d)",
        (exponent, linear) => {
            expect(feeToLinear(exponent)).toBe(BigInt(linear));
        },
    );

    test("refuses exponents fee_to_linear panics on", () => {
        expect(() => feeToLinear(FEE_MAX_EXPONENT + 1)).toThrow(RangeError);
        expect(() => feeToLinear(-1)).toThrow(RangeError);
        expect(() => feeToLinear(1.5)).toThrow(RangeError);
    });
});
