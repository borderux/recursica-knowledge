# Barb on Hermes (CircleChat)

The prompt is `portable/circlechat/agents/barb/SOUL.md`, built from `SKILL.md` and
`platform/circlechat.md` by `node scripts/build-agents.mjs`. Copy it to her Hermes home as
`SOUL.md`. This file is the configuration that has no business inside a prompt. Every setting
below was found the hard way: each default made a full review fail, and each failure looked
like Barb misbehaving rather than the platform stopping her.

## Hermes `config.yaml` in her home

```yaml
delegation:
  oneshot_max_children: 0      # 0 = no cap
  max_concurrent_children: 3
  max_iterations: 50

tool_loop_guardrails:          # top level, NOT under agent:
  loop_caps:
    max_subagents: 150
```

**`oneshot_max_children`.** CircleChat runs every turn as a one-shot Hermes session, and
one-shot sessions cap delegation at 2 sub-agents in total by default. A review needs a checker
per skill (20–30) and a feisty per finding. With the default she reports a "delegation budget
of 0" and falls back to a single-pass review with nothing refuted. That is the failure to
recognise: findings arrive, but none were challenged.

**`tool_loop_guardrails.loop_caps.max_subagents`.** A per-turn runaway guard, 50 by default. A
full review on a small screen used about 52. When it trips she stops with "I kept running
delegate_task 50 times without making progress" and no report. The key is top-level; under
`agent:` it is silently ignored. 150 leaves room and still catches a real loop.

## CircleChat `.env`

```
HERMES_TIMEOUT=4000
```

Seconds. The API waits `HERMES_TIMEOUT + 60 s` for an agent turn and discards the reply after
that. The default (480) and a later 1200 were both shorter than a full review, so the review
ran, finished, and vanished: no message, no tasks. Recreate the containers after changing it
(`docker compose up -d --force-recreate`) and confirm with
`docker exec <api container> printenv HERMES_TIMEOUT`.

## Chat length

The bridge cuts chat replies to 2,000 characters (`CHAT_BODY_MAX`). Delegation progress lines
count against it, so a full report loses its findings off the end. The fragment tells her to
write the report to `/workspace/reviews/` and attach it. If a reply still looks cut, her last
message is in `state.db` in her home (`messages` table, `role='assistant'`).

## Kev-engine access

Her container cannot reach the host's `localhost`, even with `--network=host`, when Docker runs
under Docker Desktop / WSL. Kev-engine must listen on `0.0.0.0` with a key set, and she reaches
it at `host.docker.internal:8009`. Put the key in her Hermes home `.env` as
`KEV_ENGINE_KEY=...`, never in `SOUL.md`, and check her terminal actually sees it by asking her to run `echo ${KEV_ENGINE_KEY:+set}`. If it prints nothing, Hermes is not passing that variable to her shell, and Kev will fail (which sends her to a full review, not a false clean). See `tools/kev/ENGINE.md`.

`/workspace/kev` and `/workspace/reviews` must be writable by the container's user (the Kev
cache and her reports live there).

## Cost

One clean full review of a ~200-line screen: roughly 25 Sonnet sub-agents. Early runs that
hit the limits above cost several times that. Measure a single clean run before budgeting.
