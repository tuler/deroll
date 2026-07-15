// EVM-ABI frames used by the rollup protocol, ported from libcmt's abi.c and
// the frame layouts in rollup.c. Only what the protocol needs: the four
// output/input frames, not a general ABI codec.
import { EBADMSG, EDOM, ENOBUFS, ErrnoError } from "./errors.js";

export const ADDRESS_LENGTH = 20;
export const U256_LENGTH = 32;

// function selectors (keccak-256 of the canonical signature, first 4 bytes)
export const VOUCHER_FUNSEL = Buffer.from("237a816f", "hex"); // Voucher(address,uint256,bytes)
export const DELEGATE_CALL_VOUCHER_FUNSEL = Buffer.from("10321e8b", "hex"); // DelegateCallVoucher(address,bytes)
export const NOTICE_FUNSEL = Buffer.from("c258d6e5", "hex"); // Notice(bytes)
export const EVM_ADVANCE_FUNSEL = Buffer.from("415bf363", "hex"); // EvmAdvance(uint256,address,address,uint256,uint256,uint256,uint256,bytes)

const align32 = (length: number): number => Math.ceil(length / 32) * 32;

/** Encode an unsigned integer as a 32-byte big-endian word. */
export const uintWord = (value: bigint): Buffer => {
    const word = Buffer.alloc(U256_LENGTH);
    let v = value;
    for (let i = U256_LENGTH - 1; i >= 0 && v > 0n; i--) {
        word[i] = Number(v & 0xffn);
        v >>= 8n;
    }
    return word;
};

/** Left-pad a byte string (address or u256) to a 32-byte word. */
const bytesWord = (bytes: Buffer): Buffer =>
    Buffer.concat([Buffer.alloc(U256_LENGTH - bytes.length), bytes]);

/** Trailing dynamic `bytes` field: length word + data padded to 32 bytes. */
const bytesTail = (payload: Buffer): Buffer =>
    Buffer.concat([
        uintWord(BigInt(payload.length)),
        payload,
        Buffer.alloc(align32(payload.length) - payload.length),
    ]);

/** Voucher(address destination, uint256 value, bytes payload) */
export const encodeVoucher = (
    destination: Buffer,
    value: Buffer,
    payload: Buffer,
): Buffer =>
    Buffer.concat([
        VOUCHER_FUNSEL,
        bytesWord(destination),
        bytesWord(value),
        uintWord(0x60n), // offset of `payload` relative to the frame start
        bytesTail(payload),
    ]);

/** DelegateCallVoucher(address destination, bytes payload) */
export const encodeDelegateCallVoucher = (
    destination: Buffer,
    payload: Buffer,
): Buffer =>
    Buffer.concat([
        DELEGATE_CALL_VOUCHER_FUNSEL,
        bytesWord(destination),
        uintWord(0x40n),
        bytesTail(payload),
    ]);

/** Notice(bytes payload) */
export const encodeNotice = (payload: Buffer): Buffer =>
    Buffer.concat([NOTICE_FUNSEL, uintWord(0x20n), bytesTail(payload)]);

export interface EvmAdvance {
    chainId: bigint;
    appContract: Buffer;
    msgSender: Buffer;
    blockNumber: bigint;
    blockTimestamp: bigint;
    prevRandao: Buffer;
    index: bigint;
    payload: Buffer;
}

// Reader over an ABI frame, mirroring the cmt_buf_t/cmt_abi_get_* pairing:
// a cursor walking the head words plus absolute access for the dynamic tail.
class FrameReader {
    #frame: Buffer;
    #position = 0;

    constructor(frame: Buffer) {
        this.#frame = frame;
    }

    #word(): Buffer {
        if (this.#position + U256_LENGTH > this.#frame.length) {
            throw new ErrnoError(ENOBUFS);
        }
        const word = this.#frame.subarray(
            this.#position,
            this.#position + U256_LENGTH,
        );
        this.#position += U256_LENGTH;
        return word;
    }

    /** Read a word as an unsigned integer of at most `bytes` bytes (-EDOM overflow). */
    uint(bytes: number): bigint {
        const word = this.#word();
        for (let i = 0; i < U256_LENGTH - bytes; i++) {
            if (word[i] !== 0) {
                throw new ErrnoError(EDOM);
            }
        }
        let value = 0n;
        for (let i = U256_LENGTH - bytes; i < U256_LENGTH; i++) {
            value = (value << 8n) | BigInt(word[i] as number);
        }
        return value;
    }

    /** Read a word as a right-aligned byte string of exactly `bytes` bytes. */
    bytesN(bytes: number): Buffer {
        const word = this.#word();
        for (let i = 0; i < U256_LENGTH - bytes; i++) {
            if (word[i] !== 0) {
                throw new ErrnoError(EDOM);
            }
        }
        return Buffer.from(word.subarray(U256_LENGTH - bytes));
    }

    /** Read a dynamic `bytes` field: offset word here, length+data in the tail. */
    bytesDynamic(): Buffer {
        const offset = this.uint(8);
        if (offset + BigInt(U256_LENGTH) > BigInt(this.#frame.length)) {
            throw new ErrnoError(ENOBUFS);
        }
        const lengthPosition = Number(offset);
        const lengthWord = this.#frame.subarray(
            lengthPosition,
            lengthPosition + U256_LENGTH,
        );
        let length = 0n;
        for (let i = 0; i < U256_LENGTH; i++) {
            const byte = BigInt(lengthWord[i] as number);
            if (i < U256_LENGTH - 8 && byte !== 0n) {
                throw new ErrnoError(EDOM);
            }
            length = (length << 8n) | byte;
        }
        const begin = lengthPosition + U256_LENGTH;
        const end = begin + Number(length);
        if (end > this.#frame.length) {
            throw new ErrnoError(ENOBUFS);
        }
        return Buffer.from(this.#frame.subarray(begin, end));
    }
}

/**
 * Decode an EvmAdvance input frame (funsel followed by the ABI frame).
 * Throws {@link ErrnoError} on malformed input.
 */
export const decodeEvmAdvance = (input: Buffer): EvmAdvance => {
    if (input.length < 4) {
        throw new ErrnoError(ENOBUFS);
    }
    if (!input.subarray(0, 4).equals(EVM_ADVANCE_FUNSEL)) {
        throw new ErrnoError(EBADMSG);
    }
    // offsets of dynamic fields are relative to the frame start (after funsel)
    const reader = new FrameReader(input.subarray(4));
    return {
        chainId: reader.uint(8),
        appContract: reader.bytesN(ADDRESS_LENGTH),
        msgSender: reader.bytesN(ADDRESS_LENGTH),
        blockNumber: reader.uint(8),
        blockTimestamp: reader.uint(8),
        prevRandao: reader.bytesN(U256_LENGTH),
        index: reader.uint(8),
        payload: reader.bytesDynamic(),
    };
};
