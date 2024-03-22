import { MissingContextArgumentError } from "../errors";
import {
    getAddress,
    type Address,
    isHex,
    isAddress,
    encodeFunctionData,
} from "viem";
import { cartesiDAppAbi, etherPortalAddress } from "../rollups";
import type { Voucher } from "@deroll/app";
import { parseEtherDeposit } from "..";
import { TokenOperation, TokenContext } from "../token";

export class Ether implements TokenOperation {
    balanceOf<T extends bigint | bigint[]>({
        tokenOrAddress,
        getWallet,
    }: TokenContext): T {
        if (!tokenOrAddress || !getWallet)
            throw new MissingContextArgumentError<TokenContext>({
                tokenOrAddress,
                getWallet,
            });

        if (isAddress(tokenOrAddress)) {
            tokenOrAddress = getAddress(tokenOrAddress);
        }

        const wallet = getWallet(tokenOrAddress as Address);

        // ether balance
        return (wallet?.ether ?? 0n) as T;
    }
    transfer({ getWallet, from, to, amount, setWallet }: TokenContext): void {
        if (!from || !to || !amount || !getWallet || !setWallet) {
            throw new MissingContextArgumentError<TokenContext>({
                from,
                to,
                amount,
                getWallet,
                setWallet,
            });
        }

        const walletFrom = getWallet(from);
        const walletTo = getWallet(to);

        if (walletFrom.ether < amount) {
            throw new Error(`insufficient balance of user ${from}`);
        }

        walletFrom.ether = walletFrom.ether - amount;
        walletTo.ether = walletTo.ether + amount;
        setWallet(from as Address, walletFrom);
        setWallet(to as Address, walletTo);
    }
    withdraw({
        address,
        setWallet,
        getWallet,
        amount,
        getDapp,
    }: TokenContext): Voucher {
        if (!address || !setWallet || !getWallet || !amount || !getDapp) {
            throw new MissingContextArgumentError<TokenContext>({
                address,
                setWallet,
                getWallet,
                amount,
                getDapp,
            });
        }

        // normalize address
        address = getAddress(address);

        const wallet = getWallet(address);

        if (!wallet) {
            throw new Error(`wallet of user ${address} is undefined`);
        }

        const dapp = getDapp();

        // check if dapp address is defined
        if (!dapp) {
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
            abi: cartesiDAppAbi,
            functionName: "withdrawEther",
            args: [address as Address, amount],
        });
        return {
            destination: dapp, // dapp Address
            payload: call,
        };
    }
    isDeposit(msgSender: Address): boolean {
        return msgSender === etherPortalAddress;
    }
    async deposit({
        payload,
        setWallet,
        getWallet,
    }: TokenContext): Promise<void> {
        console.log("Ether data");

        if (!payload || !isHex(payload) || !getWallet || !setWallet) {
            throw new MissingContextArgumentError<TokenContext>({
                payload,
                getWallet,
                setWallet,
            });
        }

        console.log("etherPortalAddress");
        const { sender, value } = parseEtherDeposit(payload);
        const wallet = getWallet(sender);
        wallet.ether += value;
        setWallet(sender, wallet);
    }
}
