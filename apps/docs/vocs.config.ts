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
                        },
                        {
                            text: "getWallet",
                        },
                        {
                            text: "etherBalanceOf",
                        },
                        {
                            text: "erc20BalanceOf",
                        },
                        {
                            text: "erc721Has",
                        },
                        {
                            text: "erc1155BalanceOf",
                        },
                        {
                            text: "transferEther",
                        },
                        {
                            text: "transferERC20",
                        },
                        {
                            text: "transferERC721",
                        },
                        {
                            text: "transferERC1155",
                        },
                        {
                            text: "transferBatchERC1155",
                        },
                        {
                            text: "withdrawEther",
                        },
                        {
                            text: "withdrawERC20",
                        },
                        {
                            text: "withdrawERC721",
                        },
                        {
                            text: "withdrawERC1155",
                        },
                        {
                            text: "withdrawBatchERC1155",
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
                        },
                        {
                            text: "add",
                        },
                    ],
                },
            ],
        },
    ],
    title: "deroll",
});
