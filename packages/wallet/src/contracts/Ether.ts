import { getAddress, type Address, isAddress, encodeFunctionData } from "viem";
import type { AdvanceRequestHandler, Voucher } from "@deroll/app";
import { cartesiDAppAbi } from "../rollups";
import { parseEtherDeposit } from "..";
import { CanHandler } from "../types";
import { Wallet, type WalletApp } from "../wallet";
import { InsufficientBalanceError, NegativeAmountError } from "../errors";

interface BalanceOf {
    address: string;
}

interface Transfer {
    from: string;
    to: string;
    amount: bigint;
}

interface Withdraw {
    address: Address;
    amount: bigint;
}

export class Ether implements CanHandler {
    constructor(private wallet: WalletApp) { };

    balanceOf({ address }: BalanceOf): bigint {
        if (isAddress(address)) {
            address = getAddress(address);
        }

        const wallet = this.wallet.getWalletOrNew(address);

        // ether balance
        return wallet?.ether ?? 0n;
    }
    transfer({ from, to, amount }: Transfer): void {
        const walletFrom = this.wallet.getWalletOrNew(from);
        const walletTo = this.wallet.getWalletOrNew(to);

        if (amount < 0n) {
            throw new NegativeAmountError(amount);
        }
        if (walletFrom.ether < amount) {
            throw new InsufficientBalanceError(from, "ether", amount);
        }

        walletFrom.ether = walletFrom.ether - amount;
        walletTo.ether = walletTo.ether + amount;
        this.wallet.setWallet(from, walletFrom);
        this.wallet.setWallet(to, walletTo);
    }
    withdraw({ address, amount }: Withdraw): Voucher {
        // normalize address
        address = getAddress(address);

        const wallet = this.wallet.getWalletOrNew(address);

        const dapp = this.wallet.getDappAddressOrThrow();

        // check balance
        if (amount < 0n) {
            throw new NegativeAmountError(amount);
        }
        if (wallet.ether < amount) {
            throw new InsufficientBalanceError(address, "ether", amount);
        }

        // reduce balance right away
        wallet.ether = wallet.ether - amount;

        // create voucher
        const call = encodeFunctionData({
            abi: cartesiDAppAbi,
            functionName: "withdrawEther",
            args: [address, amount],
        });
        return {
            destination: dapp, // dapp Address
            payload: call,
        };
    }

    handler: AdvanceRequestHandler = async ({ payload }) => {
        const { sender, value } = parseEtherDeposit(payload);
        const wallet = this.wallet.getWalletOrNew(sender);
        wallet.ether += value;
        this.wallet.setWallet(sender, wallet);

        return "accept";
    };
}

