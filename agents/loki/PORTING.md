# Porting Loki

**Read this before copying the prompt. A prompt does not carry a data fence — and this agent's
fence protects in the opposite direction from every other agent's.**

Every other agent here is fenced to keep it _inside_ one client's data. Loki is fenced to keep
what he makes _out_ of everybody's. He manufactures fake interview transcripts. The failure to
prevent is not a leak. It is a synthetic transcript that lands in a real client's folder, is
ingested as research, and turns up months later in a readout somebody presents as true. The
prompt asks him not to let that happen. Only the configuration can stop it.

## Where he runs

**CircleChat is Loki's only target.** The prompt is
`portable/circlechat/agents/loki/SOUL.md`, built from `SKILL.md` and `platform/circlechat.md`,
and installed by `circlechat/setup-agent.sh loki`. `runtime/hermes.md` has his settings there.

On CircleChat the fence is simple, because he holds nothing: no Drive, no database, no tool
server. His reply is the transcript, and CircleChat saves a long reply as a file on the message
or the task. `setup-agent.sh` refuses to set him up if his `config.yaml` has any `mcp_servers`,
since a server that reaches client data is the one thing that would break that.

## What he must never have

**No database access, of any kind, and not for tidiness.** The pipeline he exists to test must
not receive his output by any path he controls. Someone downstream chooses to ingest a fake
study deliberately, into a dataset set aside for it. If Loki gets a write path into a research
dataset, nobody makes that decision.

**No client folder or client Drive.** A client server he can see is a broken setup, not an
available tool. The prompt tells him to refuse it and report it.

## The banner, and why the name is not enough

Every transcript opens with a two-line synthetic banner. A file name or a folder name does not
survive a copy into somewhere else; text inside the transcript does. The banner is the last line
of defense against fake research being read as real. Do not edit it out to make a demo look
tidier.

## What changed when Buzz retired

Loki was written for Buzz, where he wrote a study plan, one transcript per participant and an
answer key as Google Docs into a sandbox shared drive. Now he makes exactly what a request asks
for, and writes it as his reply. The Buzz prompt, his Buzz settings, `nest/bin/deploy-loki.sh`
and the Loki sandbox guide are gone. Their reasons still apply to any surface that gives him a
store to write into, so they are kept here.

### If a new surface gives him a store

Anywhere Loki can write files, the fence is a store of his own that no client account can reach,
and that reaches no client:

| | |
|---|---|
| **A sandbox shared drive** of his own | Not a folder in anyone's My Drive. A shared drive cannot become a descendant of a client folder by accident. A folder can, by anyone with Drive access dragging it. |
| **A dedicated service account**, member of that drive and of nothing else | Content manager, not Manager. No Google Cloud roles at all: Loki touches no cloud resource. |
| **One fenced Drive server** rooted at that drive | `nest/mcp/drive-fence/`, which handles shared drives already. |
| **No database server** | See above. |

**Prove the fence in both directions before generating anything.** Three of the four checks
pass by failing:

| Key | Folder | Must |
|---|---|---|
| Loki's | Loki's drive | succeed |
| Loki's | each client folder | fail — a success means his account was shared onto a client folder |
| each client's | Loki's drive | fail — a success means his drive sits inside a client folder |

`nest/mcp/drive-fence/preflight.mjs` answers each check: exit 0 means the key reached the folder.

**Make the client servers absent, not merely forbidden.** A tools allowlist keeps Loki off a
client's Drive only while no client server is registered in the same config; it is a floor, not a
boundary. On Claude Code the setup that worked was an isolated config directory
(`CLAUDE_CONFIG_DIR`) holding the sandbox server alone, with `disableClaudeAiConnectors: true`:
the claude.ai Google Drive connector rides on the account login rather than the MCP registry, and
it reads and writes anywhere in the operator's Drive. Verify the isolation from the running
process, never by asking the agent: a model will describe a fence it does not have.

## Why no other target

This is not a judgment about Claude Code, opencode or Buzz. Loki's one guarantee is where his
output can land, and on CircleChat that guarantee is proven and checked by `setup-agent.sh`.
Nobody runs him anywhere else today, and an artifact for a surface whose boundary nobody has
proven would hand somebody a synthetic-data agent with an unproven boundary. Add the target the
day somebody proves the boundary holds there, and say in that PR how they proved it.

## Rebuilding

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
```

Edit `agents/loki/SKILL.md` and `agents/loki/platform/circlechat.md`, never the artifact.
