export const InputsAbi = [
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
