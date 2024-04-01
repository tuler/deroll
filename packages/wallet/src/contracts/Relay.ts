import {
    getAddress
} from "viem";
import type { AdvanceRequestHandler } from "@deroll/app";
import { CanHandler } from "../types";
import type { WalletApp } from "../wallet";

export class Relay implements CanHandler {
    constructor(private wallet: WalletApp) { };

    handler: AdvanceRequestHandler = async ({payload}) => {
        const dapp = getAddress(payload);
        this.wallet.setDapp(dapp);

        return "accept"
    }
}

