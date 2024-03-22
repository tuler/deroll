import { MissingContextArgumentError } from "../errors";
import {
    getAddress,
    type Address
} from "viem";
import { dAppAddressRelayAddress } from "../rollups";
import { TokenOperation, TokenContext } from "../token";

export class Relay implements TokenOperation {
    isDeposit(msgSender: Address): boolean {
        return msgSender === dAppAddressRelayAddress;
    }
    async deposit({ payload, setDapp }: TokenContext): Promise<void> {
        console.log("dAppAddressRelayAddress");

        if (!payload || !setDapp)
            throw new MissingContextArgumentError<TokenContext>({
                setDapp,
                payload,
            });
        console.log("dAppAddressRelayAddress");
        const dapp = getAddress(payload);
        setDapp(dapp);
    }
}
