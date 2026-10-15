---
"@deroll/explorer": minor
"@deroll/mock-server": minor
---

Decode Cartesi sequencer batches natively. Once an application's batch submitter is set on its Overview page, batch inputs unfold into their user operations in the inputs list, the input page shows the batch frame by frame, each operation has its own page, and a User ops tab lists every operation with a signer filter. Signers are recovered as the scheduler recovers them, and each operation's `data` is decoded by the application's `userOp` decoder method. The mock server gains signed batches for the perp-dex app.
