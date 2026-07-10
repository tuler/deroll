// Standard Cartesi portal deposit decoding — shared across all applications.
//
// Asset deposits are not application-specific: every Cartesi app receives the
// same portal message, defined by the canonical InputEncoding library in
// cartesi/rollups-contracts (src/common/InputEncoding.sol). The explorer uses
// this module to decode deposits by itself — decoder authors never handle the
// deposit envelope. The only decoder-facing part of a deposit is the
// app-specific data attached to it (execLayerData / baseLayerData), exposed
// through the optional `deposit` decode method (see ./types).

import { ByteReader, formatUnits, isHex, shortHex } from "./bytes";
import type { DecodeResult, Input, Tag } from "./types";

/** The Cartesi portal contracts that produce deposit inputs. */
export type PortalKind =
    | "EtherPortal"
    | "ERC20Portal"
    | "ERC721Portal"
    | "ERC1155SinglePortal"
    | "ERC1155BatchPortal";

/**
 * Deterministic Cartesi portal addresses (lowercase), as published by
 * @cartesi/viem and the rollups-node address book. Identical across chains
 * for a given Rollups version. Map an input's lowercase sender through this
 * to decide whether it is a deposit.
 */
export const PORTAL_ADDRESSES: Readonly<Record<string, PortalKind>> = {
    "0x8b53327575ac999bdfa8003f4b5134dff9027516": "EtherPortal",
    "0x22e57511c30cce6cdaa742e13ce3b774fdc663b1": "ERC20Portal",
    "0xca3a0a47915c12f020cf70b938acc8e744414cb8": "ERC721Portal",
    "0x13663e193673756a02e84b724b8a3422a9a7aab4": "ERC1155SinglePortal",
    "0x3649c5e2de91c69a7bb80d864f0039da5e511096": "ERC1155BatchPortal",
};

const ETHER_DECIMALS = 18; // wei → ETH is a protocol constant, safe to format

/** Common fields decoded from a portal deposit. `portal` identifies the source. */
interface PortalDepositBase {
    portal: PortalKind;
    /** The depositing account (encoded in the payload, distinct from the input sender). */
    sender: string;
}

export interface EtherDeposit extends PortalDepositBase {
    portal: "EtherPortal";
    /** Deposited amount formatted as ETH. */
    ether: string;
    /** Deposited amount in wei (decimal string). */
    wei: string;
    /** App-specific data attached to the deposit. */
    execLayerData?: string;
}

export interface ERC20Deposit extends PortalDepositBase {
    portal: "ERC20Portal";
    token: string;
    /** Raw on-chain token amount (decimal string); the portal carries no token decimals. */
    amount: string;
    /** App-specific data attached to the deposit. */
    execLayerData?: string;
}

export interface ERC721Deposit extends PortalDepositBase {
    portal: "ERC721Portal";
    token: string;
    tokenId: string;
    /** App-specific data attached on the base layer (L1-visible). */
    baseLayerData?: string;
    /** App-specific data attached for the execution layer. */
    execLayerData?: string;
    /** Raw abi.encode(baseLayerData, execLayerData), kept only when it cannot be decoded. */
    data?: string;
}

export interface ERC1155SingleDeposit extends PortalDepositBase {
    portal: "ERC1155SinglePortal";
    token: string;
    tokenId: string;
    value: string;
    /** App-specific data attached on the base layer (L1-visible). */
    baseLayerData?: string;
    /** App-specific data attached for the execution layer. */
    execLayerData?: string;
    /** Raw abi.encode(baseLayerData, execLayerData), kept only when it cannot be decoded. */
    data?: string;
}

export interface ERC1155BatchDeposit extends PortalDepositBase {
    portal: "ERC1155BatchPortal";
    token: string;
    /** Deposited token ids (decimal strings). */
    tokenIds?: string[];
    /** Deposited amount per token id (decimal strings). */
    values?: string[];
    /** App-specific data attached on the base layer (L1-visible). */
    baseLayerData?: string;
    /** App-specific data attached for the execution layer. */
    execLayerData?: string;
    /** Raw abi.encode(tokenIds, values, baseLayerData, execLayerData), kept only when it cannot be decoded. */
    data?: string;
}

export type PortalDeposit =
    | EtherDeposit
    | ERC20Deposit
    | ERC721Deposit
    | ERC1155SingleDeposit
    | ERC1155BatchDeposit;

// ---- Minimal abi.decode for the portals' trailing data blobs ----
// (kept hand-rolled so the module stays dependency-free)

/** Reads the 32-byte big-endian word at `offset`, or null when out of bounds. */
function word(bytes: Uint8Array, offset: number): bigint | null {
    if (offset < 0 || offset + 32 > bytes.length) return null;
    let value = 0n;
    for (let i = 0; i < 32; i++) value = (value << 8n) | BigInt(bytes[offset + i]);
    return value;
}

function hexSlice(bytes: Uint8Array, start: number, length: number): string {
    let out = "0x";
    for (let i = 0; i < length; i++)
        out += bytes[start + i].toString(16).padStart(2, "0");
    return out;
}

/** Reads a dynamic `bytes` field whose offset word sits at head+slot*32; empty → undefined. */
function abiBytes(
    bytes: Uint8Array,
    head: number,
    slot: number,
): string | undefined | null {
    const offset = word(bytes, head + slot * 32);
    if (offset === null) return null;
    const at = head + Number(offset);
    const length = word(bytes, at);
    if (length === null) return null;
    const n = Number(length);
    if (at + 32 + n > bytes.length) return null;
    return n === 0 ? undefined : hexSlice(bytes, at + 32, n);
}

/** Reads a dynamic `uint256[]` field whose offset word sits at head+slot*32. */
function abiUintArray(
    bytes: Uint8Array,
    head: number,
    slot: number,
): string[] | null {
    const offset = word(bytes, head + slot * 32);
    if (offset === null) return null;
    const at = head + Number(offset);
    const length = word(bytes, at);
    if (length === null) return null;
    const n = Number(length);
    if (at + 32 + n * 32 > bytes.length) return null;
    const out: string[] = [];
    for (let i = 0; i < n; i++) {
        const item = word(bytes, at + 32 + i * 32);
        if (item === null) return null;
        out.push(item.toString());
    }
    return out;
}

/**
 * Decode a payload as a deposit from the given portal, following the canonical
 * InputEncoding layout. Returns the structured deposit, or null when the
 * payload is too short to be valid for that portal. The abi-encoded trailing
 * blobs of the NFT portals are decoded into baseLayerData/execLayerData; when
 * a blob is malformed it is kept raw under `data` instead.
 */
export function decodePortalDeposit(
    payload: string,
    portal: PortalKind,
): PortalDeposit | null {
    if (!isHex(payload)) return null;
    const r = new ByteReader(payload);
    const len = r.bytes.length;
    switch (portal) {
        case "EtherPortal": {
            if (len < 52) return null; // sender(20) + value(32)
            const sender = r.address();
            const wei = r.u256();
            return {
                portal,
                sender,
                ether: formatUnits(wei, ETHER_DECIMALS),
                wei: wei.toString(),
                execLayerData: r.rest(),
            };
        }
        case "ERC20Portal": {
            if (len < 72) return null; // token(20) + sender(20) + value(32)
            const token = r.address();
            const sender = r.address();
            return {
                portal,
                token,
                sender,
                amount: r.u256().toString(),
                execLayerData: r.rest(),
            };
        }
        case "ERC721Portal": {
            if (len < 72) return null; // token(20) + sender(20) + tokenId(32) + abi.encode(base, exec)
            const token = r.address();
            const sender = r.address();
            const tokenId = r.u256().toString();
            const head = r.pos;
            const baseLayerData = abiBytes(r.bytes, head, 0);
            const execLayerData = abiBytes(r.bytes, head, 1);
            if (baseLayerData === null || execLayerData === null) {
                return { portal, token, sender, tokenId, data: r.rest() };
            }
            return { portal, token, sender, tokenId, baseLayerData, execLayerData };
        }
        case "ERC1155SinglePortal": {
            if (len < 104) return null; // token(20) + sender(20) + tokenId(32) + value(32) + abi.encode(base, exec)
            const token = r.address();
            const sender = r.address();
            const tokenId = r.u256().toString();
            const value = r.u256().toString();
            const head = r.pos;
            const baseLayerData = abiBytes(r.bytes, head, 0);
            const execLayerData = abiBytes(r.bytes, head, 1);
            if (baseLayerData === null || execLayerData === null) {
                return { portal, token, sender, tokenId, value, data: r.rest() };
            }
            return { portal, token, sender, tokenId, value, baseLayerData, execLayerData };
        }
        case "ERC1155BatchPortal": {
            if (len < 40) return null; // token(20) + sender(20) + abi.encode(ids, values, base, exec)
            const token = r.address();
            const sender = r.address();
            const head = r.pos;
            const tokenIds = abiUintArray(r.bytes, head, 0);
            const values = abiUintArray(r.bytes, head, 1);
            const baseLayerData = abiBytes(r.bytes, head, 2);
            const execLayerData = abiBytes(r.bytes, head, 3);
            if (
                tokenIds === null ||
                values === null ||
                baseLayerData === null ||
                execLayerData === null
            ) {
                return { portal, token, sender, data: r.rest() };
            }
            return { portal, token, sender, tokenIds, values, baseLayerData, execLayerData };
        }
    }
}

/** True when the deposit carries app-specific bytes for the `deposit` method to decode. */
export function hasDepositAppData(d: PortalDeposit): boolean {
    switch (d.portal) {
        case "EtherPortal":
        case "ERC20Portal":
            return !!d.execLayerData;
        default:
            return !!(d.execLayerData || d.baseLayerData || d.data);
    }
}

const ASSET_LABELS: Record<PortalKind, string> = {
    EtherPortal: "Ether",
    ERC20Portal: "ERC-20",
    ERC721Portal: "ERC-721",
    ERC1155SinglePortal: "ERC-1155",
    ERC1155BatchPortal: "ERC-1155 batch",
};

/** Build the tags/pills for a decoded deposit: `deposit` plus the asset kind. */
export function portalDepositTags(d: PortalDeposit): Tag[] {
    return [
        { label: "deposit", color: "green" },
        { label: ASSET_LABELS[d.portal], color: "blue", title: d.portal },
    ];
}

/** Build a one-line summary for a decoded deposit. */
export function summarizePortalDeposit(d: PortalDeposit): string {
    const from = `from ${shortHex(d.sender)}`;
    switch (d.portal) {
        case "EtherPortal":
            return `Ether deposit · ${d.ether} ETH ${from}`;
        case "ERC20Portal":
            return `ERC-20 deposit · ${d.amount} of ${shortHex(d.token)} ${from}`;
        case "ERC721Portal":
            return `ERC-721 deposit · #${d.tokenId} of ${shortHex(d.token)} ${from}`;
        case "ERC1155SinglePortal":
            return `ERC-1155 deposit · ${d.value}× #${d.tokenId} of ${shortHex(d.token)} ${from}`;
        case "ERC1155BatchPortal":
            return d.tokenIds
                ? `ERC-1155 batch deposit · ${d.tokenIds.length} ids of ${shortHex(d.token)} ${from}`
                : `ERC-1155 batch deposit · ${shortHex(d.token)} ${from}`;
    }
}

/**
 * If this input was sent by a known Cartesi portal, decode it as a deposit and
 * return a ready-to-use DecodeResult (summary, tags and the structured
 * PortalDeposit as data); otherwise return null. The explorer calls this by
 * itself for every input — decoders don't need to.
 */
export function decodePortalInput(input: Input): DecodeResult | null {
    const sender = input.decoded_data?.sender?.toLowerCase();
    const payload = input.decoded_data?.payload;
    if (!sender || !payload) return null;
    const portal = PORTAL_ADDRESSES[sender];
    if (!portal) return null;
    const deposit = decodePortalDeposit(payload, portal);
    if (!deposit) return null;
    return {
        summary: summarizePortalDeposit(deposit),
        tags: portalDepositTags(deposit),
        data: deposit,
    };
}
