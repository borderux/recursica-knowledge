---
"@recursica/knowledge": patch
---

Kev holds every engine request under one limit, across his pool over the skills and his pool over each skill's code units. `KEV_MAX_IN_FLIGHT`, when set, is that limit and both pools' width; without it, `KEV_CONCURRENCY` is. A 429 from the gateway is a wait, not a failed question: Kev waits as the answer's `retry-after` says, then asks again, up to 6 times.
