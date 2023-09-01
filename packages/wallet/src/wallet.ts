import { AdvanceRequestHandler, Voucher } from "@deroll/app";
import { Address, encodeFunctionData, getAddress, isAddress } from "viem";

import { cartesiDAppABI, dAppAddressRelayAddress, erc20ABI } from "./rollups";
import {
    isERC20Deposit,
    isEtherDeposit,
    parseERC20Deposit,
    parseEtherDeposit,
} from ".";

export type Wallet = {
    ether: bigint;
    erc20: Record<Address, bigint>;
};

export interface WalletApp {
    balanceOf(address: string): bigint;
    balanceOf(token: Address, address: string): bigint;
    handler: AdvanceRequestHandler;
    transferEther(from: string, to: string, amount: bigint): void;
    transferERC20(
        token: Address,
        from: string,
        to: string,
        amount: bigint,
    ): void;
    withdrawEther(address: Address, amount: bigint): Voucher;
    withdrawERC20(token: Address, address: Address, amount: bigint): Voucher;
}

export class WalletAppImpl implements WalletApp {
    private dapp: Address | undefined;
    private wallets: Record<string, Wallet> = {};

    constructor() {
        this.handler = this.handler.bind(this);
    }

    public balanceOf(
        tokenOrAddress: string | Address,
        address?: string,
    ): bigint {
        if (address) {
            // if is address, normalize it
            if (isAddress(address)) {
                address = getAddress(address);
            }

            // erc-20 balance
            const erc20: Record<Address, bigint> = this.wallets[address] ?? {};
            return erc20[tokenOrAddress as Address] ?? 0n;
        } else {
            // if is address, normalize it
            if (isAddress(tokenOrAddress)) {
                tokenOrAddress = getAddress(tokenOrAddress);
            }

            // ether balance
            return this.wallets[tokenOrAddress]?.ether ?? 0n;
        }
    }

    public handler: AdvanceRequestHandler = async (data) => {
        if (isEtherDeposit(data)) {
            let { sender, value } = parseEtherDeposit(data.payload);
            const wallet = this.wallets[sender] ?? { ether: 0n, erc20: {} };
            wallet.ether += value;
            this.wallets[sender] = wallet;
            return "accept";
        } else if (isERC20Deposit(data)) {
            let { success, token, sender, amount } = parseERC20Deposit(
                data.payload,
            );

            if (success) {
                const wallet = this.wallets[sender] ?? { ether: 0n, erc20: {} };
                wallet.erc20[token] = wallet.erc20[token]
                    ? wallet.erc20[token] + amount
                    : amount;
                this.wallets[sender] = wallet;
            }
            return "accept";
        } else if (
            getAddress(data.metadata.msg_sender) === dAppAddressRelayAddress
        ) {
            this.dapp = getAddress(data.payload);
            return "accept";
        }
        return "reject";
    };

    transferEther(from: string, to: string, amount: bigint): void {
        const walletFrom = this.wallets[from];
        const walletTo = this.wallets[to];

        if (walletFrom.ether < amount) {
            throw new Error(`insufficient balance of user ${from}`);
        }

        walletFrom.ether = walletFrom.ether - amount;
        walletTo.ether = walletTo.ether + amount;
    }

    transferERC20(
        token: Address,
        from: string,
        to: string,
        amount: bigint,
    ): void {
        // normalize addresses
        if (isAddress(from)) {
            from = getAddress(from);
        }
        if (isAddress(to)) {
            to = getAddress(to);
        }

        const walletFrom = this.wallets[from];
        const walletTo = this.wallets[to];

        if (!walletFrom.erc20[token] || walletFrom.erc20[token] < amount) {
            throw new Error(
                `insufficient balance of user ${from} of token ${token}`,
            );
        }

        walletFrom.erc20[token] = walletFrom.erc20[token] - amount;
        walletTo.erc20[token] = walletTo.erc20[token]
            ? walletTo.erc20[token] + amount
            : amount;
    }

    withdrawEther(address: Address, amount: bigint): Voucher {
        // normalize address
        address = getAddress(address);

        const wallet = this.wallets[address];

        // check if dapp address is defined
        if (!this.dapp) {
            throw new Error(`undefined application address`);
        }

        // check balance
        if (wallet.ether < amount) {
            throw new Error(
                `insufficient balance of user ${address}: ${amount.toString()} > ${wallet.ether.toString()}`,
            );
        }

        // reduce balance right away
        wallet.ether = wallet.ether - amount;

        // create voucher
        const call = encodeFunctionData({
            abi: cartesiDAppABI,
            functionName: "withdrawEther",
            args: [address, amount],
        });
        return {
            destination: this.dapp, // dapp Address
            payload: call,
        };
    }

    withdrawERC20(token: Address, address: Address, amount: bigint): Voucher {
        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        const wallet = this.wallets[address];

        // check balance
        if (!wallet.erc20[token] || wallet.erc20[token] < amount) {
            throw new Error(
                `insufficient balance of user ${address} of token ${token}: ${amount.toString()} > ${
                    wallet.erc20[token]?.toString() ?? "0"
                }`,
            );
        }

        // reduce balance right away
        wallet.erc20[token] -= amount;

        const call = encodeFunctionData({
            abi: erc20ABI,
            functionName: "transfer",
            args: [address, amount],
        });

        // create voucher to the IERC20 transfer
        return {
            destination: token,
            payload: call,
        };
    }
}
