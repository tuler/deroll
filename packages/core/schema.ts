import fs from "fs";
import openapiTS, { astToString } from "openapi-typescript";
import ts from "typescript";

const ADDRESS = ts.factory.createTypeReferenceNode(
    ts.factory.createIdentifier("Address"),
);
const HEX = ts.factory.createTypeReferenceNode(
    ts.factory.createIdentifier("Hex"),
);
const NULL = ts.factory.createLiteralTypeNode(ts.factory.createNull());

/*
This code customizes the TypeScript schema generation using openapi-typescript 
Node API defined at https://openapi-ts.pages.dev/node/. The goal is to use the 
viem types Hex and Address instead of simple strings for some schema properties.
*/

const inputFile =
    "https://raw.githubusercontent.com/cartesi/openapi-interfaces/v0.9.0/rollup.yaml";
const outputFile = "src/schema.ts";

// import types from viem in generated code
const inject = "import { Address, Hex } from 'viem';\n";

console.log(`${inputFile} -> ${outputFile}`);
openapiTS(inputFile, {
    transform: (schemaObject, _metadata) => {
        if ("format" in schemaObject && schemaObject.format === "hex") {
            // use viem.Hex if format is hex
            return schemaObject.nullable
                ? ts.factory.createUnionTypeNode([HEX, NULL])
                : HEX;
        } else if (
            "format" in schemaObject &&
            schemaObject.format === "address"
        ) {
            // use viem.Address if format is address
            return schemaObject.nullable
                ? ts.factory.createUnionTypeNode([ADDRESS, NULL])
                : ADDRESS;
        }
    },
}).then((output) =>
    fs.writeFileSync(outputFile, `${inject}${astToString(output)}`),
);
