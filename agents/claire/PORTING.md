# Porting Claire

**Read this before copying the prompt. A prompt does not carry a data fence.**

Claire's isolation — one client per Google service account, read-only and read-write
credentials kept separate, `allowedDatasets` on the BigQuery proxy, an IAM boundary she cannot
cross — is enforced by the service accounts and the MCP servers. **Not one word of it is
enforced by the prompt.** The prompt describes the fence; it does not build one.

So `portable/claude-code/agents/claire.md`, lifted into another project and wired to one broad
Google credential because that was easier, becomes an agent that will read every client that
credential reaches, and nothing will warn anyone. It will still say "Another client's data is out
of reach" while doing it, because that sentence is a description of an environment, not a
guard.

The second thing the prompt does not carry is the **separation between the subagents**. Scribe
applies dictionary corrections and cannot write the dictionary; Lexicon proposes dictionary
terms and holds no Drive tools at all. That is not tidiness — it is what stops the agent making
a correction from also manufacturing the evidence justifying it. It is enforced by each
subagent's tool allowlist, and it survives the port only if those allowlists are rebuilt.

Claire is not Alan or Betty. They port because they touch no client data. Claire ports only if
both fences are rebuilt first.

## What ships today, and what does not

| | State |
|---|---|
| `portable/claude-code/agents/claire.md` | **Ships.** The orchestrator prompt, generated. |
| `portable/claude-code/agents/{scribe,lexicon,tagger,analyst}.md` | **Ships.** The four subagents, generated. |
| `agents/claire/runtime/claude-code.json` | **Ships.** Model, tool allowlist, subagent names. |
| The two fenced MCP servers | **Does not ship.** Build these; see below. |
| opencode | **Not a target.** See below. |

**It is still not a drop-in**, because the row that does not ship is the one that matters. All
five prompts are here; the two fenced MCP servers they name are not, and until those exist
Claire fails her own pre-flight check — which, correctly, is what she should do.

### The four subagents

Five files, one substitution. Put `claire.md` and the four subagents in `.claude/agents/`, and
replace `@SLUG@` with the client's slug in all five. The names have to match: Claire dispatches
`scribe-@SLUG@`, so the file's `name:` and her `subagents` list must resolve to the same string.

**Their `tools:` line is the whole point, so do not widen it.** Scribe applies dictionary
corrections and has no write access to `project_dictionary`; Lexicon proposes dictionary terms
and holds no Drive tools at all. That is what stops the agent making a correction from also
manufacturing the evidence that justifies it. It is enforced by the allowlist in each file's
front matter and by nothing else — the prose explains the rule, the allowlist is the rule.

Analyst is the only one bound to the **read-only** BigQuery server (`bq-@SLUG@-ro`). Keep that.
It writes findings and a Drive document, and it has no business writing transcript rows.

They use `@SLUG@` rather than `{{TOKEN}}`, and **that difference matters; it is not an
inconsistency to tidy away.** `{{TOKEN}}` values are
per-community install values that `export-agents.mjs` swaps out bidirectionally, and every value
declared there is treated as a substring to replace across every prompt — so declaring a client
slug as a token would silently rewrite unrelated words wherever that short string appeared.
`@SLUG@` values are per-client deploy values expanded once by a shell script and never swapped
back. Two lifecycles, two syntaxes. Unifying them is the mistake `buzz-agents/placeholders.json`
warns about in its own header.

### The two MCP servers

`bq-<slug>` and `drive-<slug>`, per client, from
`nest/mcp/templates/bq-channel{,-ro}.yaml.tmpl`. Read the comment at the top of that template
before building one: `--prebuilt bigquery` **cannot** express `allowedDatasets`, and
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
`ingest_runs` being a lower bound, live-vs-retracted tag counts, finishing every dispatch —
is byte-for-byte the same text from one source.

An earlier estimate here put Claire at 46% platform-coupled, so this figure matters. That
number came from counting platform *vocabulary*; this one comes from measuring the passages
extracted. The vocabulary metric was roughly twice the truth.

The 14 are in `agents/claire/platform/`. Four of them — `config-source`,
`config-carryover`, `preflight-config`, `sheet-account` — carry a safety rule as well as a
surface detail, so the two platform files restate that rule rather than sharing it. They must
be changed together; both files say so at the top.

**The four subagents are barely coupled at all: 9 passages out of 53,828 bytes, 1.89%.** Every
one of them is the single word "channel" in an otherwise portable line — Scribe and Lexicon have
one each, Analyst three, Tagger four. Nothing about the SQL, the chunk loop, the tag rules, the
ownership boundaries or the tool allowlists changes between a Buzz install and a plain session.

This corrects the impression left by "54 KB of channel". The volume is 54 KB; the coupling is
a kilobyte of it. The bulk of this pipeline was portable already and nobody had measured it —
the third time on this piece of work that an eyeballed estimate came in well above what the
extraction produced.

## Rebuilding

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
```

Edit `agents/claire/SKILL.md` and `agents/claire/platform/*.md`, never the artifacts. The Buzz
prompt is asserted byte-identical to what is committed unless `--accept` is passed; a refactor
that changes the shipped prompt is not a refactor.

One size note: the Buzz prompt is 19,727 bytes against a hard 20,000-character limit on
`buzz agents draft-update`. **This split does not change that number and was not expected to** —
the same text is recomposed. Buying headroom means moving detail out to files Claire reads on
demand, which is separate work.
