---
"@recursica/knowledge": minor
---

CircleChat host kit: `setup-node.sh` never restarts a running Kev engine on its own. Before, a rerun restarted kev-engine whenever the engine's command or secrets file changed, by hand or in the update job's run, which stopped the engine's work.

- **A held restart:** when a running Kev engine's unit would change, the setup writes nothing and restarts nothing. The engine keeps running with the old unit. The setup prints one line, `Held for a person: ...`, with what would change and the command that applies the change.
- **To apply:** `KIT_RESTART_KEV=1 <kit>/circlechat/setup-node.sh <computer>`, as the owner, when the engine is idle. The update job runs the setup with `KIT_HOLD_NETWORK=1`, which ignores `KIT_RESTART_KEV`.
- **One post:** the setup records the held change in `~/.recursica-kit/held-restarts/<service>`. Each hour, the update job posts once in the cluster's channel for each held change, again for a newer change or after 24 hours, as for held network changes (`cluster/held-restarts.mjs`). The record clears once a person applies the change, or once the unit no longer changes.
- **No hold** for an engine with no unit yet, or an engine that doesn't run: the engine installs and starts as before.

### Upgrading

Nothing to run. The first update that carries this change edits the job installer in `kit/lib.sh`, so the update job asks a person to run `install-cluster.sh` once, as for any edit there.
