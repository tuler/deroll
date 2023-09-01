import { AdvanceRequestData, Payload } from "@deroll/app";
import {
    Address,
    getAddress,
    hexToBigInt,
    hexToBool,
    parseAbi,
    slice,
} from "viem";

import { WalletApp, WalletAppImpl } from "./wallet";
import { erc20PortalAddress, etherPortalAddress } from "./rollups";

export type { WalletApp } from "./wallet";

// wallet ABI
export const WalletABI = parseAbi([
    "function withdrawEther(uint256 amount)",
    "function withdrawERC20(address token, uint256 amount)",
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

/**
 * Decode input according to https://github.com/cartesi/rollups/tree/v1.0.0#input-encodings-for-deposits
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
 * Decode input according to https://github.com/cartesi/rollups/tree/v1.0.0#input-encodings-for-deposits
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

export const isEtherDeposit = (data: AdvanceRequestData): boolean =>
    getAddress(data.metadata.msg_sender) === etherPortalAddress;

export const isERC20Deposit = (data: AdvanceRequestData): boolean =>
    getAddress(data.metadata.msg_sender) === erc20PortalAddress;
