import { Rollup } from "@cartesi/rollup";
import { decodeFunctionData, parseAbi, toHex } from "viem";

// open the rollup device
const rollup = new Rollup();

// define application ABI
const abi = parseAbi([
    "function attackDragon(uint256 dragonId, string weapon)",
    "function drinkPotion()",
]);

// handle input encoded as ABI function call
rollup
    .run({
        advance: ({ payload }) => {
            const { functionName, args } = decodeFunctionData({
                abi,
                data: toHex(payload),
            });

            switch (functionName) {
                case "attackDragon": {
                    const [dragonId, weapon] = args;
                    console.log(
                        `attacking dragon ${dragonId} with ${weapon}...`,
                    );
                    return true;
                }

                case "drinkPotion": {
                    console.log(`drinking potion...`);
                    return true;
                }
            }
            return false;
        },
    })
    .catch((e) => {
        console.error(e);
        process.exit(1);
    });
