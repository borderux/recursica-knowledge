---
"@recursica/knowledge": patch
---

CircleChat host kit tests: the jobd tests start jobd on a free port. The tests took a random port from a fixed range, without a check that the port was free. On a cluster computer, a live service on that port made the tests fail or wait.

- **The system picks the port.** A new test helper, `circlechat/jobd/test-jobd.mjs`, asks the system for a free port and starts jobd on that port.
- **The tests wait for jobd.** The helper waits for jobd's line that says jobd listens, in place of a fixed wait.
- **A taken port gets a new try.** When jobd exits before jobd listens, the helper tries a new port, up to 5 tries.

The change touches only the tests.
