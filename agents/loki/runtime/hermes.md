# Loki on Hermes (CircleChat)

The prompt is `portable/circlechat/agents/loki/SOUL.md`, built from `SKILL.md` and
`platform/circlechat.md`, and installed by `circlechat/setup-agent.sh loki`. This file is the
configuration that has no business inside a prompt. Loki runs on a local model, which is where
every setting below came from.

## Fence

On CircleChat Loki has no Drive and no tool servers. He writes only in `/workspace/loki/`, one
folder per study (`Loki_<project_name>`). `setup-agent.sh` refuses him if his `config.yaml` has
any `mcp_servers`, since a server that reaches client data would break the fence.

## Model

Any OpenAI-compatible local model server, reached from the container as a custom provider,
such as `http://host.docker.internal:<port>/v1`.

## Context sizes

```yaml
model:
  context_length: 131072
auxiliary:
  compression:
    context_length: 131072
```

Hermes guesses a local model's window from its own model list, and has guessed **51,200** for
a model served with **262,144**. Two failures followed, one after the other:

- Below Hermes' 64K minimum for the compression model, every turn was refused before it started.
- Once that was overridden, a long task thread outgrew the guessed window and Hermes could not
  compress it: "This conversation has grown too long … Start a new session with /new".

Check what the server really serves (`curl …/v1/models`, `context_length`) and pin about half
of it: room for long threads without every turn paying for the whole window. `setup-agent.sh`
pins 131072 when the keys are absent (`LOKI_CONTEXT=` overrides), and leaves them alone after.

**Compression summaries run on his own model.** The script points every agent's `summary_model`
at the agent's own route, through the model gateway. Loki's cloud switch is off in site.json, so
his summaries stay on the cluster.

## What a small local model gets wrong

Seen in testing, and why `platform/circlechat.md` spells each turn out as
numbered steps: it split one study across two folders, marked a two-interview study done after
one, and lost the link to its transcript to a malformed attachment. It did write a good
transcript. Concrete, checkable steps (one folder, list before and after each write, reply with
the path, progress counted from files) are what it follows.
