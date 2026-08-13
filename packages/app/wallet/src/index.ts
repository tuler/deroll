import type { Voucher } from "@cartesi/rollup";
import type { Address, Hex } from "viem";
import { encodeFunctionData, erc20Abi, erc721Abi, parseAbi } from "viem";

import { erc1155Abi } from "./abi/index.js";
import { type WalletApp, WalletAppImpl } from "./wallet.js";

export type { WalletApp } from "./wallet.js";

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

export const createWithdrawEtherVoucher = (
    receiver: Address,
    value: bigint,
): Voucher => {
    return {
        destination: receiver,
        payload: "0x",
        value,
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
    };
};
