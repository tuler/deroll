import { createApp } from "@deroll/app";
import { decodeFunctionData, parseAbi, toHex } from "viem";

// create application
const app = createApp();

// define application ABI
const abi = parseAbi([
    "function attackDragon(uint256 dragonId, string weapon)",
    "function drinkPotion()",
]);

// handle input encoded as ABI function call
app.addAdvanceHandler(({ payload }) => {
    const { functionName, args } = decodeFunctionData({
        abi,
        data: toHex(payload),
    });

    switch (functionName) {
        case "attackDragon": {
            const [dragonId, weapon] = args;
            console.log(`attacking dragon ${dragonId} with ${weapon}...`);
            return true;
        }

        case "drinkPotion": {
            console.log(`drinking potion...`);
            return true;
        }
    }
    return false;
});

// start app
app.start().catch((e) => {
    console.error(e);
    process.exit(1);
});
