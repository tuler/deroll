import { defineConfig } from "vocs";

export default defineConfig({
    baseUrl: "https://deroll.dev",
    rootDir: ".",
    sidebar: [
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
                            text: "addNotice",
                            link: "/app/add-notice",
                        },
                        {
                            text: "addReport",
                            link: "/app/add-report",
                        },
                        {
                            text: "addVoucher",
                            link: "/app/add-voucher",
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
    title: "deroll",
});
