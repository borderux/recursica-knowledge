# Loki on Hermes (CircleChat)

The prompt is `portable/circlechat/agents/loki/SOUL.md`, built from `SKILL.md` and
`platform/circlechat.md`, and installed by `circlechat/setup-agent.sh loki`. This file is the
configuration that has no business inside a prompt. Loki runs on a local model, which is where
every setting below came from.

## Fence

On CircleChat Loki has no Drive and no tool servers, and needs none: his reply is the transcript.
`setup-agent.sh` refuses him if his `config.yaml` has any `mcp_servers`, since a server that
reaches client data would break the fence.

## How he reads a request

The rules for reading a request are in CircleChat's prompt for every agent, on every runtime, not
in Loki's persona: the person's newest comment on a task is the request, and the task's title is
only a label; a request that names what to make is clear; and an agent asks once, then waits for
a person's answer. They are `REQUEST_RULES` in the CircleChat fork's `api/hermes-multi-bridge.mjs`
(borderux/recursica-circlechat#24), which the bridge adds after each task's request for every
agent it runs, Hermes and OpenClaw alike. A file that `setup-agent.sh` installed would reach only
the agents the kit sets up on Hermes. Loki's persona asks only when something is truly open, and
`scripts/build-agents.test.mjs` checks that it never contradicts those rules.
`circlechat/check-agent.sh loki` checks how he behaves on a running stack.

## Delivery: the reply, not a file

Set Loki's CircleChat agent to **deliverables-only**. With that setting, CircleChat turns any reply
over 600 characters into a file named `reply.md`: attached to the message in a chat, or saved on
the task when he replies on one. The message keeps the reply's first paragraph, which for Loki is
the synthetic banner and the title line. So a transcript reaches the task as a file without Loki
calling a tool or writing an action. Without the setting, a reply up to 2,000 characters in chat
(6,000 on a task) stays a message, and anything longer still becomes `reply.md`.

`setup-host.sh` and `setup-agent.sh` still make `/workspace/loki`. Nothing in the persona uses it
now; it is harmless, and left for an operator who wants a scratch folder.

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

On a small local model Loki split one study across two folders, marked a two-interview study done
after one, and lost the link to a transcript to a malformed attachment. He did write a good
transcript.

On gpt-oss, a numbered procedure (write the file with `write_file`, check it with `ls -l` or
`read_file`, attach it with a `share_to_task` action) failed too. He said four files were "created
and attached to the task" without calling a tool, printed a raw tool call as his chat reply, wrote
`write_file` and `read_file` as entries in his actions block, called a `run_code` tool that does
not exist, and never wrote a file.

So the persona asks for nothing he can get wrong that way. He writes the transcript as his reply,
one per turn, and CircleChat's deliverables-only setting makes it a file. Writing text is the one
thing every one of those runs did well.
