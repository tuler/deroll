import type { Advance } from "@deroll/core";
import type { Address, Hex } from "viem";
import {
    decodeAbiParameters,
    getAddress,
    hexToBigInt,
    parseAbi,
    parseAbiParameters,
    slice,
} from "viem";

import {
    erc1155BatchPortalAddress,
    erc1155SinglePortalAddress,
    erc20PortalAddress,
    erc721PortalAddress,
    etherPortalAddress,
} from "@cartesi/viem/abi";
import { type WalletApp, WalletAppImpl } from "./wallet.js";

export type { WalletApp } from "./wallet.js";

// wallet ABI
export const WalletABI = parseAbi([
    "function withdrawEther(uint256 value)",
    "function withdrawErc20(address token, uint256 amount)",
    "function withdrawErc721(address token, uint256 tokenId)",
    "function withdrawErc1155(address token, uint256 tokenId, uint256 value)",
    "function withdrawErc1155Batch(address token, uint256[] tokenIds, uint256[] values)",
]);

export const createWallet = (): WalletApp => {
    return new WalletAppImpl();
};

export type EtherDeposit = {
    sender: Address;
    value: bigint;
};

export type Erc20Deposit = {
    token: Address;
    sender: Address;
    amount: bigint;
};

export type Erc721Deposit = {
    token: Address;
    sender: Address;
    tokenId: bigint;
};

export type Erc1155SingleDeposit = {
    token: Address;
    sender: Address;
    tokenId: bigint;
    value: bigint;
};

export type Erc1155BatchDeposit = {
    token: Address;
    sender: Address;
    tokenIds: readonly bigint[];
    values: readonly bigint[];
};

/**
 * Decode input according to https://github.com/cartesi/rollups-contracts/tree/v1.2.0#input-encodings-for-deposits
 * @param payload input payload
 * @returns
 */
export const parseEtherDeposit = (payload: Hex): EtherDeposit => {
    // normalize address, for safety
    const sender = getAddress(slice(payload, 0, 20)); // 20 bytes for address
    const value = hexToBigInt(slice(payload, 20, 52), { size: 32 }); // 32 bytes for uint256
    return { sender, value };
};

/**
 * Decode input according to https://github.com/cartesi/rollups-contracts/tree/v1.2.0#input-encodings-for-deposits
 * @param payload input payload
 * @returns
 */
export const parseErc20Deposit = (payload: Hex): Erc20Deposit => {
    // normalize addresses, for safety
    const token = getAddress(slice(payload, 0, 20)); // 20 bytes for address
    const sender = getAddress(slice(payload, 20, 40)); // 20 bytes for address
    const amount = hexToBigInt(slice(payload, 40, 72), { size: 32 }); // 32 bytes for uint256
    return { token, sender, amount };
};

/**
 * Decode input according to https://github.com/cartesi/rollups-contracts/tree/v1.2.0#input-encodings-for-deposits
 * @param payload input payload
 * @returns
 */
export const parseErc721Deposit = (payload: Hex): Erc721Deposit => {
    const token = getAddress(slice(payload, 0, 20)); // 20 bytes for address
    const sender = getAddress(slice(payload, 20, 40)); // 20 bytes for address
    const tokenId = hexToBigInt(slice(payload, 40, 72), { size: 32 });

    return {
        token,
        sender,
        tokenId,
    };
};

/**
 * Decode input according to https://github.com/cartesi/rollups-contracts/tree/v1.2.0#input-encodings-for-deposits
 * @param payload input payload
 * @returns
 */
export const parseErc1155SingleDeposit = (
    payload: Hex,
): Erc1155SingleDeposit => {
    const token = getAddress(slice(payload, 0, 20)); // 20 bytes for address
    const sender = getAddress(slice(payload, 20, 40)); // 20 bytes for address
    const tokenId = hexToBigInt(slice(payload, 40, 72), { size: 32 });
    const value = hexToBigInt(slice(payload, 72, 104), { size: 32 });

    return {
        token,
        sender,
        tokenId,
        value,
    };
};

/**
 * Decode input according to https://github.com/cartesi/rollups-contracts/tree/v1.2.0#input-encodings-for-deposits
 * @param payload input payload
 * @returns
 */
export const parseErc1155BatchDeposit = (payload: Hex): Erc1155BatchDeposit => {
    const token = getAddress(slice(payload, 0, 20)); // 20 bytes for address
    const sender = getAddress(slice(payload, 20, 40)); // 20 bytes for address
    const rest = slice(payload, 40);
    const [tokenIds, values] = decodeAbiParameters(
        parseAbiParameters("uint256[] tokenIds, uint256[] values"),
        rest,
    );

    return { token, sender, tokenIds, values };
};

export const isEtherDeposit = (data: Advance): boolean =>
    getAddress(data.msgSender) === etherPortalAddress;

export const isErc20Deposit = (data: Advance): boolean =>
    getAddress(data.msgSender) === erc20PortalAddress;

export const isErc721Deposit = (data: Advance): boolean =>
    getAddress(data.msgSender) === erc721PortalAddress;

export const isErc1155SingleDeposit = (data: Advance): boolean =>
    getAddress(data.msgSender) === erc1155SinglePortalAddress;

export const isErc1155BatchDeposit = (data: Advance): boolean =>
    getAddress(data.msgSender) === erc1155BatchPortalAddress;
