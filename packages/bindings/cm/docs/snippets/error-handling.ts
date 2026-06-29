import { ErrorCode, load, MachineError } from "@tuler/node-cartesi-machine";

try {
    const machine = load("./snapshot");
    machine.run();
} catch (err: unknown) {
    if (err instanceof MachineError) {
        switch (err.code) {
            case ErrorCode.InvalidArgument:
                console.error("Invalid argument", err.description);
                break;
            default:
                console.error(err.code, err.description);
                break;
        }
    }
}
