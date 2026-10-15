/**
 * Reader for the batches the sequencer's batch submitter posts to the InputBox.
 *
 * A batch is a raw `ssz(Batch)` blob with no tag, as derived by ethereum_ssz
 * 0.10 for the types in `sequencer-core/src/batch.rs`:
 *
 *     Batch      { nonce: u64, frames: List<Frame> }
 *     Frame      { user_ops: List<WireUserOp>, safe_block: u64, fee_price: u16 }
 *     WireUserOp { nonce: u32, max_fee: u16, data: bytes, signature: bytes }
 *
 * Whether an input is a batch at all is decided by its `msg_sender` (the
 * pinned batch-submitter address), never by trying to decode it: a direct
 * input that happens to parse as SSZ is still a direct input.
 *
 * The verdict must match the scheduler's on every payload, so the canonical
 * decoder's lenient rules are mirrored rather than tightened: lists have no
 * length cap, zero-length items are not checked for separately, and the last
 * variable field of a container runs to the end of its slice. That last rule
 * means bytes past the encoded end are not "trailing": they become part of
 * the final op's signature, which then fails the scheduler's 65-byte check.
 *
 * Decoding never throws. Every malformation, including a payload that is not
 * hex at all, returns `{ ok: false }` with a reason for display; the reason is
 * not consensus-visible, the scheduler maps every failure to one
 * `BatchRejected(DecodeFailed)` outcome.
 */

import { type Hex, bytesToHex, hexToBytes, isHex } from "viem";

/** One user op exactly as carried in a frame. */
export interface WireUserOp {
    /** Sender's replay-protection nonce (`u32`). */
    readonly nonce: number;
    /** Fee cap as a log-space exponent (`u16`), see `feeToLinear`. */
    readonly maxFee: number;
    /** Application-defined payload, as signed. */
    readonly data: Hex;
    /** Signature bytes. Any length decodes; only 65 can be recovered. */
    readonly signature: Hex;
}

export interface Frame {
    readonly userOps: readonly WireUserOp[];
    /** L1 safe block the frame drains direct inputs up to (`u64`). */
    readonly safeBlock: bigint;
    /** Frame fee price as a log-space exponent (`u16`). */
    readonly feePrice: number;
}

export interface Batch {
    /** Batch nonce the scheduler orders and deduplicates by (`u64`). */
    readonly nonce: bigint;
    readonly frames: readonly Frame[];
}

export type DecodeBatchResult =
    | { readonly ok: true; readonly batch: Batch }
    | { readonly ok: false; readonly reason: string };

const OFFSET_BYTES = 4;
/** `nonce: u64` + frames offset. */
const BATCH_FIXED_BYTES = 8 + OFFSET_BYTES;
/** user_ops offset + `safe_block: u64` + `fee_price: u16`. */
const FRAME_FIXED_BYTES = OFFSET_BYTES + 8 + 2;
/** `nonce: u32` + `max_fee: u16` + data offset + signature offset. */
const USER_OP_FIXED_BYTES = 4 + 2 + OFFSET_BYTES + OFFSET_BYTES;

class Malformed extends Error {}

/** Decodes a batch payload, mirroring the scheduler's accept/reject verdict. */
export function decodeBatch(payload: Hex | Uint8Array): DecodeBatchResult {
    let bytes: Uint8Array;
    if (payload instanceof Uint8Array) {
        bytes = payload;
    } else if (isHex(payload, { strict: true }) && payload.length % 2 === 0) {
        bytes = hexToBytes(payload);
    } else {
        return { ok: false, reason: "payload is not even-length hex" };
    }
    try {
        return { ok: true, batch: readBatch(bytes) };
    } catch (error) {
        // Only the reader's own malformation errors become a verdict; anything
        // else is a bug in this module and must surface as one.
        if (error instanceof Malformed) {
            return { ok: false, reason: error.message };
        }
        throw error;
    }
}

function readBatch(bytes: Uint8Array): Batch {
    const view = new Reader(bytes, "batch");
    const nonce = view.u64(0);
    const framesOffset = view.u32(8);
    view.expectFirstOffset(framesOffset, BATCH_FIXED_BYTES);
    const frames = readVariableList(
        bytes.subarray(BATCH_FIXED_BYTES),
        readFrame,
        "frames",
    );
    return { nonce, frames };
}

function readFrame(bytes: Uint8Array, path: string): Frame {
    const view = new Reader(bytes, path);
    const userOpsOffset = view.u32(0);
    const safeBlock = view.u64(4);
    const feePrice = view.u16(12);
    view.expectFirstOffset(userOpsOffset, FRAME_FIXED_BYTES);
    const userOps = readVariableList(
        bytes.subarray(FRAME_FIXED_BYTES),
        readUserOp,
        `${path}.user_ops`,
    );
    return { userOps, safeBlock, feePrice };
}

function readUserOp(bytes: Uint8Array, path: string): WireUserOp {
    const view = new Reader(bytes, path);
    const nonce = view.u32(0);
    const maxFee = view.u16(4);
    const dataOffset = view.u32(6);
    const signatureOffset = view.u32(10);
    view.expectFirstOffset(dataOffset, USER_OP_FIXED_BYTES);
    if (signatureOffset < dataOffset) {
        throw new Malformed(`${path}: signature offset precedes data offset`);
    }
    if (signatureOffset > bytes.length) {
        throw new Malformed(`${path}: signature offset is out of bounds`);
    }
    return {
        nonce,
        maxFee,
        data: bytesToHex(bytes.subarray(dataOffset, signatureOffset)),
        // The last variable field runs to the end of the item slice.
        signature: bytesToHex(bytes.subarray(signatureOffset)),
    };
}

/**
 * An SSZ list of variable-size items: an offset table, then the items. An
 * empty region is an empty list; otherwise the first offset fixes the item
 * count, and every offset must stay in bounds and never decrease.
 */
function readVariableList<T>(
    bytes: Uint8Array,
    readItem: (item: Uint8Array, path: string) => T,
    path: string,
): T[] {
    const items: T[] = [];
    if (bytes.length === 0) return items;
    const view = new Reader(bytes, path);
    const first = view.u32(0);
    if (first > bytes.length) {
        throw new Malformed(`${path}: first offset is out of bounds`);
    }
    if (first < OFFSET_BYTES || first % OFFSET_BYTES !== 0) {
        throw new Malformed(
            `${path}: first offset is not a whole offset table`,
        );
    }
    // first <= bytes.length, so every offset-table read below is in bounds.
    const count = first / OFFSET_BYTES;
    let start = first;
    for (let index = 0; index < count; index++) {
        let end = bytes.length;
        if (index + 1 < count) {
            end = view.u32((index + 1) * OFFSET_BYTES);
            if (end > bytes.length) {
                throw new Malformed(
                    `${path}[${index + 1}]: offset is out of bounds`,
                );
            }
            if (end < start) {
                throw new Malformed(`${path}[${index + 1}]: offsets decrease`);
            }
        }
        items.push(readItem(bytes.subarray(start, end), `${path}[${index}]`));
        start = end;
    }
    return items;
}

/** Bounds-checked little-endian reads over one container's slice. */
class Reader {
    private readonly bytes: Uint8Array;
    private readonly path: string;
    private readonly view: DataView;

    constructor(bytes: Uint8Array, path: string) {
        this.bytes = bytes;
        this.path = path;
        this.view = new DataView(bytes.buffer, bytes.byteOffset, bytes.length);
    }

    u16(at: number): number {
        this.need(at, 2);
        return this.view.getUint16(at, true);
    }

    u32(at: number): number {
        this.need(at, 4);
        return this.view.getUint32(at, true);
    }

    u64(at: number): bigint {
        this.need(at, 8);
        return this.view.getBigUint64(at, true);
    }

    /** A container's first offset must point right past its fixed portion. */
    expectFirstOffset(offset: number, fixedBytes: number): void {
        if (offset !== fixedBytes) {
            throw new Malformed(
                `${this.path}: first offset is ${offset}, expected ${fixedBytes}`,
            );
        }
    }

    private need(at: number, width: number): void {
        if (at + width > this.bytes.length) {
            throw new Malformed(
                `${this.path}: truncated, ${this.bytes.length} bytes`,
            );
        }
    }
}
