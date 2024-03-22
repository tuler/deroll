import { MissingContextArgumentError } from "../errors";
import {
    getAddress,
    type Address,
    isHex,
    isAddress,
    encodeFunctionData,
    erc20Abi
} from "viem";
import { erc20PortalAddress } from "../rollups";
import type { Voucher } from "@deroll/app";
import { parseERC20Deposit } from "..";
import { TokenOperation, TokenContext } from "../token";

export class ERC20 implements TokenOperation {
    balanceOf<T = bigint>({
        address, getWallet, tokenOrAddress,
    }: TokenContext): T {
        if (!address || !getWallet || !tokenOrAddress)
            throw new MissingContextArgumentError<TokenContext>({
                address,
                getWallet,
                tokenOrAddress,
            });
        const addr = getAddress(address);

        const erc20address = getAddress(tokenOrAddress);
        const wallet = getWallet(addr);
        const result = wallet.erc20.get(erc20address) ?? 0n;
        return result as T;
    }
    transfer({
        token, from, to, amount, getWallet, setWallet,
    }: TokenContext): void {
        if (!token || !from || !to || !amount || !getWallet || !setWallet)
            throw new MissingContextArgumentError<TokenContext>({
                token,
                from,
                to,
                amount,
                getWallet,
                setWallet,
            });

        // normalize addresses
        if (isAddress(from)) {
            from = getAddress(from);
        }
        if (isAddress(to)) {
            to = getAddress(to);
        }

        const walletFrom = getWallet(from);
        const walletTo = getWallet(to);

        const balance = walletFrom.erc20.get(token);

        if (!balance || balance < amount) {
            throw new Error(
                `insufficient balance of user ${from} of token ${token}`
            );
        }

        const balanceFrom = balance - amount;
        walletFrom.erc20.set(token, balanceFrom);

        const balanceTo = walletTo.erc20.get(token);

        if (balanceTo) {
            walletTo.erc20.set(token, balanceTo + amount);
        } else {
            walletTo.erc20.set(token, amount);
        }

        setWallet(from as Address, walletFrom);
        setWallet(to as Address, walletTo);
    }
    withdraw({ token, address, getWallet, amount }: TokenContext): Voucher {
        if (!token || !address || !getWallet || !amount) {
            throw new MissingContextArgumentError<TokenContext>({
                token,
                address,
                getWallet,
                amount,
            });
        }

        // normalize addresses
        token = getAddress(token);
        address = getAddress(address);

        const wallet = getWallet(address);

        if (!wallet) {
            throw new Error(`wallet of user ${address} is undefined`);
        }

        const balance = wallet?.erc20.get(token);

        // check balance
        if (!balance || balance < amount) {
            throw new Error(
                `insufficient balance of user ${address} of token ${token}: ${amount.toString()} > ${balance?.toString() ?? "0"}`
            );
        }

        // reduce balance right away
        wallet.erc20.set(token, balance - amount);

        const call = encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [address as Address, amount],
        });

        // create voucher to the ERC-20 transfer
        return {
            destination: token,
            payload: call,
        };
    }
    async deposit({
        payload, getWallet, setWallet,
    }: TokenContext): Promise<void> {
        console.log("ERC-20 data");

        if (!payload || !isHex(payload) || !getWallet || !setWallet) {
            throw new MissingContextArgumentError<TokenContext>({
                payload,
                getWallet,
                setWallet,
            });
        }

        const { success, token, sender, amount } = parseERC20Deposit(payload);
        if (success) {
            const wallet = getWallet(sender);

            const balance = wallet.erc20.get(token);

            if (balance) {
                wallet.erc20.set(token, balance + amount);
            } else {
                wallet.erc20.set(token, amount);
            }

            setWallet(sender, wallet);
        }
    }
    isDeposit(msgSender: Address): boolean {
        return msgSender === erc20PortalAddress;
    }
}
