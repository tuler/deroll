import { AdvanceRequestData, Payload, Voucher } from "@deroll/core";
import {
    Address,
    Hex,
    decodeAbiParameters,
    encodeFunctionData,
    erc20Abi,
    erc721Abi,
    getAddress,
    hexToBigInt,
    numberToHex,
    parseAbi,
    parseAbiParameters,
    slice,
    zeroHash,
} from "viem";

import { WalletApp, WalletAppImpl } from "./wallet";
import {
    erc1155BatchPortalAddress,
    erc1155SinglePortalAddress,
    erc20PortalAddress,
    erc721PortalAddress,
    etherPortalAddress,
} from "./rollups";
import { erc1155Abi } from "./abi";

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

export const createWithdrawEtherVoucher = (
    receiver: Address,
    value: bigint,
): Voucher => {
    return {
        destination: receiver,
        payload: "0x",
        value: numberToHex(value),
    };
};

export const createERC20TransferVoucher = (
    token: Address,
    recipient: Address,
    amount: bigint,
): Voucher => {
    const call = encodeFunctionData({
        abi: erc20Abi,
        functionName: "transfer",
        args: [recipient, amount],
    });

    // create voucher to the IERC20 transfer
    return {
        destination: token,
        payload: call,
        value: zeroHash,
    };
};

export const createERC721TransferVoucher = (
    token: Address,
    from: Address,
    to: Address,
    tokenId: bigint,
): Voucher => {
    const call = encodeFunctionData({
        abi: erc721Abi,
        functionName: "safeTransferFrom",
        args: [from, to, tokenId],
    });

    // create voucher to the IERC721 transfer
    return {
        destination: token,
        payload: call,
        value: zeroHash,
    };
};

export const createERC1155SingleTransferVoucher = (
    token: Address,
    from: Address,
    to: Address,
    tokenId: bigint,
    value: bigint,
    data: Hex,
): Voucher => {
    const call = encodeFunctionData({
        abi: erc1155Abi,
        functionName: "safeTransferFrom",
        args: [from, to, tokenId, value, data],
    });

    // create voucher to the IERC1155 transfer
    return {
        destination: token,
        payload: call,
        value: zeroHash,
    };
};

export const createERC1155BatchTransferVoucher = (
    token: Address,
    from: Address,
    to: Address,
    tokenIds: bigint[],
    values: bigint[],
    data: Hex,
): Voucher => {
    const call = encodeFunctionData({
        abi: erc1155Abi,
        functionName: "safeBatchTransferFrom",
        args: [from, to, tokenIds, values, data],
    });

    // create voucher to the IERC1155 transfer
    return {
        destination: token,
        payload: call,
        value: zeroHash,
    };
};
