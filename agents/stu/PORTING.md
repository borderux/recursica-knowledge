# Porting Stu

**Read this before copying the prompt. A prompt does not carry a data fence.**

Stu reads one project's BigQuery dataset. The service account and the `allowedDatasets` fence
on the MCP server keep him to that dataset, exactly as they do for Claire. **The prompt enforces
none of it.** If he gets a broad credential because it was easier, he reads every client's data
that credential reaches, with no warning.

## Stu is the inverse of the other three

Alan, Betty and Claire's subagents port because their prompt is nearly all portable knowledge. Stu's is
not: **55–76% of it is platform-coupled**, against 23.5% for Claire and 1.89% for her subagents.

That figure is much less alarming than it sounds. Nearly all of the coupled text is one block,
`launch`, which holds instructions for driving a launcher. Those are instructions for one tool,
not knowledge. The portable version *deletes* most of that block rather than rewriting it. The
Buzz version spends a whole paragraph explaining why the app cannot look up a channel roster, and
off Buzz there is no roster to look up.

Both numbers are given because they count different units. **75.8%** counts whole blocks, the way
the build's marker scheme cuts. **54.5%** counts only the clauses that have to change. Three of
the five split points are long lines where a single phrase is coupled and the rest of the line is
shared. The accurate answer is the range, not whichever end looks better.

Three parts are *not* coupled: what to lead with when handing the app over, the three things Stu
never does, and the tone. Those parts are the agent.

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
package at all**. It reaches BigQuery over REST and signs its own JWT. Node 18+ is the whole
runtime requirement. Exactly one file calls the `buzz` CLI: `server/identity.mjs`, which reads the
channel roster. When the roster is unavailable, that file reports why instead of failing. The web
UI's dependencies, including the Recursica ones, are all public on npm.

```bash
cp -R <this repo>/buzz-agents/agents/stu/app  ~/stu
cd ~/stu && cp stu.env.example stu.env    # fill in slug and project
./start.sh --user-email you@company.com
```

`start.sh` runs on macOS and Linux. `~/.buzz/bin/stu` does not, by design. It installs a launchd
job that shuts down when Buzz Desktop quits. That job suits an agent on a Mac and has no use
anywhere else. `start.command` is a one-line macOS shim over `start.sh`, because Finder opens a
`.command` on double-click and not a `.sh`.

### Identity: the one part that had to change

The app records every edit against a person. It used to accept **only** a 64-character Buzz
pubkey. Outside Buzz, nobody could record an edit at all, and recording edits is what the app
exists for. Reading worked; editing did not.

An identity is now a Buzz pubkey **or** an email address. `server/actor.mjs` is the only place
that decides which values count as an identity, and `bind()` is the only enforcement that counts.
The browser deliberately re-states none of it. A second copy of the rule in a separate bundle
would drift apart from the first.

**The change needs no schema migration.** `users.email` was already `NOT NULL`. The two forms
cannot be confused: an email always contains `@`, and a hex pubkey never does. Both can therefore
sit safely in the `users.pubkey` column with no discriminator beside them.

The alternative was `actor_id` plus `actor_kind`, which names the columns honestly. It was
rejected on cost: it would change eight pubkey-named columns across live client datasets, and the
only gain is better names. Revisit it if a dataset ever needs to hold both kinds at once.

The change has two consequences:

- **One person reached both ways counts as two identities.** Reached through Buzz, the person is a
  pubkey. Reached from a checkout, the person is an email. Nothing merges the two. A dataset is
  normally used one way or the other. If that stops being true, the fix is a deliberate alias
  table, not a looser match in `actor.mjs`.
- **`nest/bin/stu` stays stricter than the app** and still accepts only a pubkey in `--user`. On
  that path a pubkey always exists, because an agent has the sender's. The launcher rejects
  anything else as a mistake instead of recording it in `edit_log`. Its error now points at
  `--user-email` so nobody is stuck.

### Why opencode is not a target

Stu's central rule is that he does not write to the data: a person decides, through the app, and
the change is recorded against them. On Buzz that rule is prose. On Claude Code it is
**enforced**: `runtime/claude-code.json` puts him on the read-only BigQuery server. That setting
is the first to enforce the rule.

opencode's agent model configures access with a coarse `permission` block and has no per-tool
allowlist. It cannot say "read-only BigQuery and nothing else". An opencode Stu would ship the
one guarantee this agent exists to provide with nothing enforcing it. Claire is left off opencode
for the same reason. For Stu, the exclusion is `targets: buzz claude-code` in
`agents/stu/SKILL.md`.

**Do not swap in the read-write server to avoid configuring a second one.** The read-only
server is the reason this artifact exists.

## Where config comes from

On Buzz the operator's launcher already holds the slug and project. In a session Stu can *see*
`stu.env`, and that is a new hazard, not a convenience. He could helpfully supply a value from it,
or from something he saw elsewhere. A project id or slug carried in from elsewhere names a
different client's data. The session prompt therefore tells him never to supply or guess one, and
to name the missing value and stop. The rule is Claire's never-pre-fill-a-config-value, at Stu's
scale.

## Rebuilding

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
node --test 'buzz-agents/agents/stu/app/server/*.test.mjs'
```

Edit `agents/stu/SKILL.md` and `agents/stu/platform/*.md`, never the artifacts. The build asserts
that the Buzz prompt is byte-identical to what is committed, unless it runs with `--accept`. A
refactor that changes the shipped prompt is not a refactor.
