import { encodeFunctionData, parseAbi } from "viem";
import { describe, expect, it } from "vitest";
import {
    decodeEvmAdvance,
    encodeDelegateCallVoucher,
    encodeNotice,
    encodeVoucher,
} from "../src/abi.js";

// cross-check the hand-rolled frames against viem's ABI encoder
const abi = parseAbi([
    "function Voucher(address destination, uint256 value, bytes payload)",
    "function DelegateCallVoucher(address destination, bytes payload)",
    "function Notice(bytes payload)",
    "function EvmAdvance(uint256 chainId, address appContract, address msgSender, uint256 blockNumber, uint256 blockTimestamp, uint256 prevRandao, uint256 index, bytes payload)",
]);

const hex = (data: Buffer): `0x${string}` => `0x${data.toString("hex")}`;

const DESTINATION = `0x${"aa".repeat(20)}` as const;
const PAYLOADS = [
    Buffer.alloc(0),
    Buffer.from("odd sized payload!"),
    Buffer.alloc(32, 0x55),
    Buffer.alloc(97, 0x77),
];

describe("output frames match viem encoding", () => {
    it.each(
        PAYLOADS.map((p) => [p.length, p] as const),
    )("voucher with %d-byte payload", (_, payload) => {
        const frame = encodeVoucher(
            Buffer.from(DESTINATION.slice(2), "hex"),
            Buffer.from(
                `${"00".repeat(30)}03e8`, // 1000
                "hex",
            ),
            payload,
        );
        expect(hex(frame)).toBe(
            encodeFunctionData({
                abi,
                functionName: "Voucher",
                args: [DESTINATION, 1000n, hex(payload)],
            }),
        );
    });

    it.each(
        PAYLOADS.map((p) => [p.length, p] as const),
    )("delegate call voucher with %d-byte payload", (_, payload) => {
        const frame = encodeDelegateCallVoucher(
            Buffer.from(DESTINATION.slice(2), "hex"),
            payload,
        );
        expect(hex(frame)).toBe(
            encodeFunctionData({
                abi,
                functionName: "DelegateCallVoucher",
                args: [DESTINATION, hex(payload)],
            }),
        );
    });

    it.each(
        PAYLOADS.map((p) => [p.length, p] as const),
    )("notice with %d-byte payload", (_, payload) => {
        const frame = encodeNotice(payload);
        expect(hex(frame)).toBe(
            encodeFunctionData({
                abi,
                functionName: "Notice",
                args: [hex(payload)],
            }),
        );
    });
});

describe("EvmAdvance decoding", () => {
    const fields = {
        chainId: 31337n,
        appContract: `0x${"02".repeat(20)}` as const,
        msgSender: `0x${"03".repeat(20)}` as const,
        blockNumber: 456n,
        blockTimestamp: 1700000000n,
        prevRandao: 0xdeadbeefn,
        index: 7n,
        payload: Buffer.from("hello from the chain"),
    };

    const encode = (payload: Buffer): Buffer =>
        Buffer.from(
            encodeFunctionData({
                abi,
                functionName: "EvmAdvance",
                args: [
                    fields.chainId,
                    fields.appContract,
                    fields.msgSender,
                    fields.blockNumber,
                    fields.blockTimestamp,
                    fields.prevRandao,
                    fields.index,
                    hex(payload),
                ],
            }).slice(2),
            "hex",
        );

    it("roundtrips a viem-encoded input", () => {
        const advance = decodeEvmAdvance(encode(fields.payload));
        expect(advance.chainId).toBe(fields.chainId);
        expect(hex(advance.appContract)).toBe(fields.appContract);
        expect(hex(advance.msgSender)).toBe(fields.msgSender);
        expect(advance.blockNumber).toBe(fields.blockNumber);
        expect(advance.blockTimestamp).toBe(fields.blockTimestamp);
        expect(BigInt(hex(advance.prevRandao))).toBe(fields.prevRandao);
        expect(advance.index).toBe(fields.index);
        expect(advance.payload).toEqual(fields.payload);
    });

    it("roundtrips an empty payload", () => {
        expect(decodeEvmAdvance(encode(Buffer.alloc(0))).payload).toEqual(
            Buffer.alloc(0),
        );
    });

    it("rejects a wrong selector", () => {
        const frame = encode(fields.payload);
        frame[0] = 0xff;
        expect(() => decodeEvmAdvance(frame)).toThrow();
    });

    it("rejects truncated input", () => {
        const frame = encode(fields.payload);
        expect(() =>
            decodeEvmAdvance(frame.subarray(0, frame.length - 32)),
        ).toThrow();
    });

    it("rejects a chainId wider than 64 bits", () => {
        const frame = encode(fields.payload);
        frame[4] = 0x01; // most significant byte of chainId
        expect(() => decodeEvmAdvance(frame)).toThrow();
    });
});
