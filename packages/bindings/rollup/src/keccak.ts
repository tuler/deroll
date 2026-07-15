import { keccak_256 } from "@noble/hashes/sha3.js";

export const KECCAK_LENGTH = 32;

/** keccak-256 (Ethereum flavor, not NIST SHA3) over the concatenated chunks. */
export const keccak256 = (...chunks: Uint8Array[]): Buffer => {
    const hash = keccak_256.create();
    for (const chunk of chunks) {
        hash.update(chunk);
    }
    return Buffer.from(hash.digest());
};
