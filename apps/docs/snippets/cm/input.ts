import { encodeFunctionData, hexToBytes } from "viem";
import { InputsAbi } from "./inputsAbi";

const payload = "0x"; // the actual input payload
export const input = Buffer.from(
    hexToBytes(
        encodeFunctionData({
            abi: InputsAbi,
            functionName: "EvmAdvance",
            args: [
                1n, // mainnet
                "0x4c1E74EF88a75C24e49eddD9f70D82A94D19251c", // honeypot application
                "0x60247492F1538Ed4520e61aE41ca2A8447592Ff5", // sender
                1n, // block number
                1752129n, // block timestamp in seconds
                0n, // prevRandao
                1n, // input index
                payload,
            ],
        }),
    ),
);
