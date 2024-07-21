import { GetVoucherReturnType } from "@deroll/rpc/client";
import { Address, getAddress, Hex, isAddress, isHex } from "viem";

type Proof = {
    context: Hex;
    validity: {
        inputIndexWithinEpoch: bigint;
        machineStateHash: Hex;
        noticesEpochRootHash: Hex;
        outputHashInOutputHashesSiblings: Hex[];
        outputHashesInEpochSiblings: Hex[];
        outputHashesRootHash: Hex;
        outputIndexWithinInput: bigint;
        vouchersEpochRootHash: Hex;
    };
};

type ExecuteVoucherArgs = [Address, Hex, Proof];

export const toEVM = (voucher: GetVoucherReturnType): ExecuteVoucherArgs => {
    if (!isAddress(voucher.destination)) {
        throw new Error("Invalid destination address");
    }
    if (!isHex(voucher.payload)) {
        throw new Error("Invalid payload");
    }
    if (!voucher.proof) {
        throw new Error("Voucher has no proof");
    }

    const destination = getAddress(voucher.destination);
    const payload = voucher.payload as Hex;
    const proof: Proof = {
        context: voucher.proof.context as Hex,
        validity: {
            inputIndexWithinEpoch: BigInt(
                voucher.proof.validity.inputIndexWithinEpoch,
            ),
            machineStateHash: voucher.proof.validity.machineStateHash as Hex,
            noticesEpochRootHash: voucher.proof.validity
                .noticesEpochRootHash as Hex,
            outputHashesInEpochSiblings:
                voucher.proof.validity.outputHashesInEpochSiblings.map(
                    (v) => v as Hex,
                ),
            outputHashesRootHash: voucher.proof.validity
                .outputHashesRootHash as Hex,
            outputIndexWithinInput: BigInt(
                voucher.proof.validity.outputIndexWithinInput,
            ),
            outputHashInOutputHashesSiblings:
                voucher.proof.validity.outputHashInOutputHashesSiblings.map(
                    (v) => v as Hex,
                ),
            vouchersEpochRootHash: voucher.proof.validity
                .vouchersEpochRootHash as Hex,
        },
    };
    return [destination, payload, proof];
};
