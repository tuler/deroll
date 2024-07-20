# Cartesi JSON-RPC API

JSON-RPC API to query Cartesi application inputs and outputs.

The implementation is written in TypeScript and uses a GraphQL connection to the node to serve its requests.

## Spec

The API specification is written in [OpenRPC](https://open-rpc.org) format and can be found in the [openrpc.json](openrpc.json) file. The specification is also available in the [OpenRPC Playground](https://playground.open-rpc.org/?schemaUrl=https://raw.githubusercontent.com/tuler/deroll/main/packages/rpc/openrpc.json).

## Running

To run the RPC server, execute the command below, where `<graphqlUri>` is the URL of the GraphQL endpoint of the Cartesi node:

```shell
npx @deroll/rpc <graphqlUri>
```
