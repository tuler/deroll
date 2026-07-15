// Minimal EVM-ABI helpers shared by the tests: enough to encode the
// EvmAdvance input the emulator would deliver. Deliberately independent of
// src/abi.ts so the tests don't validate the codec against itself.

export const SELECTOR = {
    evmAdvance: "415bf363", // EvmAdvance(uint256,address,address,uint256,uint256,uint256,uint256,bytes)
    voucher: "237a816f", // Voucher(address,uint256,bytes)
    delegateCallVoucher: "10321e8b", // DelegateCallVoucher(address,bytes)
    notice: "c258d6e5", // Notice(bytes)
};

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

const pad32 = (bytes: Buffer): Buffer =>
    Buffer.concat([bytes, Buffer.alloc((32 - (bytes.length % 32)) % 32)]);

export interface EvmAdvanceFields {
    chainId: bigint;
    appContract: string;
    msgSender: string;
    blockNumber: bigint;
    blockTimestamp: bigint;
    prevRandao: bigint;
    index: bigint;
    payload: Buffer;
}

export function encodeEvmAdvance(fields: EvmAdvanceFields): Buffer {
    return Buffer.concat([
        Buffer.from(SELECTOR.evmAdvance, "hex"),
        word(fields.chainId),
        addressWord(fields.appContract),
        addressWord(fields.msgSender),
        word(fields.blockNumber),
        word(fields.blockTimestamp),
        word(fields.prevRandao),
        word(fields.index),
        word(8 * 32), // offset of the payload `bytes` field
        word(fields.payload.length),
        pad32(fields.payload),
    ]);
}
