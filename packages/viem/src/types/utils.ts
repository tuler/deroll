import { Account, Address } from "viem";
import { Prettify } from "viem/chains";

// missing imports from viem library
export type GetAccountParameter<
    account extends Account | undefined = Account | undefined,
    accountOverride extends Account | Address | undefined = Account | Address,
    required extends boolean = true,
> =
    IsUndefined<account> extends true
        ? required extends true
            ? { account: accountOverride | Account | Address }
            : { account?: accountOverride | Account | Address | undefined }
        : { account?: accountOverride | Account | Address | undefined };

export type ErrorType<name extends string = "Error"> = Error & { name: name };
export type IsUndefined<T> = [undefined] extends [T] ? true : false;
export type UnionEvaluate<type> = type extends object ? Prettify<type> : type;
