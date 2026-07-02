---
"@deroll/explorer": patch
---

point the `@deroll/decoder` import map at the kit's home in this monorepo, pinned to a commit — esm.sh intermittently fails to resolve floating branch refs, which broke every kit-using decoder
