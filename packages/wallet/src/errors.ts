import { inspect } from "node:util";

export class InvalidPayloadError extends Error {
    constructor(public payload: unknown) {
        super(`Invalid payload: ${inspect(payload)}`);
    }
}

export class MissingContextArgumentError<T extends object> extends Error {
    constructor(obj: T) {
        const missingKeys = Object.keys(obj).filter(
            (key) => obj[key as keyof T] === undefined,
        );
        super(`Missing context argument: ${missingKeys.join(", ")}`);
    }
}
