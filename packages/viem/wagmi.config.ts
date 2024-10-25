import { defineConfig } from "@wagmi/cli";
import hardhatDeploy from "@sunodo/wagmi-plugin-hardhat-deploy";
import CartesiDApp from "@cartesi/rollups/export/artifacts/contracts/dapp/CartesiDApp.sol/CartesiDApp.json" assert { type: "json" };
import { Abi } from "viem";

export default defineConfig({
    out: "src/rollups.ts",
    contracts: [
        {
            abi: CartesiDApp.abi as Abi,
            name: "CartesiDApp",
        },
    ],
    plugins: [
        hardhatDeploy({
            directory: "node_modules/@cartesi/rollups/export/abi",
            includes: [
                /CartesiDApp/,
                /DAppAddressRelay/,
                /ERC1155SinglePortal/,
                /ERC1155BatchPortal/,
                /ERC20Portal/,
                /ERC721Portal/,
                /EtherPortal/,
                /InputBox/,
            ],
        }),
    ],
});
