# Porting Claire

**Read this before copying the prompt. A prompt does not carry a data fence.**

The service accounts and the MCP servers enforce Claire's isolation: one client per Google
service account, read-only and read-write credentials kept separate, `allowedDatasets` on the
BigQuery proxy, and an IAM boundary she cannot cross. **Not one word of it is enforced by the
prompt.**

Suppose `portable/claude-code/agents/claire.md` is copied into another project and wired to one
broad Google credential because that was easier. It becomes an agent that will read every client
that credential reaches, and nothing will warn anyone. It will still say "Another client's data
is out of reach" while doing it. That sentence describes an environment; it does not guard one.

The second thing the prompt does not carry is the **separation between the subagents**. Scribe
applies dictionary corrections and cannot write the dictionary; Lexicon proposes dictionary
terms and holds no Drive tools at all. That split stops the agent making a correction from also
manufacturing the evidence justifying it. Each subagent's tool allowlist enforces it, and it
survives the port only if those allowlists are rebuilt.

Alan and Betty port because they touch no client data. Claire ports only if both fences are
rebuilt first.

## What ships today, and what does not

| | State |
|---|---|
| `portable/claude-code/agents/claire.md` | **Ships.** The orchestrator prompt, generated. |
| `portable/claude-code/agents/{scribe,lexicon,tagger,analyst}.md` | **Ships.** The four subagents, generated. |
| `agents/claire/runtime/claude-code.json` | **Ships.** Model, tool allowlist, subagent names. |
| The two fenced MCP servers | **Does not ship.** Build these; see below. |
| opencode | **Not a target.** See below. |

**Claire is still not a drop-in**, because the row that does not ship is the one that matters.
All five prompts are here, but the two fenced MCP servers they name are not. Until those servers
exist, Claire fails her own pre-flight check, which is the correct result.

### The four subagents

Put `claire.md` and the four subagents in `.claude/agents/`, and replace `@SLUG@` with the
client's slug in all five. The names have to match. The file's `name:` and her `subagents` list
must resolve to the same string, because Claire dispatches `scribe-@SLUG@`.

**Do not widen their `tools:` line.** Scribe has no write access to `project_dictionary`, and
Lexicon holds no Drive tools at all. The allowlist in each file's front matter enforces that
separation, and nothing else does. The prose explains the rule; the allowlist is the rule.

Analyst is the only one bound to the **read-only** BigQuery server (`bq-@SLUG@-ro`). Keep that
binding. Analyst writes findings and a Drive document, and has no reason to write transcript rows.

The subagents use `@SLUG@` rather than `{{TOKEN}}`, and **that difference is deliberate; do not
tidy it away.** `{{TOKEN}}` values are per-community install values that `export-agents.mjs`
swaps in both directions. Every value declared there is replaced as a substring across every
prompt. Declaring a client slug as a token would therefore silently rewrite unrelated words
wherever that short string appeared. `@SLUG@` values are per-client deploy values expanded once
by a shell script and never swapped back. The two lifecycles need two syntaxes. Unifying them is the mistake `buzz-agents/placeholders.json`
warns about in its own header.

### The two MCP servers

Build `bq-<slug>` and `drive-<slug>` for each client from
`nest/mcp/templates/bq-channel{,-ro}.yaml.tmpl`. Read the comment at the top of that template
before building one: `--prebuilt bigquery` **cannot** express `allowedDatasets`. Setting it
anyway is silently ignored and yields an unfenced server.

Claire's own tool list does *not* contain `read_file` or any write tools. She orchestrates and
reports; she never reads a transcript herself. Keep those tools out. Their absence protects her
context across a 40-transcript run, and the prompt states it as a rule as well.

### Why opencode is not a target

opencode's documented agent model configures access with a coarse `permission` block of
classes such as `edit` and `bash`. It has no per-tool allowlist that can name an individual MCP
tool. It therefore cannot express "Lexicon has no Drive tools at all", which is precisely the
boundary that makes the pipeline trustworthy.

An opencode Claire would ship the orchestration with none of the ownership separation, and
nothing in the file would say so. That is the same failure as the missing data fence, one level
down. The build refuses to produce it: `agents/claire/SKILL.md` sets `targets: buzz claude-code`. Revisit it if opencode gains per-tool permissions.

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
value herself, because a folder id she saw somewhere else belongs to a different client. Both
platform fragments state that rule identically. Only the place the config is read from changes.

`{{BQ_PROJECT}}` is the one token that survives into the artifact, and it is declared in
`buzz-agents/placeholders.json` — the build fails on one that is not.

## What changes between the Buzz version and this one

Only the surface changes: **14 passages out of 19,727 bytes, 23.5% of the prompt.** They cover
where config comes from, what the unit of isolation is called, where the two runbooks live, and
whether reporting means posting in a channel or telling the person in the session.

Everything else — the four subagents and their ordering, the never-process-twice rule, the
`conversation_id` derivation, the folder-tree and duplicate-format handling, the chunking rules,
`ingest_runs` being a lower bound, live-vs-retracted tag counts, finishing every dispatch —
is byte-for-byte the same text from one source.

An earlier estimate here put Claire at 46% platform-coupled. That number came from counting
platform *vocabulary*; this one comes from measuring the passages extracted. The vocabulary
metric was roughly double the measured figure.

The 14 passages are in `agents/claire/platform/`. Four of them — `config-source`,
`config-carryover`, `preflight-config`, `sheet-account` — carry a safety rule as well as a
surface detail. The two platform files therefore each restate that rule rather than share it.
Both copies must be changed together; both files say so at the top.

**The four subagents are barely coupled at all: 9 passages out of 53,828 bytes, 1.89%.** Every
one of them is the single word "channel" in an otherwise portable line — Scribe and Lexicon have
one each, Analyst three, Tagger four. Nothing about the SQL, the chunk loop, the tag rules, the
ownership boundaries or the tool allowlists changes between a Buzz install and a plain session.

These figures correct the impression left by "54 KB of channel". The volume is 54 KB; the
coupling is a kilobyte of it. Most of this pipeline was portable before the split, and nobody
had measured it. That was the third time on this piece of work that an eyeballed estimate came
in well above what the extraction produced.

## Rebuilding

```bash
npm run agents:build:check   # report drift, write nothing
npm run agents:build         # write
```

Edit `agents/claire/SKILL.md` and `agents/claire/platform/*.md`, never the artifacts. The Buzz
prompt is asserted byte-identical to what is committed unless `--accept` is passed; a refactor
that changes the shipped prompt is not a refactor.

The Buzz prompt is 17,187 bytes, under the hard 20,000-character limit on
`buzz agents draft-update`. **The platform split did not change its size**, because the build
recomposes the same text. If the prompt nears the limit, move detail out to files Claire reads on
demand.
