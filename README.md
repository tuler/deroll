# deroll

Deroll, a TypeScript framework, facilitates the development of decentralized applications (dApps) on the [Cartesi](https://cartesi.io) blockchain technology. With a focus on simplicity, Deroll offers a toolkit and conventions to streamline your development workflow. Easily onboard using Node.js and Deroll to start building your Cartesi application with ease.

## Quick Start

### Prerequisites

Ensure you have Node.js and Yarn installed; you can download them from [nodejs.org](https://nodejs.org/) and [yarnpkg.com](https://yarnpkg.com/). Additionally, it's necessary to install [Cartesi CLI](https://docs.cartesi.io/).

### Creating a project

```shell
npm init @deroll/app
```

or

```shell
pnpm create @deroll/app
```

or

```shell
yarn create @deroll/app
```

### Simple example

Open the file `src/index.ts` and copy and paste the following code:

```ts
// Import necessary modules
import { createApp } from "@deroll/app";

// Create the application
const app = createApp({
  baseUrl: process.env.ROLLUP_HTTP_SERVER_URL || "http://127.0.0.1:5004",
});

// Handle input encoded in hex
app.addAdvanceHandler(async ({ payload }) => {
  // read payload as string
  const str = hexToString(payload);

  // create a notice with the string in uppercase
  await app.createNotice({ payload: stringToHex(str.toUpperCase()) });
});

// Start the application
app.start().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

### Build, run a rollups node and deploy your dApp

```shell
cartesi build
cartesi rollups start
cartesi deploy
```

Expected output:

```shell
✔ anvil service ready at http://127.0.0.1:8080/anvil
✔ rpc service ready at http://127.0.0.1:8080/rpc
✔ inspect service ready at http://127.0.0.1:8080/inspect/<application_address>
```

### Send a message

Open a new terminal and run:

```shell
cartesi send
```

1. Choose `Send generic input to the application.`
2. After choose `Foundry`
3. Select the defaults:
   1. Select the RPC URL `http://127.0.0.1:8545`
   2. Select Mnemonic
   3. Account, DApp address
4. Select `Input String encoding` and in the input type `Hello world!` and hit enter.

Expected output:

```shell
cartesi send
? Select send sub-command Send generic input to the application.
? Chain Foundry
? RPC URL http://127.0.0.1:8545
? Wallet Mnemonic
? Mnemonic test test test test test test test test test test test junk
? Account 0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266 9999.969240390387558666 ETH
? DApp address 0x70ac08179605AF2D9e75782b8DEcDD3c22aA4D0C
? Input String encoding
? Input (as string) Hello world!
✔ Input sent: 0xebd90fe6fd50245dfa30f33e2d68236a73b25e2351106484cfa9d815e401939d
```

Expected output in the `cartesi rollups logs` terminal:

```shell

```

Now you're ready to start building your Cartesi application with cartesi and deroll!

## Build from source

### Requirements

- Corepack (with pnpm) or pnpm v9 (9.7.1 recommended)
- Node 20 or greater (LTS)

### Installation

Corepack is a package manager that allows you to install packages from different package managers.
It is recommended to use it to install deroll because it come with nodejs.
But you can use pnpm if you want. To install corepack follow the instructions [here](https://pnpm.io/installation).

```sh
corepack install
corepack pnpm install
```

### Build

```sh
pnpm i
pnpm run build
```

## How to contribute

Try to follow deroll conventions and patterns, open a ticket to discuss ideas, or open a PR.

## License

This code is licensed under the [MIT License](./LICENSE).
