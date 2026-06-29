import {
    rollups,
    RollupsFatalError,
    RollupsInputRejectedError,
} from "@tuler/node-cartesi-machine";
import { InputsAbi } from "docs/snippets/inputsAbi";
import fs from "node:fs";
import {
    bytesToHex,
    encodeFunctionData,
    encodePacked,
    hexToBigInt,
    hexToBytes,
    parseUnits,
} from "viem";

const templateHash =
    "0x615acc9fb8ae058d0e45c0d12fa10e1a6c9e645222c6fd94dfeda194ee427c14";
const snapshotUrl =
    "https://github.com/cartesi/honeypot/releases/download/v2.0.0/honeypot-snapshot-mainnet.tar.gz";
const appContract = "0x4c1E74EF88a75C24e49eddD9f70D82A94D19251c";
const erc20PortalAddress = "0xc700D6aDd016eECd59d989C028214Eaa0fCC0051";
const tokenAddress = "0x491604c0fdf08347dd1fa4ee062a822a5dd06b5d";

// check if file exists
const snapshotPath = `snapshots/${templateHash}`;

if (!fs.existsSync(snapshotPath)) {
    console.error(
        `snapshot not found at ${snapshotPath}, download from ${snapshotUrl}`,
    );
    process.exit(1);
}

// load honeypot mainnet machine
const machine = rollups(snapshotPath);

const run = (input: Buffer) => {
    for (const event of machine.advance(input)) {
        switch (event.type) {
            case "output":
                console.log({ ...event, data: bytesToHex(event.data) });
                break;
            case "report":
                console.log({ ...event, data: bytesToHex(event.data) });
                break;
        }
    }
};

try {
    // send withdraw request 1
    console.log(`Withdraw request 1`);
    run(
        Buffer.from(
            hexToBytes(
                encodeFunctionData({
                    abi: InputsAbi,
                    functionName: "EvmAdvance",
                    args: [
                        1n,
                        appContract,
                        "0x60247492F1538Ed4520e61aE41ca2A8447592Ff5",
                        22677715n,
                        1748038683n,
                        hexToBigInt(
                            "0x8ba680cf93ef3a449119d11cb1bed268ec4b7a260972b6b979b2f5f501d9868e",
                        ),
                        0n,
                        "0x",
                    ],
                }),
            ),
        ),
    );
    console.log("-".repeat(80));

    // send deposit 1
    console.log(`Deposit 1`);
    run(
        Buffer.from(
            hexToBytes(
                encodeFunctionData({
                    abi: InputsAbi,
                    functionName: "EvmAdvance",
                    args: [
                        1n,
                        appContract,
                        erc20PortalAddress,
                        22677956n,
                        1748047607n,
                        hexToBigInt(
                            "0xa7563f90d02b094d84056cad953782f8bb39ee4a1f69c09c4345f8621aadf433",
                        ),
                        1n,
                        encodePacked(
                            ["address", "address", "uint256", "bytes"],
                            [
                                tokenAddress,
                                "0xa2E3A2ca689c00F08F34b62cCC73B1477eF1f658",
                                parseUnits("1", 18),
                                "0x",
                            ],
                        ),
                    ],
                }),
            ),
        ),
    );
    console.log("-".repeat(80));

    // send withdraw request 2
    console.log(`Withdraw request 2`);
    run(
        Buffer.from(
            hexToBytes(
                encodeFunctionData({
                    abi: InputsAbi,
                    functionName: "EvmAdvance",
                    args: [
                        1n,
                        appContract,
                        "0x60247492F1538Ed4520e61aE41ca2A8447592Ff5",
                        22678021n,
                        1748049959n,
                        hexToBigInt(
                            "0xe3ebc6ca65e3e35cd1cbc1e75ff7529e2c7357343514c0a051e884278c08b25",
                        ),
                        2n,
                        "0x",
                    ],
                }),
            ),
        ),
    );
    console.log("-".repeat(80));

    // send deposit 2
    console.log(`Deposit 2`);
    run(
        Buffer.from(
            hexToBytes(
                encodeFunctionData({
                    abi: InputsAbi,
                    functionName: "EvmAdvance",
                    args: [
                        1n,
                        appContract,
                        erc20PortalAddress,
                        22716857n,
                        1748492255n,
                        hexToBigInt(
                            "0x6105de19bf2627af9c56375cad8812c02b28b8f92aface263e95606088cccd5a",
                        ),
                        3n,
                        encodePacked(
                            ["address", "address", "uint256", "bytes"],
                            [
                                tokenAddress,
                                "0xD27A20A18496AE3200358E569B107D62a1e3f463",
                                parseUnits("42", 18),
                                "0x",
                            ],
                        ),
                    ],
                }),
            ),
        ),
    );
    console.log("-".repeat(80));

    // send bogus request (?)
    console.log(`Bogus request: L2Beat test`);
    run(
        Buffer.from(
            hexToBytes(
                encodeFunctionData({
                    abi: InputsAbi,
                    functionName: "EvmAdvance",
                    args: [
                        1n,
                        appContract,
                        "0xC04689227Fa24785609B1174698DBe481437f1A3",
                        22773559n,
                        1748923763n,
                        hexToBigInt(
                            "0x9dc18602745de8ce96a11433e2714e717037064244ff0502c106e9583a4e5c2b",
                        ),
                        4n,
                        "0x4c1e74ef88a75c24e49eddd9f70d82a94d19251c",
                    ],
                }),
            ),
        ),
    );
    console.log("-".repeat(80));

    // send deposit 3
    console.log(`Deposit 3`);
    run(
        Buffer.from(
            hexToBytes(
                encodeFunctionData({
                    abi: InputsAbi,
                    functionName: "EvmAdvance",
                    args: [
                        1n,
                        appContract,
                        erc20PortalAddress,
                        22780304n,
                        1748959119n,
                        hexToBigInt(
                            "0x828fe4f673a9781c1fa9c5a6c106e85690e1d664e37fe60527f709508c7f8d74",
                        ),
                        5n,
                        encodePacked(
                            ["address", "address", "uint256", "bytes"],
                            [
                                tokenAddress,
                                "0xa2E3A2ca689c00F08F34b62cCC73B1477eF1f658",
                                parseUnits("19999", 18),
                                "0x",
                            ],
                        ),
                    ],
                }),
            ),
        ),
    );
    console.log("-".repeat(80));
} catch (err: unknown) {
    if (err instanceof RollupsInputRejectedError) {
        console.log("input rejected");
    } else if (err instanceof RollupsFatalError) {
        console.log("input raised exception", err.message);
    }
}
