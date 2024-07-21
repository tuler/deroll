import { Address, Hex } from "viem";

export type AddInputRequest = {
    application: Address;
    payload: Hex;
};
