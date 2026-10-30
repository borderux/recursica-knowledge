---
"@recursica/knowledge": patch
---

CircleChat host kit: `setup-agent.sh barb` sets Barb's limits from `agents/barb/runtime/hermes.md` on each run. The limits are `delegation.oneshot_max_children`, `delegation.max_concurrent_children`, `delegation.max_iterations` and `tool_loop_guardrails.loop_caps.max_subagents`, set inside the `delegation` block that Hermes's own default config already has. Before, the script added them only when no `delegation` block existed, so a fresh install never got them. The script also gives Barb her Kev-engine key from `$CC_DIR/.env` when none is given, and checks `HERMES_TIMEOUT`, printing only `HERMES_TIMEOUT ok` or the value it should be.
