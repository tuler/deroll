---
"@deroll/explorer": patch
---

keep the `@deroll/decoder` import external for decoders registered as hand-pasted esm.sh URLs — without the flag esm.sh rewrote the kit import to an absolute npm URL the import map cannot remap, silently loading `@deroll/decoder@0.1.0` (npm's `latest`) instead of the pinned kit, so v3 portal deposits failed to decode
