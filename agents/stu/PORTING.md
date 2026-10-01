# Porting Stu

**Read this before copying the prompt. A prompt does not carry a data fence.**

Stu reads one project's BigQuery dataset. That isolation is the service account and the
`allowedDatasets` fence on the MCP server, exactly as it is for Claire — **not one word of it is
enforced by the prompt.** Give him a broad credential because it was easier and he will read
every client's data that credential reaches, with no warning.

## Stu is the inverse of the other three

Alan, Betty and Claire's subagents port because their prompt is nearly all portable knowledge. Stu's is
not: **55–76% of it is platform-coupled**, against 23.5% for Claire and 1.89% for her subagents.

That figure is much less alarming than it sounds. Nearly all of it is one block — `launch` —
which is instructions for driving a launcher. Those are instructions for one tool, not
knowledge. Most of it is *deleted* in the portable version rather than rewritten: the Buzz
version spends a whole paragraph explaining why the app cannot look up a channel roster, and off
Buzz there is no roster to look up.

Both numbers are given because the granularity matters. **75.8%** is measured the way the build's
marker scheme cuts — whole blocks. **54.5%** counts only the clauses that have
to change; three of the five split points are long lines where a single phrase is coupled and the
rest is shared. The accurate answer is the range, not whichever end looks better.

What is *not* coupled: what to lead with when handing the app over, the three things Stu never
does, and the tone. Those are the agent.

## What ships, and what does not

| | State |
|---|---|
| `portable/claude-code/agents/stu.md` | **Ships.** The prompt, generated. |
| `agents/stu/runtime/claude-code.json` | **Ships.** Model and — the point of the file — the tool allowlist. |
| `buzz-agents/agents/stu/app/` | **Ships, as source.** The app itself. It is not on npm; copy the directory. |
| The fenced BigQuery MCP server | **Does not ship.** The operator builds it; see Claire's PORTING.md. |
| opencode | **Not a target.** See below. |

### The app

The app was already the portable half and nobody had measured it either. The server **imports no
package at all** — it reaches BigQuery over REST and signs its own JWT — so Node 18+ is the whole
runtime requirement. Exactly one thing in it calls the `buzz` CLI (`server/identity.mjs`), for the
channel roster, and that path already reports why it is unavailable rather than failing. The web
UI's dependencies, including the Recursica ones, are all public on npm.

```bash
cp -R <this repo>/buzz-agents/agents/stu/app  ~/stu
cd ~/stu && cp stu.env.example stu.env    # fill in slug and project
./start.sh --user-email you@company.com
```

`start.sh` runs on macOS and Linux. `~/.buzz/bin/stu` does not and is not meant to: it installs a
launchd job that shuts down when Buzz Desktop quits, which is right for an agent on a Mac and
meaningless anywhere else. `start.command` is a one-line macOS shim over `start.sh`, because
Finder will double-click a `.command` and not a `.sh`.

### Identity: the one part that had to change

The app records every edit against a person. It used to accept **only** a 64-character Buzz
pubkey — so outside Buzz nobody could record an edit at all, and recording an edit is what the
app exists for. Reading worked; editing did not.

An identity is now a Buzz pubkey **or** an email address. `server/actor.mjs` is the only place
that decides, `bind()` is the only enforcement that counts, and the browser deliberately re-states
none of it — a second copy of the rule in a separate bundle is how the two drift apart.

**No schema migration.** `users.email` was already `NOT NULL`, and the two shapes cannot be
confused, since an email always contains `@` and a hex pubkey never does. That is what makes it
safe for both to sit in the `users.pubkey` column with no discriminator beside them.

The alternative — `actor_id` plus `actor_kind`, honestly named — was rejected on cost: eight
pubkey-named columns across live client datasets, for naming. Revisit it if a dataset ever needs
to hold both kinds at once.

Two consequences to know in advance:

- **The same human, both ways, is two identities.** Reached through Buzz they are a pubkey;
  reached from a checkout they are an email, and nothing merges the two. A dataset is normally
  used one way or the other. If that stops being true the fix is a deliberate alias table, not a
  looser match in `actor.mjs`.
- **`nest/bin/stu` stays stricter than the app** and still refuses anything but a pubkey in
  `--user`. On that path a pubkey always exists — an agent has the sender's — so anything else is
  a mistake worth catching at the launcher rather than recording in `edit_log`. Its error now
  points at `--user-email` so nobody is stuck.

### Why opencode is not a target

Stu's central rule is that he does not write to the data: a person decides, through the app, and
the change is recorded against them. On Buzz that rule is prose. On Claude Code it is
**enforced** — `runtime/claude-code.json` puts him on the read-only BigQuery server, so for the
first time a setting enforces the rule.

opencode's agent model configures access with a coarse `permission` block and has no per-tool
allowlist, so it cannot say "read-only BigQuery and nothing else". An opencode Stu would ship the
one guarantee this agent exists to provide with nothing enforcing it. Same call as Claire, same
reason: `targets: buzz claude-code` in `agents/stu/SKILL.md`.

**So do not swap the read-write server in to save configuring a second one.** The read-only
server is the reason this artifact exists.

## Where config comes from

On Buzz the operator's launcher already holds the slug and project. In a session Stu can *see*
`stu.env`, which is a new hazard rather than a convenience: he could helpfully supply a value from
it, or from something he saw elsewhere, and a project id or slug carried in from elsewhere names a
different client's data. So the session prompt tells him never to supply or guess one, and to name
the missing value and stop. Same rule as Claire's never-pre-fill-a-config-value, at Stu's scale.

## Rebuilding

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
node --test 'buzz-agents/agents/stu/app/server/*.test.mjs'
```

Edit `agents/stu/SKILL.md` and `agents/stu/platform/*.md`, never the artifacts. The Buzz prompt is
asserted byte-identical to what is committed unless the build runs with `--accept`; a refactor that changes
the shipped prompt is not a refactor.
