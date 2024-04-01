import { inspect } from "node:util";

export class InvalidPayloadError extends Error {
    constructor(public payload: unknown) {
        super(`Invalid payload: ${inspect(payload)}`);
    }
}

export class RelayError extends Error {
    constructor() {
        super(
            `application has not received its address from DAppAddressRelay`,
        );
    }
}

export class InsufficientBalanceError extends Error {
    constructor(user: string, token: string, amount: bigint, tokenId?: bigint) {
        super(
            `insufficient balance of user ${user} of token ${token}: ${amount.toString()}${
                tokenId ? ` of tokenId ${tokenId}` : ""
            }`,
        );
    }
}

export class WalletUndefinedError extends Error {
    constructor(address: string) {
        super(`wallet of user ${address} is undefined`);
    }
}

export class TokenFromUserNotFound extends Error {
    constructor(user: string, token: string, tokenId: bigint) {
        super(`user ${user} does not have token ${tokenId} of token ${token}`);
    }
}

export class ArrayNoSameLength extends Error {
    constructor(first: string, second: string) {
        super(`${first} and ${second} must have the same length`);
    }
}

export class NegativeTokenIdError extends Error {
    constructor(tokenId: bigint, amount: bigint) {
        super(`negative value for tokenId ${tokenId}: ${amount}`);
    }
}

export class ArrayEmptyError extends Error {
    constructor(name: string) {
        super(`${name} must not be empty`);
    }
}
