---
"@recursica/knowledge": patch
---

CircleChat host kit CI: the two GitHub checks in the smoke install try up to 4 times, 30 seconds apart. The checks are "the filter allows GitHub" and "an agent container still finds the filter by name". Every other check stays a single try.

- **The cause:** when one name lookup fails, Squid keeps the failed lookup for 1 minute. Both GitHub checks then fail together, and a rerun passes.
- **The tries cover 90 seconds,** longer than that minute.
- **Each failed try prints the filter's answer.** A failed check also prints the filter's last 3 log lines for api.github.com.

The change touches only CI.
