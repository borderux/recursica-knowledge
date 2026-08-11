# Porting Loki

**Read this before you copy the prompt. A prompt does not carry a data fence — and for this
agent the fence points the unusual way round.**

Every other agent here is fenced to keep it *inside* one client's data. Loki is fenced to keep
what he makes *out* of everybody's. He manufactures fake interview transcripts, and the failure
mode is not a leak: it is a synthetic transcript landing in a real client's folder, being ingested
as research, and turning up months later in a readout somebody presents as true. Nothing in the
prompt prevents that. The service account and the root folder id do.

## What he needs

| | |
|---|---|
| A **sandbox shared drive** of his own | Not a folder in anyone's My Drive. A shared drive cannot be a descendant of a client folder by accident, which a folder can. |
| A **dedicated service account**, member of that drive and of nothing else | Content manager, no Google Cloud roles at all. Loki touches no cloud resource. |
| One instance of the **fenced Drive server** rooted at that drive | `nest/mcp/drive-fence/`. It handles shared drives already. |
| **No database access, of any kind** | See below. |

`nest/GUIDES/LOKI_SANDBOX_SETUP.md` is the step-by-step, including a preflight that proves the
fence in both directions before anything is generated. Run both directions. A sandbox the client
account can reach is not a sandbox, and the check that catches it takes a minute.

### No database server, and not for tidiness

Loki has no BigQuery access because the pipeline he exists to test is the thing that must not
receive his output by any path he controls. Someone downstream chooses to ingest a fake study
deliberately, into a dataset set aside for it. Give Loki a write path into a research dataset and
that decision stops being anybody's.

## What ships, and what does not

| | State |
|---|---|
| `portable/claude-code/agents/loki.md` | **Ships.** The prompt, generated. |
| `agents/loki/runtime/claude-code.json` | **Ships.** Model, and the Drive-only tool list. |
| The fenced Drive server | **Does not ship configured.** The code is in `nest/mcp/drive-fence/`; the credential and the root id are yours. |
| The sandbox drive and its service account | **Yours to create.** Nothing about them is versionable. |
| opencode | **Not a target.** See below. |

## He is 12.6% platform-coupled, and only a third of that matters

Three passages out of 6,556 bytes. **12.55%** measured the way the build cuts — whole blocks —
and about **5.8%** counting only the clauses that genuinely have to change: `handoff` differs by
one clause and `announce` by three words.

The remaining **4.73%** is `fence`, and it is the only difference in this agent worth a paragraph.

On Buzz, the client Drive and BigQuery servers genuinely are absent from Loki's session, so his
prompt states that as a fact: *there is nothing to decline.* That sentence is true of one
installation. Copied into a checkout that has a client's Drive registered — which is the normal
state of an operator's machine — it becomes a false reassurance in the one place a false
reassurance is expensive.

So the portable fragment inverts it. A client server Loki can see is **a broken setup, not an
available tool**: refuse it, say so, and stop until the fence is fixed. Same agent, opposite
posture, because the thing underneath changed.

Everything else ports untouched — the intake and its ranges, the folder shape, the synthetic
banner, the transcript format, the length model, how to make speech sound like people, and what
to plant for analysis to find. That is the agent.

## The Buzz fence is a workaround, and you should know which one

MCP servers register per machine, so by default every agent on that Mac sees every client's Drive
and database. Loki is kept away from them with `CLAUDE_CONFIG_DIR` pointing at an isolated config
directory that registers the sandbox Drive alone. It works, and two obvious alternatives fail
silently — `agent_args` never reaches the CLI, and `CLAUDE_CODE_EXECUTABLE` is overwritten by Buzz
after per-agent config. Both are recorded in the setup guide rather than deleted, because each one
looks like success.

It costs something. An isolated config directory does not read the macOS Keychain, so the
operator's token has to sit in a file that directory owns. Bounded — every agent on the machine
already authenticates with that same token — but a real downgrade, and the operator's call.

The isolated config must also switch off the claude.ai Drive connector. That connector rides on
the account login rather than the MCP registry and is unfenced: it reads and writes anywhere in
the operator's Drive. Leave it on and the whole exercise is defeated by the one server nobody
registered.

**In a plain session the same problem is yours to solve**, and the honest options are the same
two: run Loki from a config that has no client server in it, or accept that the tool list in
`runtime/claude-code.json` is a floor rather than a boundary. Do not let a tools array stand in
for the fence — it holds only until somebody runs him without it.

## Why opencode is not a target

Not a judgement about opencode; nobody has tried it. Loki's one guarantee is where his output can
land, and that guarantee is a per-tool boundary — one Drive server, no database, nothing else.
Shipping an artifact for a surface where that has not been demonstrated would put a synthetic-data
agent in front of somebody with the boundary unproven. Build it the day somebody proves it, and
say in that PR how they proved it.

## Rebuilding

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
```

Edit `agents/loki/SKILL.md` and `agents/loki/platform/*.md`, never the artifacts. The Buzz prompt
is asserted byte-identical to what is committed unless you pass `--accept`; a refactor that
changes the shipped prompt is not a refactor.
