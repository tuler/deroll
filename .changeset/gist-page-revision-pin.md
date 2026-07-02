---
"@deroll/explorer": patch
---

pin gist page URL registrations to the gist's current revision — the gists API lookup already made for the filename also carries the revision, so the esm.sh URL no longer floats at the gist's HEAD, where esm.sh's request-time resolution goes stale after a gist edit or fails intermittently (revision-pinned raw URLs never had this problem)
