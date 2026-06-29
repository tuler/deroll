import { BreakReason, create } from "@tuler/node-cartesi-machine";

// create a basic machine that print Hello world
const machine = create({
    ram: {
        length: 0x8000000, // 128MB of RAM
        image_filename: "linux.bin",
    },
    flash_drive: [
        {
            image_filename: "rootfs.ext2",
        },
    ],
    dtb: {
        entrypoint: "echo Hello world!",
    },
});

// run the machine until it yields or halts (default is MAX_MCYCLE)
const reason = machine.run();
switch (reason) {
    case BreakReason.YieldedManually:
        console.log("Machine yielded manually");
        break;
    case BreakReason.Halted:
        console.log("Machine halted");
        break;
    default:
        console.log(`Machine halted: ${reason}`);
}
console.log(reason);

// calculate machine root hash
const hash = machine.getRootHash();
console.log(hash);
