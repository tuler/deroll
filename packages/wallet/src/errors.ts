export class RelayError extends Error {
    constructor() {
        super(
            `application has not received its address from DAppAddressRelay`,
        );
    }
}

export class InsufficientBalanceError extends Error {
    constructor(user: string, token: string, tokenId: bigint) {
        super(`user ${user} does not have token ${tokenId} of token ${token}`);
    }
}

export class ArrayNoSameLength extends Error {
    constructor(first: string, second: string) {
        super(`${first} and ${second} must have the same length`);
    }
}

export class NegativeAmountError extends Error {
    constructor(amount: bigint) {
        super(`negative amount: ${amount}`);
    }
}


export class ArrayEmptyError extends Error {
    constructor(name: string) {
        super(`${name} must not be empty`);
    }
}
