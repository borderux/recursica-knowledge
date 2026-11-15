# Betty on Hermes (CircleChat)

The prompt is `portable/circlechat/agents/betty/SOUL.md`, built from `SKILL.md` and
`platform/circlechat.md` by `node scripts/build-agents.mjs`. This file is the configuration
that has no business inside a prompt. `setup-agent.sh betty` sets each value below in her
`config.yaml` on every run (`kit/barb-limits.mjs`, which reads this file).

## Hermes `config.yaml` in her home

```yaml
tool_loop_guardrails:          # top level, NOT under agent:
  hard_stop_enabled: true
  hard_stop_after:
    exact_failure: 5
    idempotent_no_progress: 5
```

**`tool_loop_guardrails.hard_stop_enabled`.** This is the guardrail block Barb has, set to stop a
loop instead of only warning about it. Hermes watches every turn for repeated tool calls: the
same failing call, the same call with the same result, and a short cycle of calls that repeats
with the same results (write a file, run a command, write the same file again). By default it
only warns the model on an attended platform, and a CircleChat turn is a one-shot
`hermes chat -q`, which Hermes counts as the attended `cli` platform. So a warning was all that
ever happened. Observed: one turn wrote the same page and ran the same command more than 70
times in an hour, and its container held her home, so every new turn failed to start. With the
hard stop on, Hermes ends the turn instead.

**`hard_stop_after`.** When the hard stop fires. `exact_failure`: the same call failed this many
times. `idempotent_no_progress`: the same call returned the same result this many times in a
row, or the same short cycle repeated this many times. Both are Hermes's own defaults, written
here so that a Hermes upgrade cannot change them unseen. Five rounds of a two-call cycle is ten
calls, a few minutes on a slow local model.

The key is top-level. Under `agent:` Hermes ignores it, and `setup-agent.sh` refuses that shape
and writes nothing.
