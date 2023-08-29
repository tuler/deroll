import { parseAbi } from "viem";
import { WalletApp, WalletAppImpl } from "./wallet";

export type { WalletApp } from "./wallet";

// wallet ABI
export const WalletABI = parseAbi([
    "function withdrawEther(uint256 amount)",
    "function withdrawERC20(address token, uint256 amount)",
]);

export const createWallet = (): WalletApp => {
    return new WalletAppImpl();
};
