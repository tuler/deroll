import { Hex } from "ox";
import { describe, expect, it } from "vitest";
import {
    decodeAdvance,
    zeroHash,
    encodeAdvance,
    encodeCallVoucher,
    encodeErc20Transfer,
    encodeErc721Transfer,
    encodeErc1155BatchTransfer,
    encodeErc1155Transfer,
    encodeNotice,
} from "../src/index.js";

const utf8 = (s: string) => Hex.fromString(s);
const address = (n: number): Hex.Hex => `0x${String(n).padStart(40, "0")}`;
const APP_CONTEXT: Hex.Hex = `0x${"ff".padStart(64, "0")}`;

// Golden vectors from libcmt's own test data (machine-guest-tools 813ad1f,
// sys-utils/libcmt/tests/data.h), generated upstream with foundry's `cast`.
// Inputs are documented in sys-utils/libcmt/tests/create-data.sh.
const GOLDEN = {
    advance:
        "0x233a0ebf00000000000000000000000000000000000000000000000000000000000000010000000000000000000000000000000000000000000000000000000000000002000000000000000000000000000000000000000000000000000000000000000300000000000000000000000000000000000000000000000000000000000000040000000000000000000000000000000000000000000000000000000000000005000000000000000000000000000000000000000000000000000000000000000600000000000000000000000000000000000000000000000000000000000000070000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000000c45766d416476616e63652d300000000000000000000000000000000000000000",
    notice: "0xdd2a745300000000000000000000000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000000000000000000000004000000000000000000000000000000000000000000000000000000000000000084e6f746963652d30000000000000000000000000000000000000000000000000",
    callVoucher:
        "0x6062d5e200000000000000000000000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000d43616c6c566f75636865722d3000000000000000000000000000000000000000",
    erc20Transfer:
        "0xcd5bd08c00000000000000000000000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003",
    erc721Transfer:
        "0xc48121fd00000000000000000000000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000003",
    erc1155Transfer:
        "0xba112f8300000000000000000000000000000000000000000000000000000000000000ff0000000000000000000000000000000000000000000000000000000000000001000000000000000000000000000000000000000000000000000000000000000200000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000004",
    erc1155BatchTransfer:
        "0x2d5a3c2e00000000000000000000000000000000000000000000000000000000000000ff000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000020000000000000000000000000000000000000000000000000000000000000080000000000000000000000000000000000000000000000000000000000000000100000000000000000000000000000000000000000000000000000000000000030000000000000000000000000000000000000000000000000000000000000004",
};

describe("golden vectors (libcmt tests/data.h)", () => {
    it("encodeAdvance", () => {
        const encoded = encodeAdvance({
            chainId: 1n,
            appContract: address(2),
            msgSender: address(3),
            blockNumber: 4n,
            blockTimestamp: 5n,
            prevRandao: 6n,
            index: 7n,
            payload: utf8("EvmAdvance-0"),
        });
        expect(encoded).toEqual(GOLDEN.advance);
    });

    it("encodeNotice", () => {
        expect(
            encodeNotice({
                appContext: APP_CONTEXT,
                payload: utf8("Notice-0"),
            }),
        ).toEqual(GOLDEN.notice);
    });

    it("encodeCallVoucher", () => {
        const encoded = encodeCallVoucher({
            appContext: APP_CONTEXT,
            destination: address(1),
            value: 2n,
            payload: utf8("CallVoucher-0"),
        });
        expect(encoded).toEqual(GOLDEN.callVoucher);
    });

    it("encodeErc20Transfer", () => {
        const encoded = encodeErc20Transfer({
            appContext: APP_CONTEXT,
            recipient: address(1),
            token: address(2),
            value: 3n,
        });
        expect(encoded).toEqual(GOLDEN.erc20Transfer);
    });

    it("encodeErc721Transfer", () => {
        const encoded = encodeErc721Transfer({
            appContext: APP_CONTEXT,
            recipient: address(1),
            token: address(2),
            tokenId: 3n,
        });
        expect(encoded).toEqual(GOLDEN.erc721Transfer);
    });

    it("encodeErc1155Transfer", () => {
        const encoded = encodeErc1155Transfer({
            appContext: APP_CONTEXT,
            recipient: address(1),
            token: address(2),
            tokenId: 3n,
            value: 4n,
        });
        expect(encoded).toEqual(GOLDEN.erc1155Transfer);
    });

    it("encodeErc1155BatchTransfer", () => {
        const encoded = encodeErc1155BatchTransfer({
            appContext: APP_CONTEXT,
            recipient: address(1),
            token: address(2),
            items: [[3n, 4n]],
        });
        expect(encoded).toEqual(GOLDEN.erc1155BatchTransfer);
    });
});

describe("appContext default", () => {
    it("omitting appContext encodes the zero hash", () => {
        expect(zeroHash).toEqual(`0x${"00".repeat(32)}`);
        expect(encodeNotice({ payload: "0x1234" })).toEqual(
            encodeNotice({ appContext: zeroHash, payload: "0x1234" }),
        );
        const voucher = {
            destination: address(1),
            value: 0n,
            payload: "0x" as const,
        };
        expect(encodeCallVoucher(voucher)).toEqual(
            encodeCallVoucher({ ...voucher, appContext: zeroHash }),
        );
    });
});

describe("decodeAdvance", () => {
    const advance = {
        chainId: 31337n,
        appContract: `0x${"02".repeat(20)}` as Hex.Hex,
        msgSender: `0x${"03".repeat(20)}` as Hex.Hex,
        blockNumber: 456n,
        blockTimestamp: 1700000000n,
        prevRandao: 0xdeadbeefn,
        index: 7n,
        payload: utf8("hello from the chain"),
    };

    it("roundtrips with encodeAdvance", () => {
        expect(decodeAdvance(encodeAdvance(advance))).toEqual(advance);
    });

    it("rejects wrong selectors", () => {
        expect(() => decodeAdvance(GOLDEN.notice as Hex.Hex)).toThrow(
            /not an EvmAdvance/,
        );
    });
});

describe("errors come from ox", () => {
    const addr = address(1);

    it("rejects malformed addresses", () => {
        expect(() =>
            encodeCallVoucher({
                destination: "0x1234",
                appContext: APP_CONTEXT,
                value: 0n,
                payload: "0x",
            }),
        ).toThrow(/invalid/i);
    });

    it("rejects out-of-range integers", () => {
        expect(() =>
            encodeCallVoucher({
                destination: addr,
                appContext: APP_CONTEXT,
                value: -1n,
                payload: "0x",
            }),
        ).toThrow(/range/i);
        expect(() =>
            encodeAdvance({
                chainId: 1n << 64n,
                appContract: addr,
                msgSender: addr,
                blockNumber: 0n,
                blockTimestamp: 0n,
                prevRandao: 0n,
                index: 0n,
                payload: "0x",
            }),
        ).toThrow(/range/i);
    });
});
