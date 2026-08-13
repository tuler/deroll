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
                { text: "genext2fs (ext2 images)", link: "/genext2fs" },
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
            text: "The Rollup Loop",
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
            text: "Outputs",
            link: "/app/outputs",
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
        "/genext2fs/": [
            { text: "Introduction", link: "/genext2fs" },
            { text: "API", link: "/genext2fs/api" },
            { text: "Options", link: "/genext2fs/options" },
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
