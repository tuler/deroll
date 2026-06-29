import {
    rollups,
    RollupsFatalError,
    RollupsInputRejectedError,
} from "@tuler/node-cartesi-machine";
import fs from "node:fs";
import { encodePacked, parseUnits } from "viem";
import { Sequencer } from "./util";

const templateHash =
    "0x615acc9fb8ae058d0e45c0d12fa10e1a6c9e645222c6fd94dfeda194ee427c14";
const snapshotUrl =
    "https://github.com/cartesi/honeypot/releases/download/v2.0.0/honeypot-snapshot-mainnet.tar.gz";
const appContract = "0x4c1E74EF88a75C24e49eddD9f70D82A94D19251c";
const erc20PortalAddress = "0xc700D6aDd016eECd59d989C028214Eaa0fCC0051";
const withdrawAddress = "0x60247492F1538Ed4520e61aE41ca2A8447592Ff5";
const tokenAddress = "0x491604c0fdf08347dd1fa4ee062a822a5dd06b5d";

// check if file exists
const snapshotPath = `snapshots/${templateHash}`;

if (!fs.existsSync(snapshotPath)) {
    console.error(
        `snapshot not found at ${snapshotPath}, download from ${snapshotUrl}`,
    );
    process.exit(1);
}

// create an utility sequencer (create EvmAdvance inputs)
const sequencer = new Sequencer(1n, appContract);

// load honeypot mainnet machine
const machine = rollups(snapshotPath);

// send deposit
const deposit = sequencer.mine(
    erc20PortalAddress,
    encodePacked(
        ["address", "address", "uint256", "bytes"],
        [tokenAddress, withdrawAddress, parseUnits("1", 18), "0x"],
    ),
);
console.log(`Deposit`);
try {
    for (const event of machine.advance(deposit)) {
        switch (event.type) {
            case "output":
                console.log(event);
                break;
            case "report":
                console.log(event);
                break;
        }
    }
} catch (err: unknown) {
    if (err instanceof RollupsInputRejectedError) {
        console.log("input rejected");
    } else if (err instanceof RollupsFatalError) {
        console.log("input raised exception", err.message);
    }
}

// send withdraw request
const withdrawRequest = sequencer.mine(withdrawAddress, "0x");
console.log(`Withdraw request`);
try {
    for (const event of machine.advance(withdrawRequest)) {
        switch (event.type) {
            case "output":
                console.log(event);
                break;
            case "report":
                console.log(event);
                break;
        }
    }
} catch (err: unknown) {
    if (err instanceof RollupsInputRejectedError) {
        console.log("input rejected");
    } else if (err instanceof RollupsFatalError) {
        console.log("input raised exception", err.message);
    }
}
