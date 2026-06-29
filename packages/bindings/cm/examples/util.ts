import { type Address, encodeFunctionData, type Hex, hexToBytes } from "viem";

const InputsAbi = [
    {
        type: "function",
        name: "EvmAdvance",
        inputs: [
            { name: "chainId", type: "uint256", internalType: "uint256" },
            { name: "appContract", type: "address", internalType: "address" },
            { name: "msgSender", type: "address", internalType: "address" },
            { name: "blockNumber", type: "uint256", internalType: "uint256" },
            {
                name: "blockTimestamp",
                type: "uint256",
                internalType: "uint256",
            },
            { name: "prevRandao", type: "uint256", internalType: "uint256" },
            { name: "index", type: "uint256", internalType: "uint256" },
            { name: "payload", type: "bytes", internalType: "bytes" },
        ],
        outputs: [],
        stateMutability: "nonpayable",
    },
] as const;

const now = (): bigint => BigInt(Math.floor(Date.now() / 1000));

export class Sequencer {
    private chainId: bigint;
    private appContract: Address;
    private _blockNumber = 1n;
    private _inputIndex = 0n;

    public get blockNumber(): bigint {
        return this._blockNumber;
    }

    public get inputIndex(): bigint {
        return this._inputIndex;
    }

    constructor(chainId: bigint, appContract: Address) {
        this.chainId = chainId;
        this.appContract = appContract;
    }

    public mine(sender: Address, payload: Hex) {
        return Buffer.from(
            hexToBytes(
                encodeFunctionData({
                    abi: InputsAbi,
                    functionName: "EvmAdvance",
                    args: [
                        this.chainId,
                        this.appContract,
                        sender,
                        this._blockNumber++,
                        now(),
                        0n, // prevRandao (not used)
                        this._inputIndex++,
                        payload,
                    ],
                }),
            ),
        );
    }
}
