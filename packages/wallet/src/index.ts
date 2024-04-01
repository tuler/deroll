import { AdvanceRequestData, Payload } from "@deroll/app";
import {
    Address,
    decodeAbiParameters,
    getAddress,
    hexToBigInt,
    hexToBool,
    parseAbi,
    parseAbiParameters,
    slice,
} from "viem";

import { WalletApp, WalletAppImpl } from "./wallet";
import {
    erc1155BatchPortalAddress,
    erc1155SinglePortalAddress,
    erc20PortalAddress,
    erc721PortalAddress,
    etherPortalAddress,
} from "./rollups";

export type { WalletApp } from "./wallet";

// wallet ABI
export const WalletABI = parseAbi([
    "function withdrawEther(uint256 value)",
    "function withdrawERC20(address token, uint256 amount)",
    "function withdrawERC721(address token, uint256 tokenId)",
    "function withdrawERC1155(address token, uint256 tokenId, uint256 value)",
    "function withdrawERC1155Batch(address token, uint256[] tokenIds, uint256[] values)",
]);

export const createWallet = (): WalletApp => {
    return new WalletAppImpl();
};

export type EtherDeposit = {
    sender: Address;
    value: bigint;
};

export type ERC20Deposit = {
    success: boolean;
    token: Address;
    sender: Address;
    amount: bigint;
};

export type ERC721Deposit = {
    token: Address;
    sender: Address;
    tokenId: bigint;
};

export type ERC1155SingleDeposit = {
    token: Address;
    sender: Address;
    tokenId: bigint;
    value: bigint;
};

export type ERC1155BatchDeposit = {
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
export const parseEtherDeposit = (payload: Payload): EtherDeposit => {
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
export const parseERC20Deposit = (payload: Payload): ERC20Deposit => {
    const success = hexToBool(slice(payload, 0, 1)); // 1 byte for boolean
    // normalize addresses, for safety
    const token = getAddress(slice(payload, 1, 21)); // 20 bytes for address
    const sender = getAddress(slice(payload, 21, 41)); // 20 bytes for address
    const amount = hexToBigInt(slice(payload, 41, 73), { size: 32 }); // 32 bytes for uint256
    return { success, token, sender, amount };
};

/**
 * Decode input according to https://github.com/cartesi/rollups-contracts/tree/v1.2.0#input-encodings-for-deposits
 * @param payload input payload
 * @returns
 */
export const parseERC721Deposit = (payload: Payload): ERC721Deposit => {
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
export const parseERC1155SingleDeposit = (
    payload: Payload,
): ERC1155SingleDeposit => {
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
export const parseERC1155BatchDeposit = (
    payload: Payload,
): ERC1155BatchDeposit => {
    const token = getAddress(slice(payload, 0, 20)); // 20 bytes for address
    const sender = getAddress(slice(payload, 20, 40)); // 20 bytes for address
    const rest = slice(payload, 40);
    const [tokenIds, values] = decodeAbiParameters(
        parseAbiParameters("uint256[] tokenIds, uint256[] values"),
        rest,
    );

    return { token, sender, tokenIds, values };
};

export const isEtherDeposit = (data: AdvanceRequestData): boolean =>
    getAddress(data.metadata.msg_sender) === etherPortalAddress;

export const isERC20Deposit = (data: AdvanceRequestData): boolean =>
    getAddress(data.metadata.msg_sender) === erc20PortalAddress;

export const isERC721Deposit = (data: AdvanceRequestData): boolean =>
    getAddress(data.metadata.msg_sender) === erc721PortalAddress;

export const isERC1155SingleDeposit = (data: AdvanceRequestData): boolean =>
    getAddress(data.metadata.msg_sender) === erc1155SinglePortalAddress;

export const isERC1155BatchDeposit = (data: AdvanceRequestData): boolean =>
    getAddress(data.metadata.msg_sender) === erc1155BatchPortalAddress;
