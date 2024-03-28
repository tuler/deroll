import {
    getAddress,
    type Address
} from "viem";
import { dAppAddressRelayAddress } from "../rollups";
import { DepositArgs, DepositOperation } from "../token";

export class Relay implements DepositOperation {
    isDeposit(msgSender: Address): boolean {
        return msgSender === dAppAddressRelayAddress;
    }
    async deposit({ payload, setDapp }: DepositArgs): Promise<void> {
        const dapp = getAddress(payload);
        setDapp(dapp);
    }
}

export const relay = new Relay();
