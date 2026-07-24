// Portal deposit decoding — protocol-defined data, decoded by the explorer
// itself. Every Cartesi app receives the same deposit message, defined by the
// canonical InputEncoding library in cartesi/rollups-contracts
// (src/common/InputEncoding.sol) and implemented by @cartesi/codec: its
// decodeDeposit recognizes a deposit by the input's sender (a known portal
// contract) and decodes the envelope. The explorer renders it natively and
// only hands a registered decoder's `deposit` method the app-specific data
// attached to it (execLayerData / baseLayerData).

import { decodeDeposit, type Deposit } from "@cartesi/codec";
import type { DecodeResult, Input, Tag } from "@deroll/decoder";
import { formatEther } from "viem";
import { shortHex } from "../lib/format";

/** True when the deposit carries app-specific bytes for the `deposit` method to decode. */
export function hasDepositAppData(d: Deposit): boolean {
    return (
        d.execLayerData !== "0x" ||
        ("baseLayerData" in d && d.baseLayerData !== "0x")
    );
}

const ASSET_LABELS: Record<Deposit["type"], string> = {
    EtherDeposit: "Ether",
    Erc20Deposit: "ERC-20",
    Erc721Deposit: "ERC-721",
    Erc1155SingleDeposit: "ERC-1155",
    Erc1155BatchDeposit: "ERC-1155 batch",
};

/** Build the tags/pills for a decoded deposit: `deposit` plus the asset kind. */
function depositTags(d: Deposit): Tag[] {
    return [
        { label: "deposit", color: "green" },
        { label: ASSET_LABELS[d.type], color: "blue", title: d.type },
    ];
}

/** Build a one-line summary for a decoded deposit. */
function summarizeDeposit(d: Deposit): string {
    const from = `from ${shortHex(d.sender)}`;
    switch (d.type) {
        case "EtherDeposit":
            return `Ether deposit · ${formatEther(d.value)} ETH ${from}`;
        case "Erc20Deposit":
            // Raw on-chain amount: the portal carries no token decimals.
            return `ERC-20 deposit · ${d.value} of ${shortHex(d.token)} ${from}`;
        case "Erc721Deposit":
            return `ERC-721 deposit · #${d.tokenId} of ${shortHex(d.token)} ${from}`;
        case "Erc1155SingleDeposit":
            return `ERC-1155 deposit · ${d.value}× #${d.tokenId} of ${shortHex(d.token)} ${from}`;
        case "Erc1155BatchDeposit":
            return `ERC-1155 batch deposit · ${d.tokenIds.length} ids of ${shortHex(d.token)} ${from}`;
    }
}

/**
 * If this input was sent by a known Cartesi portal, decode it as a deposit
 * and return a ready-to-use DecodeResult (summary, tags and the structured
 * Deposit as data); otherwise return null. A portal input whose payload is
 * malformed (decodeDeposit throws) also returns null, so the explorer falls
 * back to its hex/UTF-8 view.
 */
export function decodePortalInput(input: Input): DecodeResult | null {
    const sender = input.decodedData?.sender;
    const payload = input.decodedData?.payload;
    if (!sender || !payload) return null;
    let deposit: Deposit | undefined;
    try {
        deposit = decodeDeposit({ msgSender: sender, payload });
    } catch {
        return null;
    }
    if (!deposit) return null;
    return {
        summary: summarizeDeposit(deposit),
        tags: depositTags(deposit),
        data: deposit,
    };
}
