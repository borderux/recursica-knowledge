# Porting Claire

**Read this before you copy the prompt. A prompt does not carry a data fence.**

Claire's isolation — one client per Google service account, read-only and read-write
credentials kept separate, `allowedDatasets` on the BigQuery proxy, an IAM boundary she cannot
cross — is enforced by the service accounts and the MCP servers. **Not one word of it is
enforced by the prompt.** The prompt describes the fence; it does not build one.

So if you lift `portable/claude-code/agents/claire.md` into your own project and wire it to one
broad Google credential because that was easier, you get an agent that will read every client
you have, and nothing will warn you. It will still say "You have no way to reach another
client's data" while doing it, because that sentence is a description of an environment, not a
guard.

The second thing the prompt does not carry is the **separation between the subagents**. Scribe
applies dictionary corrections and cannot write the dictionary; Lexicon proposes dictionary
terms and holds no Drive tools at all. That is not tidiness — it is what stops the agent making
a correction from also manufacturing the evidence justifying it. It is enforced by each
subagent's tool allowlist, and it survives the port only if you rebuild those allowlists.

Claire is not ALAN. ALAN ports because it touches no client data. Claire ports only if you
rebuild both fences first.

## What ships today, and what does not

| | State |
|---|---|
| `portable/claude-code/agents/claire.md` | **Ships.** The orchestrator prompt, generated. |
| `agents/claire/runtime/claude-code.json` | **Ships.** Model, tool allowlist, subagent names. |
| The four subagent definitions | **Does not ship yet.** See below. |
| The two fenced MCP servers | **Does not ship.** You build these; see below. |
| opencode | **Not a target.** See below. |

**This is not a drop-in.** Claire is an orchestrator: on her own she is a prompt with nothing to
dispatch to. Everything in the "does not ship" rows has to exist before she does anything but
fail her own pre-flight check — which, correctly, is what she will do.

### The four subagents

`nest/mcp/templates/agents/{scribe,lexicon,tagger,analyst}.md.tmpl` in this repository. They are
already Claude subagents in shape — `name` / `description` / `tools` front matter, one file each
— and they are the bulk of the pipeline: 54 KB against Claire's 20 KB.

They are not generated into `portable/` yet for one reason: they still say "the `@SLUG@`
research channel" in nine places, and an artifact in `portable/` that talks about channels is
not portable, it is just moved. Giving them the same treatment Claire got here — a `SKILL.md`
core and a small platform fragment — is the next piece of work, not a rename.

They also use a different templating syntax, `@SLUG@` rather than `{{TOKEN}}`, and **that
difference is load-bearing rather than an inconsistency to tidy away.** `{{TOKEN}}` values are
per-community install values that `export-agents.mjs` swaps out bidirectionally, and every value
declared there is treated as a substring to replace across every prompt — so declaring a client
slug as a token would silently rewrite unrelated words wherever that short string appeared.
`@SLUG@` values are per-client deploy values expanded once by a shell script and never swapped
back. Two lifecycles, two syntaxes. Unifying them is the footgun `buzz-agents/placeholders.json`
warns about in its own header.

### The two MCP servers

`bq-<slug>` and `drive-<slug>`, per client, from
`nest/mcp/templates/bq-channel{,-ro}.yaml.tmpl`. Read the comment at the top of that template
before you build your own: `--prebuilt bigquery` **cannot** express `allowedDatasets`, and
setting it anyway is silently ignored and yields an unfenced server.

Note also what Claire's own tool list does *not* contain: no `read_file`, no write tools. She
orchestrates and reports; she never reads a transcript herself. Keep that omission — it is what
protects her context across a 40-transcript run, and it is stated as a rule in the prompt as
well.

### Why opencode is not a target

opencode's documented agent model configures access with a coarse `permission` block — `edit`,
`bash`, and similar classes — and has no per-tool allowlist that can name an individual MCP
tool. So it cannot express "Lexicon has no Drive tools at all", which is precisely the boundary
that makes the pipeline trustworthy.

An opencode Claire would therefore ship the orchestration with none of the ownership
separation, and nothing in the file would say so. That is the same failure as the data fence,
one level down, so the build refuses to produce it: `targets: buzz claude-code` in
`agents/claire/SKILL.md`. Revisit it if opencode gains per-tool permissions.

## Where config comes from

On Buzz, Claire reads her slug, Drive folder id and dataset from the channel canvas. On a plain
session there is no canvas, so she reads `claire.config.md` in the project root:

```markdown
## Claire config
- bq_project: {{BQ_PROJECT}}
- slug:
- drive_folder:
- bq_dataset:
```

**Leave the blanks blank.** The prompt's hardest rule is that Claire may never supply a config
value herself, because a folder id she saw somewhere else belongs to a different client. That
rule is stated identically in both platform fragments, and the file is the only thing that
changes.

`{{BQ_PROJECT}}` is the one token that survives into the artifact, and it is declared in
`buzz-agents/placeholders.json` — the build fails on one that is not.

## What changes between the Buzz version and this one

Only the surface: **14 passages out of 19,727 bytes, 23.5% of the prompt.** Where config comes
from, what the unit of isolation is called, where the two runbooks live, and whether reporting
means posting in a channel or telling the person in the session.

Everything else — the four subagents and their ordering, the never-process-twice rule, the
`conversation_id` derivation, the folder-tree and duplicate-format handling, the chunking rules,
`ingest_runs` being a lower bound, live-vs-retracted tag counts, finishing what you dispatch —
is byte-for-byte the same text from one source.

That figure is worth stating plainly because an earlier estimate here put Claire at 46%
platform-coupled. That number came from counting platform *vocabulary*; this one comes from
measuring the passages actually extracted. The vocabulary metric was roughly twice the truth.

You can see exactly which 14 in `agents/claire/platform/`. Four of them — `config-source`,
`config-carryover`, `preflight-config`, `sheet-account` — carry a safety rule as well as a
surface detail, so the two platform files restate that rule rather than sharing it. They must
be changed together; both files say so at the top.

## Rebuilding

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
```

Edit `agents/claire/SKILL.md` and `agents/claire/platform/*.md`, never the artifacts. The Buzz
prompt is asserted byte-identical to what is committed unless you pass `--accept`; a refactor
that changes the shipped prompt is not a refactor.

One size note: the Buzz prompt is 19,727 bytes against a hard 20,000-character limit on
`buzz agents draft-update`. **This split does not change that number and was not expected to** —
the same text is recomposed. Buying headroom means moving detail out to files Claire reads on
demand, which is separate work.
