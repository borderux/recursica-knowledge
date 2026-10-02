# Porting Loki

**Read this before copying the prompt. A prompt does not carry a data fence — and this agent's
fence protects in the opposite direction from every other agent's.**

Every other agent here is fenced to keep it *inside* one client's data. Loki is fenced to keep
what he makes *out* of everybody's. He manufactures fake interview transcripts. The failure to
prevent is not a leak. It is a synthetic transcript that lands in a real client's folder, is
ingested as research, and turns up months later in a readout somebody presents as true. Nothing in the
prompt prevents that. The service account and the root folder id do.

## What he needs

| | |
|---|---|
| A **sandbox shared drive** of his own | Not a folder in anyone's My Drive. A shared drive cannot be a descendant of a client folder by accident, which a folder can. |
| A **dedicated service account**, member of that drive and of nothing else | Content manager, no Google Cloud roles at all. Loki touches no cloud resource. |
| One instance of the **fenced Drive server** rooted at that drive | `nest/mcp/drive-fence/`. It handles shared drives already. |
| **No database access, of any kind** | See below. |

`nest/GUIDES/LOKI_SANDBOX_SETUP.md` gives the setup steps, including a preflight that proves the
fence in both directions before anything is generated. Run the preflight in both directions. A
sandbox the client account can reach is not a sandbox. The check that catches it takes a minute.

### No database server, and not for tidiness

Loki has no BigQuery access because the pipeline he exists to test must not
receive his output by any path he controls. Someone downstream chooses to ingest a fake study
deliberately, into a dataset set aside for it. If Loki gets a write path into a research
dataset, nobody makes that decision.

## What ships, and what does not

| | State |
|---|---|
| `portable/claude-code/agents/loki.md` | **Ships.** The prompt, generated. |
| `agents/loki/runtime/claude-code.json` | **Ships.** Model, and the Drive-only tool list. |
| The fenced Drive server | **Does not ship configured.** The code is in `nest/mcp/drive-fence/`; the operator supplies the credential and the root id. |
| The sandbox drive and its service account | **The operator creates them.** Nothing about them is versionable. |
| opencode | **Not a target.** See below. |

## He is 12.6% platform-coupled, and only a third of that matters

Three passages, out of 6,556 bytes, are coupled. Counted in whole blocks, the way the build
cuts, the coupling is **12.55%**. Counting only the clauses that have to change, it is about
**5.8%**: `handoff` differs by one clause and `announce` by three words.

The remaining **4.73%** is `fence`. It is the only difference in this agent that needs a
paragraph of explanation.

On Buzz, the client Drive and BigQuery servers are absent from Loki's session. His prompt states
that as a fact: *there is nothing to decline.* That sentence is true of one installation. An
operator's machine normally has a client's Drive registered. Copied into that checkout, the
sentence tells Loki there is nothing to decline while a real client's folder is in reach.

The portable fragment therefore inverts the sentence. A client server Loki can see is **a broken
setup, not an available tool**: refuse it, say so, and stop until the fence is fixed. The agent
is the same. Its stance is the opposite because the configuration underneath changed.

Everything else ports untouched — the intake and its ranges, the folder shape, the synthetic
banner, the transcript format, the length model, how to make speech sound like people, and what
to plant for analysis to find. That is the agent.

## The Buzz fence is a workaround, and which one

MCP servers register per machine. By default, every agent on the Mac sees every client's Drive
and database. Loki is kept away from them with `CLAUDE_CONFIG_DIR` pointing at an isolated config
directory that registers the sandbox Drive alone. That works. Two obvious alternatives fail
silently: `agent_args` never reaches the CLI, and Buzz overwrites `CLAUDE_CODE_EXECUTABLE`
after per-agent config. Both are recorded in the setup guide rather than deleted, because each one
looks like success.

The isolation has one cost: the operator's token leaves the Keychain. An isolated config
directory does not read the macOS Keychain. The token has to sit in a file that directory owns.
The risk is bounded, because every agent on the machine already authenticates with that same
token. It is still a real downgrade, and the operator decides whether to accept it.

The isolated config must also switch off the claude.ai Drive connector. That connector uses
the account login rather than the MCP registry and is unfenced: it reads and writes anywhere in
the operator's Drive. If it stays on, the one server nobody registered defeats the whole fence.

**In a plain session the operator has to solve the same problem.** The honest options are the same
two: run Loki from a config that has no client server in it, or accept that the tool list in
`runtime/claude-code.json` is a floor rather than a boundary. Do not let a tools array stand in
for the fence. A tools array holds only until somebody runs him without it.

## Why opencode is not a target

This is not a judgment about opencode. Nobody has tried it. Loki's one guarantee is where his
output can land. That guarantee is a per-tool boundary: one Drive server, no database, nothing
else. An artifact for an untested surface would hand somebody a synthetic-data agent whose
boundary is unproven. Build the opencode artifact the day somebody proves the boundary holds
there, and say in that PR how they proved it.

## Rebuilding

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
```

Edit `agents/loki/SKILL.md` and `agents/loki/platform/*.md`, never the artifacts. The build asserts
that the Buzz prompt is byte-identical to what is committed, unless it runs with `--accept`. A
refactor that changes the shipped prompt is not a refactor.
