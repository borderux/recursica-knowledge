---
"@recursica/knowledge": patch
---

CircleChat kit: each systemd unit the kit writes is described as "(agent cluster kit)" instead of "(circlechat kit)". The kit no longer runs CircleChat 1.x.

A change to a unit's description alone reloads systemd and restarts no service. Without that rule, the new description would restart every kit service at the next setup. A restarted Kev-engine loads the model again. With `updates.follow` set to `"main"`, the update job runs each setup again by itself. Every computer would then restart the services within the hour. A unit with any other change still restarts the service.
