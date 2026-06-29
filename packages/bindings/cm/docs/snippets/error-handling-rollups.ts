import {
    rollups,
    RollupsFatalError,
    RollupsInputRejectedError,
} from "@tuler/node-cartesi-machine";

const machine = rollups("snapshot");

const input = Buffer.from([0x00]); // !not a valid advance input
try {
    for (const event of machine.advance(input)) {
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

machine.shutdown();
