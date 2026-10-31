---
"@recursica/knowledge": patch
---

CircleChat host kit: `setup-agent.sh` turns off Hermes's model-catalog refresh and update checks for every agent. Hermes's gateway starts on each turn and, 30 seconds later, refreshed its model picker's lists from `hermes-agent.nousresearch.com`, `openrouter.ai` and `portal.nousresearch.com`, which the outgoing filter refuses, so each turn left three refusals in the filter's log. On each run, the script now sets `model_catalog.enabled: false`, `updates.check: false` and `plugins.auto_update_check_hours: 0` in the agent's `config.yaml` (`kit/hermes-lookups.mjs`), inside the blocks the file already has, and keeps every other key. Each change is printed by key name, and a second run changes nothing. Barb's limits and these settings share one YAML merge, `kit/yaml-keys.mjs`.
