import { defineConfig } from "vocs/config";

export default defineConfig({
    baseUrl: "https://deroll.dev",
    srcDir: ".",
    editLink: {
        link: "https://github.com/tuler/deroll/edit/main/apps/docs/pages/:path",
        text: "Edit on GitHub",
    },
    topNav: [
        { text: "App", link: "/app/quick-start" },
        { text: "Codec", link: "/codec" },
        {
            text: "Bindings",
            items: [
                { text: "rollup (libcmt)", link: "/rollup" },
                { text: "cm (cartesi-machine)", link: "/cm" },
            ],
        },
        { text: "Explorer", link: "/explorer" },
    ],
    sidebar: {
        "/app/": [
        {
            text: "Quick Start",
            link: "/app/quick-start",
        },
        {
            text: "Application",
            link: "/app/application",
        },
        {
            text: "Advance Handlers",
            link: "/app/advance-handlers",
        },
        {
            text: "Inspect Handlers",
            link: "/app/inspect-handlers",
        },
        {
            text: "Data Encoding",
            link: "/app/data-encoding",
        },
        {
            text: "Wallet",
            link: "/app/wallet",
        },
        {
            text: "Vouchers",
            link: "/app/vouchers",
        },
        {
            text: "Project Structure",
            link: "/app/structure",
        },
        {
            text: "Migrating from v1 to v2",
            link: "/app/migrating",
        },
        {
            text: "API",
            items: [
                {
                    text: "App",
                    link: "/app/overview",
                    items: [
                        {
                            text: "createApp",
                            link: "/app/create-app",
                        },
                        {
                            text: "addAdvanceHandler",
                            link: "/app/add-advance-handler",
                        },
                        {
                            text: "addInspectHandler",
                            link: "/app/add-inspect-handler",
                        },
                        {
                            text: "createNotice",
                            link: "/app/create-notice",
                        },
                        {
                            text: "createReport",
                            link: "/app/create-report",
                        },
                        {
                            text: "createCallVoucher",
                            link: "/app/create-call-voucher",
                        },
                        {
                            text: "createErc20Transfer",
                            link: "/app/create-erc20-transfer",
                        },
                        {
                            text: "createErc721Transfer",
                            link: "/app/create-erc721-transfer",
                        },
                        {
                            text: "createErc1155Transfer",
                            link: "/app/create-erc1155-transfer",
                        },
                        {
                            text: "createErc1155BatchTransfer",
                            link: "/app/create-erc1155-batch-transfer",
                        },
                        {
                            text: "createOutput",
                            link: "/app/create-output",
                        },
                    ],
                },
                {
                    text: "Wallet",
                    link: "/app/wallet/overview",
                    collapsed: true,
                    items: [
                        {
                            text: "createWallet",
                            link: "/app/wallet/create-wallet",
                        },
                        {
                            text: "getWallet",
                            link: "/app/wallet/get-wallet",
                        },
                        {
                            text: "etherBalanceOf",
                            link: "/app/wallet/ether-balance-of",
                        },
                        {
                            text: "erc20BalanceOf",
                            link: "/app/wallet/erc20-balance-of",
                        },
                        {
                            text: "erc721Has",
                            link: "/app/wallet/erc721-has",
                        },
                        {
                            text: "erc1155BalanceOf",
                            link: "/app/wallet/erc1155-balance-of",
                        },
                        {
                            text: "transferEther",
                            link: "/app/wallet/transfer-ether",
                        },
                        {
                            text: "transferErc20",
                            link: "/app/wallet/transfer-erc20",
                        },
                        {
                            text: "transferErc721",
                            link: "/app/wallet/transfer-erc721",
                        },
                        {
                            text: "transferErc1155",
                            link: "/app/wallet/transfer-erc1155",
                        },
                        {
                            text: "transferBatchErc1155",
                            link: "/app/wallet/transfer-batch-erc1155",
                        },
                        {
                            text: "withdrawEther",
                            link: "/app/wallet/withdraw-ether",
                        },
                        {
                            text: "withdrawErc20",
                            link: "/app/wallet/withdraw-erc20",
                        },
                        {
                            text: "withdrawErc721",
                            link: "/app/wallet/withdraw-erc721",
                        },
                        {
                            text: "withdrawErc1155",
                            link: "/app/wallet/withdraw-erc1155",
                        },
                        {
                            text: "withdrawBatchErc1155",
                            link: "/app/wallet/withdraw-batch-erc1155",
                        },
                        {
                            text: "isEtherDeposit",
                            link: "/app/wallet/is-ether-deposit",
                        },
                        {
                            text: "isErc20Deposit",
                            link: "/app/wallet/is-erc20-deposit",
                        },
                        {
                            text: "isErc721Deposit",
                            link: "/app/wallet/is-erc721-deposit",
                        },
                        {
                            text: "isErc1155SingleDeposit",
                            link: "/app/wallet/is-erc1155-single-deposit",
                        },
                        {
                            text: "isErc1155BatchDeposit",
                            link: "/app/wallet/is-erc1155-batch-deposit",
                        },
                        {
                            text: "parseEtherDeposit",
                            link: "/app/wallet/parse-ether-deposit",
                        },
                        {
                            text: "parseErc20Deposit",
                            link: "/app/wallet/parse-erc20-deposit",
                        },
                        {
                            text: "parseErc721Deposit",
                            link: "/app/wallet/parse-erc721-deposit",
                        },
                        {
                            text: "parseErc1155SingleDeposit",
                            link: "/app/wallet/parse-erc1155-single-deposit",
                        },
                        {
                            text: "parseErc1155BatchDeposit",
                            link: "/app/wallet/parse-erc1155-batch-deposit",
                        },
                    ],
                },
                {
                    text: "Router",
                    link: "/app/router/overview",
                    collapsed: true,
                    items: [
                        {
                            text: "createRouter",
                            link: "/app/router/create-router",
                        },
                        {
                            text: "add",
                            link: "/app/router/add",
                        },
                    ],
                },
            ],
        },
        ],
        "/explorer/": [
            { text: "Overview", link: "/explorer" },
            { text: "Writing Decoders", link: "/explorer/decoders" },
            { text: "Open explorer.deroll.dev", link: "https://explorer.deroll.dev" },
        ],
        "/codec/": [
            { text: "Introduction", link: "/codec" },
            { text: "decodeAdvance / encodeAdvance", link: "/codec/decode-advance" },
            { text: "encodeNotice", link: "/codec/encode-notice" },
            { text: "encodeCallVoucher", link: "/codec/encode-call-voucher" },
            { text: "Asset transfer encoders", link: "/codec/encode-asset-transfers" },
            { text: "Types & Constants", link: "/codec/types" },
        ],
        "/rollup/": [
            { text: "Introduction", link: "/rollup" },
            { text: "Getting Started", link: "/rollup/getting-started" },
            {
                text: "User Guide",
                items: [
                    { text: "Handling Requests", link: "/rollup/guide/handling-requests" },
                    { text: "Emitting Outputs", link: "/rollup/guide/emitting-outputs" },
                    { text: "Testing on the Host", link: "/rollup/guide/testing" },
                    { text: "Running in the Cartesi Machine", link: "/rollup/guide/cartesi-machine" },
                ],
            },
            {
                text: "Reference",
                items: [
                    { text: "new Rollup()", link: "/rollup/reference/rollup" },
                    { text: "run", link: "/rollup/reference/run" },
                    { text: "waitForInput", link: "/rollup/reference/wait-for-input" },
                    { text: "emitOutput", link: "/rollup/reference/emit-output" },
                    { text: "emitReport", link: "/rollup/reference/emit-report" },
                    { text: "emitException", link: "/rollup/reference/emit-exception" },
                    { text: "progress", link: "/rollup/reference/progress" },
                    { text: "close", link: "/rollup/reference/close" },
                    { text: "Types & Constants", link: "/rollup/reference/types" },
                ],
            },
        ],
        "/cm/": [
            { text: "Introduction", link: "/cm" },
            { text: "Local Machine", link: "/cm/local" },
            { text: "Remote Machine", link: "/cm/remote" },
            { text: "Rollups Machine", link: "/cm/rollups" },
            { text: "Error Handling", link: "/cm/error-handling" },
            {
                text: "API",
                items: [
                    { text: "create", link: "/cm/api/create" },
                    { text: "load", link: "/cm/api/load" },
                    { text: "empty", link: "/cm/empty" },
                    { text: "spawn", link: "/cm/api/spawn" },
                    { text: "connect", link: "/cm/api/connect" },
                    { text: "rollups", link: "/cm/api/rollups" },
                    { text: "CartesiMachine", link: "/cm/api/cartesi-machine" },
                    { text: "RemoteCartesiMachine", link: "/cm/api/remote-cartesi-machine" },
                    { text: "RollupsMachine", link: "/cm/api/rollups-machine" },
                ],
            },
            { text: "Troubleshooting", link: "/cm/troubleshooting" },
        ],
    },
    socials: [
        {
            icon: "github",
            link: "https://github.com/tuler/deroll",
        },
        {
            icon: "x",
            link: "https://x.com/dtuler",
        },
    ],
    title: "deroll",
});
