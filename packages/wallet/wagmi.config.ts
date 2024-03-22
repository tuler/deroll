/* eslint-disable @typescript-eslint/ban-ts-comment */
import type { Abi } from "abitype";
import { defineConfig } from "@wagmi/cli";
import { erc20Abi, erc721Abi } from "viem";
import hardhatDeploy from "@sunodo/wagmi-plugin-hardhat-deploy";
// @ts-ignore
import CartesiDApp from "@cartesi/rollups/export/artifacts/contracts/dapp/CartesiDApp.sol/CartesiDApp.json" assert { type: "json" };
// @ts-ignore
import erc1155Abi from "./smart_contracts/erc1155-abi.json" assert { type: "json" };

export default defineConfig({
    out: "src/rollups.ts",
    contracts: [
        {
            name: "erc20",
            abi: erc20Abi,
        },
        {
            name: "erc721",
            abi: erc721Abi,
        },
        {
            name: "erc1155",
            abi: erc1155Abi as Abi,
        },
        {
            name: CartesiDApp.contractName,
            abi: CartesiDApp.abi as Abi,
        },
    ],
    plugins: [
        hardhatDeploy({
            directory: "node_modules/@cartesi/rollups/export/abi",
            includes: [
                /CartesiDApp/,
                /DAppAddressRelay/,
                /ERC20Portal/,
                /ERC721Portal/,
                /ERC1155SinglePortal/,
                /ERC1155BatchPortal/,
                /EtherPortal/,
            ],
        }),
    ],
});
