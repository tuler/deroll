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
        {
            text: "Bindings",
            items: [
                { text: "cmio (libcmt)", link: "/cmio/getting-started" },
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
                            text: "createVoucher",
                            link: "/app/create-voucher",
                        },
                        {
                            text: "createDelegateCallVoucher",
                            link: "/app/create-delegate-call-voucher",
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
                            text: "transferERC20",
                            link: "/app/wallet/transfer-erc20",
                        },
                        {
                            text: "transferERC721",
                            link: "/app/wallet/transfer-erc721",
                        },
                        {
                            text: "transferERC1155",
                            link: "/app/wallet/transfer-erc1155",
                        },
                        {
                            text: "transferBatchERC1155",
                            link: "/app/wallet/transfer-batch-erc1155",
                        },
                        {
                            text: "withdrawEther",
                            link: "/app/wallet/withdraw-ether",
                        },
                        {
                            text: "withdrawERC20",
                            link: "/app/wallet/withdraw-erc20",
                        },
                        {
                            text: "withdrawERC721",
                            link: "/app/wallet/withdraw-erc721",
                        },
                        {
                            text: "withdrawERC1155",
                            link: "/app/wallet/withdraw-erc1155",
                        },
                        {
                            text: "withdrawBatchERC1155",
                            link: "/app/wallet/withdraw-batch-erc1155",
                        },
                        {
                            text: "createWithdrawEtherVoucher",
                            link: "/app/wallet/create-withdraw-ether-voucher",
                        },
                        {
                            text: "createERC20TransferVoucher",
                            link: "/app/wallet/create-erc20-transfer-voucher",
                        },
                        {
                            text: "createERC721TransferVoucher",
                            link: "/app/wallet/create-erc721-transfer-voucher",
                        },
                        {
                            text: "createERC1155SingleTransferVoucher",
                            link: "/app/wallet/create-erc1155-single-transfer-voucher",
                        },
                        {
                            text: "createERC1155BatchTransferVoucher",
                            link: "/app/wallet/create-erc1155-batch-transfer-voucher",
                        },
                        {
                            text: "isEtherDeposit",
                            link: "/app/wallet/is-ether-deposit",
                        },
                        {
                            text: "isERC20Deposit",
                            link: "/app/wallet/is-erc20-deposit",
                        },
                        {
                            text: "isERC721Deposit",
                            link: "/app/wallet/is-erc721-deposit",
                        },
                        {
                            text: "isERC1155SingleDeposit",
                            link: "/app/wallet/is-erc1155-single-deposit",
                        },
                        {
                            text: "isERC1155BatchDeposit",
                            link: "/app/wallet/is-erc1155-batch-deposit",
                        },
                        {
                            text: "parseEtherDeposit",
                            link: "/app/wallet/parse-ether-deposit",
                        },
                        {
                            text: "parseERC20Deposit",
                            link: "/app/wallet/parse-erc20-deposit",
                        },
                        {
                            text: "parseERC721Deposit",
                            link: "/app/wallet/parse-erc721-deposit",
                        },
                        {
                            text: "parseERC1155SingleDeposit",
                            link: "/app/wallet/parse-erc1155-single-deposit",
                        },
                        {
                            text: "parseERC1155BatchDeposit",
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
        ],
        "/cmio/": [
            { text: "Introduction", link: "/cmio" },
            { text: "Getting Started", link: "/cmio/getting-started" },
            {
                text: "User Guide",
                items: [
                    { text: "Handling Requests", link: "/cmio/guide/handling-requests" },
                    { text: "Emitting Outputs", link: "/cmio/guide/emitting-outputs" },
                    { text: "Testing on the Host", link: "/cmio/guide/testing" },
                    { text: "Running in the Cartesi Machine", link: "/cmio/guide/cartesi-machine" },
                ],
            },
            {
                text: "Reference",
                items: [
                    { text: "new Rollup()", link: "/cmio/reference/rollup" },
                    { text: "run", link: "/cmio/reference/run" },
                    { text: "finish", link: "/cmio/reference/finish" },
                    { text: "emitVoucher", link: "/cmio/reference/emit-voucher" },
                    { text: "emitDelegateCallVoucher", link: "/cmio/reference/emit-delegate-call-voucher" },
                    { text: "emitNotice", link: "/cmio/reference/emit-notice" },
                    { text: "emitReport", link: "/cmio/reference/emit-report" },
                    { text: "emitException", link: "/cmio/reference/emit-exception" },
                    { text: "progress", link: "/cmio/reference/progress" },
                    { text: "gio", link: "/cmio/reference/gio" },
                    { text: "Merkle persistence", link: "/cmio/reference/merkle" },
                    { text: "close", link: "/cmio/reference/close" },
                    { text: "Types & Constants", link: "/cmio/reference/types" },
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
