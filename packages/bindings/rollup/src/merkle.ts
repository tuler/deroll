// Incremental outputs merkle tree, ported from libcmt's merkle.c: a
// fixed-height (63) binary tree of keccak-256 hashes where only the hashes of
// complete subtrees are kept, one per level.
import { EINVAL, ENOBUFS, ErrnoError } from "./errors.js";
import { KECCAK_LENGTH, keccak256 } from "./keccak.js";

export const MERKLE_TREE_HEIGHT = 63;
const MAX_LEAF_COUNT = 1n << BigInt(MERKLE_TREE_HEIGHT);

// pristine_hash[i] is the root of an empty subtree of height i:
// pristine_hash[0] is the zero leaf, each level hashes two copies of the
// previous one. Matches the precomputed table in merkle.c.
const pristine: Buffer[] = [Buffer.alloc(KECCAK_LENGTH)];
for (let i = 1; i <= MERKLE_TREE_HEIGHT; i++) {
    const below = pristine[i - 1] as Buffer;
    pristine.push(keccak256(below, below));
}

export const pristineHash = (level: number): Buffer =>
    Buffer.from(pristine[level] as Buffer);

/** Serialized size: uint64 leaf count + one hash per level (cmt_merkle_t). */
export const MERKLE_STATE_LENGTH = 8 + MERKLE_TREE_HEIGHT * KECCAK_LENGTH;

export class Merkle {
    #leafCount = 0n;
    #state: Buffer; // MERKLE_TREE_HEIGHT hashes of complete subtrees

    constructor() {
        this.#state = Buffer.alloc(MERKLE_TREE_HEIGHT * KECCAK_LENGTH);
    }

    get leafCount(): bigint {
        return this.#leafCount;
    }

    reset(): void {
        this.#leafCount = 0n;
        this.#state.fill(0);
    }

    #level(i: number): Buffer {
        return this.#state.subarray(i * KECCAK_LENGTH, (i + 1) * KECCAK_LENGTH);
    }

    /** Append a leaf hash. Throws -ENOBUFS when the tree is full. */
    pushBack(hash: Buffer): void {
        if (this.#leafCount === MAX_LEAF_COUNT) {
            throw new ErrnoError(ENOBUFS);
        }
        let right: Buffer = Buffer.from(hash);
        for (let i = 0; i < MERKLE_TREE_HEIGHT; i++) {
            const bit = 1n << BigInt(i);
            if (this.#leafCount & bit) {
                // a complete subtree of this size exists: merge and carry up
                right = keccak256(this.#level(i), right);
            } else {
                right.copy(this.#level(i));
                break;
            }
        }
        this.#leafCount++;
    }

    /** Append a leaf whose hash is keccak-256 of `data`. */
    pushBackData(data: Buffer): void {
        this.pushBack(keccak256(data));
    }

    getRootHash(): Buffer {
        let root = pristineHash(0);
        for (let i = 0; i < MERKLE_TREE_HEIGHT; i++) {
            const bit = 1n << BigInt(i);
            root =
                this.#leafCount & bit
                    ? keccak256(this.#level(i), root)
                    : keccak256(root, pristineHash(i));
        }
        return root;
    }

    /** Serialize to the cmt_merkle_t binary layout (little-endian leaf count). */
    save(): Buffer {
        const out = Buffer.alloc(MERKLE_STATE_LENGTH);
        out.writeBigUInt64LE(this.#leafCount, 0);
        this.#state.copy(out, 8);
        return out;
    }

    /** Restore from the cmt_merkle_t binary layout. Throws -EINVAL on bad size. */
    load(data: Buffer): void {
        if (data.length !== MERKLE_STATE_LENGTH) {
            throw new ErrnoError(EINVAL);
        }
        this.#leafCount = data.readBigUInt64LE(0);
        data.copy(this.#state, 0, 8);
    }
}
