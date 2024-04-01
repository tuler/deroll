import { Address, getAddress, isAddress } from "viem";
import { AdvanceRequestHandler, Voucher } from "@deroll/app";

import {
    Ether,
    ERC20,
    ERC721,
    ERC1155Single,
    ERC1155Batch,
    Relay,
} from "./contracts";

import { RelayError } from "./errors";
import {
    etherPortalAddress,
    erc20PortalAddress,
    erc721PortalAddress,
    erc1155SinglePortalAddress,
    erc1155BatchPortalAddress,
    dAppAddressRelayAddress,
} from "./rollups";

export type Wallet = {
    ether: bigint;
    erc20: Record<string, bigint>;
    erc721: Record<string, Set<bigint>>;
    erc1155: Record<string, Map<bigint, bigint>>;
};

export interface WalletApp {
    /**
     * @deprecated use {@link balanceOfEther} instead
     */
    balanceOf(address: string): bigint;
    /**
     * @deprecated use {@link balanceOfERC20} instead
     */
    balanceOf(token: Address, address: string): bigint;
    balanceOfEther(address: string): bigint;
    balanceOfERC20(token: Address, address: string): bigint;
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

    getDappAddressOrThrow(): Address;
    setDapp(address: Address): void;
    setWallet(address: string, wallet: Wallet): void;
    getWalletOrNew(address: string): Wallet;
}

export class WalletAppImpl implements WalletApp {
    private dapp?: Address;
    private wallets: Record<string, Wallet> = {};

    private readonly handlers: Record<Address, AdvanceRequestHandler>;

    ether: Ether;
    erc20: ERC20;
    erc721: ERC721;
    erc1155Single: ERC1155Single;
    erc1155Batch: ERC1155Batch;
    relay: Relay;

    constructor() {
        this.ether = new Ether(this);
        this.erc20 = new ERC20(this);
        this.erc721 = new ERC721(this);
        this.erc1155Single = new ERC1155Single(this);
        this.erc1155Batch = new ERC1155Batch(this);
        this.relay = new Relay(this);

        this.handlers = {
            [etherPortalAddress]: this.ether.handler,
            [erc20PortalAddress]: this.erc20.handler,
            [erc721PortalAddress]: this.erc721.handler,
            [erc1155SinglePortalAddress]: this.erc1155Single.handler,
            [erc1155BatchPortalAddress]: this.erc1155Batch.handler,
            [dAppAddressRelayAddress]: this.relay.handler,
        };
    }

    getDappAddressOrThrow = (): Address => {
        if (!this.dapp) {
            throw new RelayError();
        }
        return this.dapp;
    };

    setDapp = (address: Address): void => {
        this.dapp = address;
    };

    setWallet = (address: string, wallet: Wallet): void => {
        this.wallets[address] = wallet;
    };

    getWalletOrNew = (address: string): Wallet => {
        if (isAddress(address)) {
            address = getAddress(address);
        }
        const wallet = this.wallets[address];

        if (wallet) {
            return wallet;
        }

        const newWallet = this.createDefaultWallet();
        this.wallets[address] = newWallet;

        return newWallet;
    };

    createDefaultWallet(): Wallet {
        return {
            ether: 0n,
            erc20: {},
            erc721: {},
            erc1155: {},
        };
    }

    balanceOfEther(tokenOrAddress: string): bigint {
        return this.ether.balanceOf({
            address: tokenOrAddress,
        });
    }

    balanceOfERC20(tokenOrAddress: Address, address: string): bigint {
        if (isAddress(address)) {
            address = getAddress(address);
        }

        return this.erc20.balanceOf({
            address,
            tokenOrAddress,
        });
    }

    /**
     *
     * @param tokenOrAddress
     * @param address
     * @returns
     * @deprecated use {@link balanceOfEther} or {@link balanceOfERC20} instead
     */
    public balanceOf(
        tokenOrAddress: string | Address,
        address?: string,
    ): bigint {
        if (address && isAddress(address)) {
            return this.erc20.balanceOf({
                address,
                tokenOrAddress,
            });
        } else {
            return this.ether.balanceOf({
                address: tokenOrAddress,
            });
        }
    }

    public balanceOfERC721(address: string | Address, owner: Address): bigint {
        return this.erc721.balanceOf({
            address,
            owner,
        });
    }

    public balanceOfERC1155(
        addresses: Address | Address[],
        tokenIds: bigint | bigint[],
        owner: string | Address,
    ): bigint | bigint[] {
        if (!Array.isArray(addresses) && !Array.isArray(tokenIds)) {
            const address = addresses;
            const tokenId = tokenIds;

            return this.erc1155Single.balanceOf({
                address,
                tokenId,
                owner,
            });
        }

        if (!Array.isArray(addresses)) {
            addresses = [addresses];
        }

        if (!Array.isArray(tokenIds)) {
            tokenIds = [tokenIds];
        }

        return this.erc1155Batch.balanceOf({
            addresses,
            tokenIds,
            owner,
        });
    }

    public handler: AdvanceRequestHandler = async (data) => {
        try {
            const msgSender = getAddress(data.metadata.msg_sender);
            const handler = this.handlers[msgSender];
            if (handler) {
                return handler(data);
            }
        } catch (e) {
            console.error("Error", e);
        }

        // Otherwise, reject
        return "reject";
    };

    transferEther(from: string, to: string, amount: bigint): void {
        this.ether.transfer({
            from,
            to,
            amount,
        });
    }

    transferERC20(
        token: Address,
        from: string,
        to: string,
        amount: bigint,
    ): void {
        this.erc20.transfer({
            token,
            from,
            to,
            amount,
        });
    }

    transferERC721(
        token: Address,
        from: string,
        to: string,
        tokenId: bigint,
    ): void {
        this.erc721.transfer({
            token,
            from,
            to,
            tokenId,
        });
    }

    transferERC1155(
        token: Address,
        from: string,
        to: string,
        tokenIds: bigint[],
        values: bigint[],
    ): void {
        if (!Array.isArray(tokenIds) && !Array.isArray(values)) {
            this.erc1155Single.transfer({
                token,
                from,
                to,
                tokenId: tokenIds,
                amount: values,
            });
        }

        if (!Array.isArray(tokenIds)) {
            tokenIds = [tokenIds];
        }

        if (!Array.isArray(values)) {
            values = [values];
        }

        this.erc1155Batch.transfer({
            token,
            from,
            to,
            tokenIds,
            amounts: values,
        });
    }

    withdrawEther(address: Address, amount: bigint): Voucher {
        return this.ether.withdraw({
            address,
            amount,
        });
    }

    withdrawERC20(token: Address, address: Address, amount: bigint): Voucher {
        return this.erc20.withdraw({
            token,
            address,
            amount,
        });
    }

    withdrawERC721(token: Address, address: Address, tokenId: bigint): Voucher {
        return this.erc721.withdraw({
            token,
            address,
            tokenId,
        });
    }



    withdrawERC1155(
        token: Address,
        address: Address,
        tokenIds: bigint | bigint[],
        amounts: bigint | bigint[],
    ): Voucher {
        if (!Array.isArray(tokenIds) && !Array.isArray(amounts)) {
            return this.erc1155Single.withdraw({
                token,
                address,
                tokenId: tokenIds,
                amount: amounts,
            });
        }

        if (!Array.isArray(tokenIds)) {
            tokenIds = [tokenIds];
        }

        if (!Array.isArray(amounts)) {
            amounts = [amounts];
        }

        return this.erc1155Batch.withdraw({
            token,
            address,
            tokenIds,
            amounts,
        });
    }
}
