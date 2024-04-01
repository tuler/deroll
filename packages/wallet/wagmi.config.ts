import { defineConfig } from "@wagmi/cli";
import hardhatDeploy from "@sunodo/wagmi-plugin-hardhat-deploy";

export default defineConfig({
    out: "src/rollups.ts",
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
            ],
        }),
    ],
});
