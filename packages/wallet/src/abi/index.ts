export const erc1155Abi = [
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "operator",
                type: "address",
            },
            {
                indexed: false,
                internalType: "bool",
                name: "approved",
                type: "bool",
            },
        ],
        name: "ApprovalForAll",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "operator",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256[]",
                name: "ids",
                type: "uint256[]",
            },
            {
                indexed: false,
                internalType: "uint256[]",
                name: "values",
                type: "uint256[]",
            },
        ],
        name: "TransferBatch",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "operator",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "id",
                type: "uint256",
            },
            {
                indexed: false,
                internalType: "uint256",
                name: "value",
                type: "uint256",
            },
        ],
        name: "TransferSingle",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "string",
                name: "value",
                type: "string",
            },
            {
                indexed: true,
                internalType: "uint256",
                name: "id",
                type: "uint256",
            },
        ],
        name: "URI",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "id",
                type: "uint256",
            },
        ],
        name: "balanceOf",
        outputs: [
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address[]",
                name: "accounts",
                type: "address[]",
            },
            {
                internalType: "uint256[]",
                name: "ids",
                type: "uint256[]",
            },
        ],
        name: "balanceOfBatch",
        outputs: [
            {
                internalType: "uint256[]",
                name: "",
                type: "uint256[]",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "account",
                type: "address",
            },
            {
                internalType: "address",
                name: "operator",
                type: "address",
            },
        ],
        name: "isApprovedForAll",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256[]",
                name: "ids",
                type: "uint256[]",
            },
            {
                internalType: "uint256[]",
                name: "amounts",
                type: "uint256[]",
            },
            {
                internalType: "bytes",
                name: "data",
                type: "bytes",
            },
        ],
        name: "safeBatchTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "from",
                type: "address",
            },
            {
                internalType: "address",
                name: "to",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "id",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "amount",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "data",
                type: "bytes",
            },
        ],
        name: "safeTransferFrom",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "operator",
                type: "address",
            },
            {
                internalType: "bool",
                name: "approved",
                type: "bool",
            },
        ],
        name: "setApprovalForAll",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "interfaceId",
                type: "bytes4",
            },
        ],
        name: "supportsInterface",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "id",
                type: "uint256",
            },
        ],
        name: "uri",
        outputs: [
            {
                internalType: "string",
                name: "",
                type: "string",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
] as const;

export const cartesiDAppAbi = [
    {
        inputs: [
            {
                internalType: "contract IConsensus",
                name: "_consensus",
                type: "address",
            },
            {
                internalType: "address",
                name: "_owner",
                type: "address",
            },
            {
                internalType: "bytes32",
                name: "_templateHash",
                type: "bytes32",
            },
        ],
        stateMutability: "nonpayable",
        type: "constructor",
    },
    {
        inputs: [],
        name: "EtherTransferFailed",
        type: "error",
    },
    {
        inputs: [],
        name: "IncorrectEpochHash",
        type: "error",
    },
    {
        inputs: [],
        name: "IncorrectOutputHashesRootHash",
        type: "error",
    },
    {
        inputs: [],
        name: "IncorrectOutputsEpochRootHash",
        type: "error",
    },
    {
        inputs: [],
        name: "InputIndexOutOfClaimBounds",
        type: "error",
    },
    {
        inputs: [],
        name: "OnlyDApp",
        type: "error",
    },
    {
        inputs: [],
        name: "VoucherReexecutionNotAllowed",
        type: "error",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "contract IConsensus",
                name: "newConsensus",
                type: "address",
            },
        ],
        name: "NewConsensus",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: true,
                internalType: "address",
                name: "previousOwner",
                type: "address",
            },
            {
                indexed: true,
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "OwnershipTransferred",
        type: "event",
    },
    {
        anonymous: false,
        inputs: [
            {
                indexed: false,
                internalType: "uint256",
                name: "voucherId",
                type: "uint256",
            },
        ],
        name: "VoucherExecuted",
        type: "event",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_destination",
                type: "address",
            },
            {
                internalType: "bytes",
                name: "_payload",
                type: "bytes",
            },
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "uint64",
                                name: "inputIndexWithinEpoch",
                                type: "uint64",
                            },
                            {
                                internalType: "uint64",
                                name: "outputIndexWithinInput",
                                type: "uint64",
                            },
                            {
                                internalType: "bytes32",
                                name: "outputHashesRootHash",
                                type: "bytes32",
                            },
                            {
                                internalType: "bytes32",
                                name: "vouchersEpochRootHash",
                                type: "bytes32",
                            },
                            {
                                internalType: "bytes32",
                                name: "noticesEpochRootHash",
                                type: "bytes32",
                            },
                            {
                                internalType: "bytes32",
                                name: "machineStateHash",
                                type: "bytes32",
                            },
                            {
                                internalType: "bytes32[]",
                                name: "outputHashInOutputHashesSiblings",
                                type: "bytes32[]",
                            },
                            {
                                internalType: "bytes32[]",
                                name: "outputHashesInEpochSiblings",
                                type: "bytes32[]",
                            },
                        ],
                        internalType: "struct OutputValidityProof",
                        name: "validity",
                        type: "tuple",
                    },
                    {
                        internalType: "bytes",
                        name: "context",
                        type: "bytes",
                    },
                ],
                internalType: "struct Proof",
                name: "_proof",
                type: "tuple",
            },
        ],
        name: "executeVoucher",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "getConsensus",
        outputs: [
            {
                internalType: "contract IConsensus",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "getTemplateHash",
        outputs: [
            {
                internalType: "bytes32",
                name: "",
                type: "bytes32",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "contract IConsensus",
                name: "_newConsensus",
                type: "address",
            },
        ],
        name: "migrateToConsensus",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256[]",
                name: "",
                type: "uint256[]",
            },
            {
                internalType: "uint256[]",
                name: "",
                type: "uint256[]",
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        name: "onERC1155BatchReceived",
        outputs: [
            {
                internalType: "bytes4",
                name: "",
                type: "bytes4",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        name: "onERC1155Received",
        outputs: [
            {
                internalType: "bytes4",
                name: "",
                type: "bytes4",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "address",
                name: "",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "",
                type: "uint256",
            },
            {
                internalType: "bytes",
                name: "",
                type: "bytes",
            },
        ],
        name: "onERC721Received",
        outputs: [
            {
                internalType: "bytes4",
                name: "",
                type: "bytes4",
            },
        ],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [],
        name: "owner",
        outputs: [
            {
                internalType: "address",
                name: "",
                type: "address",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [],
        name: "renounceOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes4",
                name: "interfaceId",
                type: "bytes4",
            },
        ],
        name: "supportsInterface",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "newOwner",
                type: "address",
            },
        ],
        name: "transferOwnership",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "bytes",
                name: "_notice",
                type: "bytes",
            },
            {
                components: [
                    {
                        components: [
                            {
                                internalType: "uint64",
                                name: "inputIndexWithinEpoch",
                                type: "uint64",
                            },
                            {
                                internalType: "uint64",
                                name: "outputIndexWithinInput",
                                type: "uint64",
                            },
                            {
                                internalType: "bytes32",
                                name: "outputHashesRootHash",
                                type: "bytes32",
                            },
                            {
                                internalType: "bytes32",
                                name: "vouchersEpochRootHash",
                                type: "bytes32",
                            },
                            {
                                internalType: "bytes32",
                                name: "noticesEpochRootHash",
                                type: "bytes32",
                            },
                            {
                                internalType: "bytes32",
                                name: "machineStateHash",
                                type: "bytes32",
                            },
                            {
                                internalType: "bytes32[]",
                                name: "outputHashInOutputHashesSiblings",
                                type: "bytes32[]",
                            },
                            {
                                internalType: "bytes32[]",
                                name: "outputHashesInEpochSiblings",
                                type: "bytes32[]",
                            },
                        ],
                        internalType: "struct OutputValidityProof",
                        name: "validity",
                        type: "tuple",
                    },
                    {
                        internalType: "bytes",
                        name: "context",
                        type: "bytes",
                    },
                ],
                internalType: "struct Proof",
                name: "_proof",
                type: "tuple",
            },
        ],
        name: "validateNotice",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "uint256",
                name: "_inputIndex",
                type: "uint256",
            },
            {
                internalType: "uint256",
                name: "_outputIndexWithinInput",
                type: "uint256",
            },
        ],
        name: "wasVoucherExecuted",
        outputs: [
            {
                internalType: "bool",
                name: "",
                type: "bool",
            },
        ],
        stateMutability: "view",
        type: "function",
    },
    {
        inputs: [
            {
                internalType: "address",
                name: "_receiver",
                type: "address",
            },
            {
                internalType: "uint256",
                name: "_value",
                type: "uint256",
            },
        ],
        name: "withdrawEther",
        outputs: [],
        stateMutability: "nonpayable",
        type: "function",
    },
    {
        stateMutability: "payable",
        type: "receive",
    },
] as const;
