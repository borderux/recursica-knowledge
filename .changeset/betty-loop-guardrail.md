---
"@recursica/knowledge": patch
---

CircleChat host kit: Betty gets a tool loop guardrail, from the same `tool_loop_guardrails` config block Barb has. `agents/betty/runtime/hermes.md` holds the values, and `setup-agent.sh betty` sets them in her `config.yaml` on each run (`kit/barb-limits.mjs config betty`): `hard_stop_enabled: true`, and `hard_stop_after` at 5 for the same failing call and for the same call or short cycle returning the same result. A CircleChat turn is a one-shot `hermes chat`, which Hermes treats as attended, so a repeating turn was only warned, never stopped. One wrote the same page more than 70 times in an hour, and its container held her home so every new turn failed. Now Hermes ends such a turn. The same refusals as Barb's apply. Tests cover the values, the edit, and setup.
