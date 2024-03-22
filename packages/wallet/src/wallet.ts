import { AdvanceRequestHandler, Voucher } from "@deroll/app";
import { Address, getAddress, isAddress } from "viem";

import { inspect } from "node:util";
import { TokenHandler } from "./token";

export type Wallet = {
    ether: bigint;
    erc20: Map<Address, bigint>;
    erc721: Map<Address, Set<bigint>>;
    erc1155: Map<Address, Map<bigint, bigint>>;
};

export interface WalletApp {
    balanceOf(address: string): bigint;
    balanceOf(token: Address, address: string): bigint;
    balanceOfERC721(token: Address, owner: string): bigint;
    balanceOfERC1155(
        addresses: string | string[],
        tokenIds: bigint | bigint[],
        owner: string | Address,
    ): bigint | bigint[];
    handler: AdvanceRequestHandler;
    transferEther(from: string, to: string, amount: bigint): void;
    transferERC20(
        token: Address,
        from: string,
        to: string,
        amount: bigint,
    ): void;
    transferERC721(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
    ): void;
    transferERC1155(
        token: Address,
        from: string,
        to: string,
        tokenIds: bigint[],
        values: bigint[],
    ): void;
    withdrawEther(address: Address, amount: bigint): Voucher;
    withdrawERC20(token: Address, address: Address, amount: bigint): Voucher;
    withdrawERC721(token: Address, address: Address, tokenId: bigint): Voucher;
    withdrawERC1155(
        token: Address,
        address: Address,
        tokenIds: bigint | bigint[],
        values: bigint | bigint[],
    ): Voucher;
}

export class WalletAppImpl implements WalletApp {
    private dapp?: Address;
    private wallets = new Map<string, Wallet>();

    constructor() {}
    setDapp = (address: Address): void => {
        this.dapp = address;
    };

    setWallet = (address: string, wallet: Wallet): void => {
        this.wallets.set(address, wallet);
    };

    getWalletOrNew = (address: string): Wallet => {
        if (isAddress(address)) {
            address = getAddress(address);
        }
        const wallet = this.wallets.get(address);

        if (wallet) {
            return wallet;
        }

        const newWallet = this.createDefaultWallet();
        this.wallets.set(address, newWallet);

        return newWallet;
    };

    createDefaultWallet(): Wallet {
        return {
            ether: 0n,
            erc20: new Map(),
            erc721: new Map(),
            erc1155: new Map(),
        };
    }

    /**
     *
     * @param tokenOrAddress
     * @param address
     * @returns
     */
    public balanceOf(
        tokenOrAddress: string | Address,
        address?: string,
    ): bigint {
        const handler = TokenHandler.getInstance();

        if (address && isAddress(address)) {
            return handler.erc20.balanceOf({
                address,
                getWallet: this.getWalletOrNew,
                tokenOrAddress,
            });
        } else {
            return handler.ether.balanceOf({
                getWallet: this.getWalletOrNew,
                tokenOrAddress,
            });
        }
    }

    public balanceOfERC721(
        address: string | Address,
        owner: string | Address,
    ): bigint {
        const handler = TokenHandler.getInstance();
        return handler.erc721.balanceOf({
            address,
            getWallet: this.getWalletOrNew,
            owner,
        });
    }

    public balanceOfERC1155(
        addresses: string | string[],
        tokenIds: bigint | bigint[],
        owner: string | Address,
    ): bigint | bigint[] {
        const handler = TokenHandler.getInstance();

        if (!Array.isArray(addresses) && !Array.isArray(tokenIds)) {
            const address = addresses;
            const tokenId = tokenIds;

            return handler.erc1155Single.balanceOf({
                address,
                tokenId,
                owner,
                getWallet: this.getWalletOrNew,
            });
        }

        if (!Array.isArray(addresses)) {
            addresses = [addresses];
        }

        if (!Array.isArray(tokenIds)) {
            tokenIds = [tokenIds];
        }

        return handler.erc1155Batch.balanceOf({
            addresses,
            tokenIds,
            owner,
            getWallet: this.getWalletOrNew,
        });
    }

    public handler: AdvanceRequestHandler = async (data) => {
        try {
            console.log("Wallet handler...", inspect(data, { depth: null }));

            const tokenHandler = TokenHandler.getInstance();
            const handler = tokenHandler.findDeposit(data);
            if (handler) {
                await handler.deposit({
                    setDapp: this.setDapp,
                    payload: data.payload,
                    getWallet: this.getWalletOrNew,
                    setWallet: this.setWallet,
                });

                return "accept";
            }
        } catch (e) {
            console.log("Error", e);
        }

        console.log("Wallet handler reject");
        // Otherwise, reject
        return "reject";
    };

    transferEther(from: string, to: string, amount: bigint): void {
        const handler = TokenHandler.getInstance();
        handler.ether.transfer({
            from,
            to,
            amount,
            getWallet: this.getWalletOrNew,
            setWallet: this.setWallet,
            getDapp: this.getDappAddressOrThrow,
        });
    }

    transferERC20(
        token: Address,
        from: string,
        to: string,
        amount: bigint,
    ): void {
        const handler = TokenHandler.getInstance();
        handler.erc20.transfer({
            token,
            from,
            to,
            amount,
            getWallet: this.getWalletOrNew,
            setWallet: this.setWallet,
        });
    }

    transferERC721(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
    ): void {
        const handler = TokenHandler.getInstance();
        handler.erc721.transfer({
            token,
            from,
            to,
            tokenId,
            getWallet: this.getWalletOrNew,
            setWallet: this.setWallet,
        });
    }

    transferERC1155(
        token: Address,
        from: string,
        to: string,
        tokenIds: bigint[],
        values: bigint[],
    ): void {
        const handler = TokenHandler.getInstance();

        if (!Array.isArray(tokenIds) && !Array.isArray(values)) {
            handler.erc1155Single.transfer({
                token,
                from,
                to,
                tokenId: tokenIds,
                amount: values,
                getWallet: this.getWalletOrNew,
                setWallet: this.setWallet,
            });
        }

        if (!Array.isArray(tokenIds)) {
            tokenIds = [tokenIds];
        }

        if (!Array.isArray(values)) {
            values = [values];
        }

        handler.erc1155Batch.transfer({
            token,
            from,
            to,
            tokenIds,
            amounts: values,
            getWallet: this.getWalletOrNew,
            setWallet: this.setWallet,
        });
    }

    withdrawEther(address: Address, amount: bigint): Voucher {
        const handler = TokenHandler.getInstance();
        return handler.ether.withdraw({
            address,
            getWallet: this.getWalletOrNew,
            amount,
            getDapp: this.getDappAddressOrThrow,
            setWallet: this.setWallet,
        });
    }

    withdrawERC20(token: Address, address: Address, amount: bigint): Voucher {
        const handler = TokenHandler.getInstance();
        return handler.erc20.withdraw({
            token,
            address,
            amount,
            getWallet: this.getWalletOrNew,
        });
    }

    withdrawERC721(token: Address, address: Address, tokenId: bigint): Voucher {
        const handler = TokenHandler.getInstance();
        return handler.erc721.withdraw({
            token,
            address,
            tokenId,
            getWallet: this.getWalletOrNew,
            setWallet: this.setWallet,
            getDapp: this.getDappAddressOrThrow,
        });
    }

    getDappAddressOrThrow = (): Address => {
        if (!this.dapp) {
            throw new Error(
                `You need to call the method relayDAppAddress from DAppAddressRelay__factory.`,
            );
        }
        return this.dapp;
    };

    withdrawERC1155(
        token: Address,
        address: Address,
        tokenIds: bigint | bigint[],
        amounts: bigint | bigint[],
    ): Voucher {
        const handler = TokenHandler.getInstance();
        if (!Array.isArray(tokenIds) && !Array.isArray(amounts)) {
            return handler.erc1155Single.withdraw({
                token,
                address,
                tokenId: tokenIds,
                amount: amounts,
                getWallet: this.getWalletOrNew,
                getDapp: this.getDappAddressOrThrow,
            });
        }

        if (!Array.isArray(tokenIds)) {
            tokenIds = [tokenIds];
        }

        if (!Array.isArray(amounts)) {
            amounts = [amounts];
        }

        return handler.erc1155Batch.withdraw({
            token,
            address,
            tokenIds,
            amounts,
            getWallet: this.getWalletOrNew,
        });
    }
}
