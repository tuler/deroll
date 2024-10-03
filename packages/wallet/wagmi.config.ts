import { defineConfig } from "@wagmi/cli";
import hardhatDeploy from "@sunodo/wagmi-plugin-hardhat-deploy";

export default defineConfig({
    out: "src/rollups.ts",
    plugins: [
        hardhatDeploy({
            directory: "node_modules/@cartesi/rollups/export/abi",
            includes: [
                /ERC1155BatchPortal/,
                /ERC1155SinglePortal/,
                /ERC20Portal/,
                /ERC721Portal/,
                /EtherPortal/,
            ],
            include_networks: ["sepolia"],
        }),
    ],
});
