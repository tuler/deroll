import { defineConfig } from "vocs";

export default defineConfig({
    baseUrl: "https://deroll.dev",
    rootDir: ".",
    editLink: {
        pattern:
            "https://github.com/tuler/deroll/edit/main/apps/docs/pages/:path",
        text: "Edit on GitHub",
    },
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
