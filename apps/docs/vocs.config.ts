import { defineConfig } from "vocs/config";

export default defineConfig({
    baseUrl: "https://deroll.dev",
    srcDir: ".",
    editLink: {
        link: "https://github.com/tuler/deroll/edit/main/apps/docs/pages/:path",
        text: "Edit on GitHub",
    },
    topNav: [
        { text: "App", link: "/quick-start" },
        { text: "Explorer", link: "/explorer" },
        {
            text: "Bindings",
            items: [
                { text: "cmio (libcmt)", link: "/cmio/getting-started" },
                { text: "cm (cartesi-machine)", link: "/cm" },
            ],
        },
    ],
    sidebar: {
        "/": [
        {
            text: "Quick Start",
            link: "/quick-start",
        },
        {
            text: "Application",
            link: "/application",
        },
        {
            text: "Advance Handlers",
            link: "/advance-handlers",
        },
        {
            text: "Inspect Handlers",
            link: "/inspect-handlers",
        },
        {
            text: "Data Encoding",
            link: "/data-encoding",
        },
        {
            text: "Wallet",
            link: "/wallet",
        },
        {
            text: "Vouchers",
            link: "/vouchers",
        },
        {
            text: "Project Structure",
            link: "/structure",
        },
        {
            text: "Migrating from v1 to v2",
            link: "/migrating",
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
                    link: "/wallet/overview",
                    collapsed: true,
                    items: [
                        {
                            text: "createWallet",
                            link: "/wallet/create-wallet",
                        },
                        {
                            text: "getWallet",
                            link: "/wallet/get-wallet",
                        },
                        {
                            text: "etherBalanceOf",
                            link: "/wallet/ether-balance-of",
                        },
                        {
                            text: "erc20BalanceOf",
                            link: "/wallet/erc20-balance-of",
                        },
                        {
                            text: "erc721Has",
                            link: "/wallet/erc721-has",
                        },
                        {
                            text: "erc1155BalanceOf",
                            link: "/wallet/erc1155-balance-of",
                        },
                        {
                            text: "transferEther",
                            link: "/wallet/transfer-ether",
                        },
                        {
                            text: "transferERC20",
                            link: "/wallet/transfer-erc20",
                        },
                        {
                            text: "transferERC721",
                            link: "/wallet/transfer-erc721",
                        },
                        {
                            text: "transferERC1155",
                            link: "/wallet/transfer-erc1155",
                        },
                        {
                            text: "transferBatchERC1155",
                            link: "/wallet/transfer-batch-erc1155",
                        },
                        {
                            text: "withdrawEther",
                            link: "/wallet/withdraw-ether",
                        },
                        {
                            text: "withdrawERC20",
                            link: "/wallet/withdraw-erc20",
                        },
                        {
                            text: "withdrawERC721",
                            link: "/wallet/withdraw-erc721",
                        },
                        {
                            text: "withdrawERC1155",
                            link: "/wallet/withdraw-erc1155",
                        },
                        {
                            text: "withdrawBatchERC1155",
                            link: "/wallet/withdraw-batch-erc1155",
                        },
                        {
                            text: "createWithdrawEtherVoucher",
                            link: "/wallet/create-withdraw-ether-voucher",
                        },
                        {
                            text: "createERC20TransferVoucher",
                            link: "/wallet/create-erc20-transfer-voucher",
                        },
                        {
                            text: "createERC721TransferVoucher",
                            link: "/wallet/create-erc721-transfer-voucher",
                        },
                        {
                            text: "createERC1155SingleTransferVoucher",
                            link: "/wallet/create-erc1155-single-transfer-voucher",
                        },
                        {
                            text: "createERC1155BatchTransferVoucher",
                            link: "/wallet/create-erc1155-batch-transfer-voucher",
                        },
                        {
                            text: "isEtherDeposit",
                            link: "/wallet/is-ether-deposit",
                        },
                        {
                            text: "isERC20Deposit",
                            link: "/wallet/is-erc20-deposit",
                        },
                        {
                            text: "isERC721Deposit",
                            link: "/wallet/is-erc721-deposit",
                        },
                        {
                            text: "isERC1155SingleDeposit",
                            link: "/wallet/is-erc1155-single-deposit",
                        },
                        {
                            text: "isERC1155BatchDeposit",
                            link: "/wallet/is-erc1155-batch-deposit",
                        },
                        {
                            text: "parseEtherDeposit",
                            link: "/wallet/parse-ether-deposit",
                        },
                        {
                            text: "parseERC20Deposit",
                            link: "/wallet/parse-erc20-deposit",
                        },
                        {
                            text: "parseERC721Deposit",
                            link: "/wallet/parse-erc721-deposit",
                        },
                        {
                            text: "parseERC1155SingleDeposit",
                            link: "/wallet/parse-erc1155-single-deposit",
                        },
                        {
                            text: "parseERC1155BatchDeposit",
                            link: "/wallet/parse-erc1155-batch-deposit",
                        },
                    ],
                },
                {
                    text: "Router",
                    link: "/router/overview",
                    collapsed: true,
                    items: [
                        {
                            text: "createRouter",
                            link: "/router/create-router",
                        },
                        {
                            text: "add",
                            link: "/router/add",
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
