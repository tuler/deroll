---
"@deroll/wallet": major
---

refactor deposit parsing to use `@cartesi/codec`

The hand-rolled deposit parsing utilities were removed in favor of the new [`@cartesi/codec`](https://cartesi.github.io/rollups-ts/codec) package, which is now the canonical implementation of Cartesi rollups encoding and decoding:

-   removed `isEtherDeposit`, `isERC20Deposit`, `isERC721Deposit`, `isERC1155SingleDeposit` and `isERC1155BatchDeposit`: use `decodeDeposit` from `@cartesi/codec`, which dispatches on the input `msgSender` and returns a deposit discriminated by a `type` field;
-   removed `parseEtherDeposit`, `parseERC20Deposit`, `parseERC721Deposit`, `parseERC1155SingleDeposit` and `parseERC1155BatchDeposit`: use `decodeEtherDeposit`, `decodeErc20Deposit`, `decodeErc721Deposit`, `decodeErc1155SingleDeposit` and `decodeErc1155BatchDeposit` from `@cartesi/codec`;
-   removed the `EtherDeposit`, `ERC20Deposit`, `ERC721Deposit`, `ERC1155SingleDeposit` and `ERC1155BatchDeposit` types: use the deposit types exported by `@cartesi/codec`. Note that the ERC-20 deposit amount field is named `value` (not `amount`), and decoded deposits also carry the `baseLayerData`/`execLayerData` fields.

The wallet handler and the voucher creation utilities (`createWithdrawEtherVoucher`, `createERC20TransferVoucher`, `createERC721TransferVoucher`, `createERC1155SingleTransferVoucher` and `createERC1155BatchTransferVoucher`) are unchanged.
