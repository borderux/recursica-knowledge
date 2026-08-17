---
name: deploy-agents
description: Set up Claire, Stu, Janice and ALAN on this Mac when someone asks you to deploy, install, or set up the agents — or asks for help joining a client, fixing a half-finished install, or updating an existing one. Walks the operator through supplying their values, installs the nest, opens the agent drafts for approval, and proves the client-data fence before any data moves. Use this instead of reading INSTALL.md aloud.
---

# Deploy the agents onto this Mac

Someone has asked you to set up the agents. You are doing this **on the machine you are
running on**, for the person you are talking to. You cannot install anything on anybody
else's Mac — if the person asking is not the owner of this machine, say so and stop.

## What you are actually installing

| Half | What | Result if missing |
|---|---|---|
| **The nest** — `nest/` → `~/.buzz/` | Scripts, fenced MCP servers, guides, `settings.json` | Agents start, then find no tools |
| **The agents** — `buzz-agents/` → Buzz Desktop | Prompts and settings for Claire, Stu, Janice, ALAN | Nothing to talk to |

Both, in that order. An agent created before the nest exists is a name with nothing behind it.

## Before you touch anything: which case is this?

Ask, and do not guess — the answer changes half the steps:

1. **Joining a client that already exists.** Someone else already created the dataset,
   the service account and the Drive folder. Most common. You need their values, not
   `gcloud`. You still run every step, Step 5 included — the cloud side is done, the
   *machine* side has not been done on this Mac.
2. **Creating a new client from scratch.** Needs Google Cloud work and `gcloud`.
3. **Repairing or updating an existing install.** A nest already exists here. The agents
   exist too, so Step 4 is the wrong tool — see *Updating agents that already exist*.

Check which by looking, before you ask twice:

```bash
ls ~/.buzz/bin/toolbox ~/.buzz/.claude/settings.json 2>/dev/null
ls ~/.buzz/.secrets/ 2>/dev/null
```

## Step 1 — Find the checkout

The scripts live in a clone of `borderux/recursica-knowledge`. Find it rather than
assuming a path:

```bash
ls ~/.buzz/REPOS/ 2>/dev/null
```

No clone yet — the normal case on a clean Buzz install. Clone it yourself; do not ask them
to do it in a terminal:

```bash
git clone https://github.com/borderux/recursica-knowledge.git ~/.buzz/REPOS/recursica-knowledge
```

`main` is correct — do not check out a branch. Everything below runs from that directory.

## Step 2 — Collect their values

Ask for all of them in **one** message, not one question at a time. Ten round trips to
fill in a form is a worse experience than the README this skill replaces.

What to ask for, and be precise that most of these are **not** secrets — they are
identifiers, and they are the same for everyone in the community:

- `BQ_PROJECT` — the Google Cloud project id
- `DRIVE_FOLDER` — the client's Drive folder id
- `TAG_SHEET_ID` — the shared tag dictionary sheet id
- `CLAIRE_CHANNEL`, `STU_CHANNEL`, `IVAN_CHANNEL`, `ALAN_CHANNEL`, `JANICE_CHANNEL` — channel UUIDs
- `JANICE_PUBKEY` — this community's Janice, hex
- `BUILDER_REPO`, `BUILDER_REPO_NAME`, `KNOWLEDGE_REPO_NAME` — only if they want ALAN
- **their name**, for the agent display names — see below. Ask for the form they want
  shown, not their account id

`buzz-agents/placeholders.json` says where each one is found; quote from it rather than
inventing instructions. Leave `TRANSCRIPT_DIR` blank — bootstrap derives it.

### The canvas of the channel you were asked in is the source of these values

**This is the normal path — start here, not with questions.** Deployment is meant to be run
*in the channel the agents are being deployed to*, and that channel's canvas holds the
configuration. So the channel you were @mentioned in is almost always the deployment
channel, and you can read most of the list above straight out of it:

```bash
buzz canvas get --channel <uuid>          # the channel you are talking in
```

A `## Claire config` block gives you `slug`, `drive_folder`, `dataset` and the project — the
same block Claire reads at runtime, so it is the authoritative copy rather than a
transcription of it. Take `BQ_PROJECT` and the slug from there.

Only ask for what the canvas genuinely does not carry, and say which values those are and
that you looked. If the canvas has no `## Claire config` block at all, confirm you are in
the right channel before falling back to asking for everything.

#### Canvas keys → values

| Canvas key | Becomes | Notes |
|---|---|---|
| `slug` | *not a token* — a `--slug` argument | Lowercase, hyphens. Names the dataset, the key file, the MCP servers |
| `sa_slug` | *not a token* — a `--sa-slug` argument | Optional. The service account's name when it is not the slug. Lowercase, hyphens |
| `bq_project` | `BQ_PROJECT` | |
| `bq_dataset` | *nothing* | Confirmation only. It must equal `research_<slug>` with hyphens as underscores |
| `drive_folder` | `DRIVE_FOLDER` | |
| `tag_sheet` | `TAG_SHEET_ID` | |
| `claire_channel`, `stu_channel`, `alan_channel`, `janice_channel` | the four `*_CHANNEL` tokens | Janice's routing table, **not** the channel you are installing in |
| `builder_repo` | `BUILDER_REPO`, and `BUILDER_REPO_NAME` = the part after the slash | ALAN only |
| `knowledge_repo` | `KNOWLEDGE_REPO_NAME` | ALAN only |

Those four routing UUIDs are a common trap: they are where Janice files findings, and none of
them is the channel this install is running in. Do not point `--channel` at a `building-*`
channel because a canvas key named it.

`bq_dataset` is a cross-check rather than an input. If it disagrees with `research_<slug>`,
stop and ask which is right instead of picking one — the wrong dataset name is a fence that
fails open.

`sa_slug` exists because **a Google service account cannot be renamed.** An account created
before the slug settled keeps its original name for the life of the client, so a channel on
slug `acme` can legitimately be served by `claire-acme-health-service-user`. Set `sa_slug` to
the account's own name and leave `slug` alone; the key then lives at
`~/.buzz/.secrets/claire-<sa_slug>-service-user.json` and `bin/stu` takes `--sa-slug`.

Only add it when the two genuinely differ — omitted, everything derives from `slug`, which is
the normal case. Do not "fix" a mismatch by renaming the account in the console: you cannot,
and creating a replacement means re-granting the dataset and re-sharing the Drive folder.

**If a value is missing from the canvas, the fix is to add it to the canvas** — not to
collect it in chat and move on. The next operator hits the identical gap otherwise.
`TAG_SHEET_ID` is the one most often absent and it is not derivable; ask the owner for it,
then **write it back**. Show them the block before you set it: `buzz canvas set` replaces the
whole document, so it has to carry what was already there.

```markdown
## Claire config

- slug: acme
- bq_project: acme-research-123456
- bq_dataset: research_acme
- drive_folder: 1AbCdEfGhIjKlMnOpQrStUvWxYz_
- tag_sheet: 1AbCdEfGhIjKlMnOpQrStUvWxYz0123456789

## Janice routing

- claire_channel: 00000000-0000-0000-0000-000000000000
- stu_channel: 00000000-0000-0000-0000-000000000000
- alan_channel: 00000000-0000-0000-0000-000000000000
- janice_channel: 00000000-0000-0000-0000-000000000000

## ALAN — omit this section if the community has no ALAN

- builder_repo: acme/design-sandbox
- knowledge_repo: recursica-knowledge
```

A canvas is channel-visible, so it holds identifiers only. Never put the service-account key
on it — and it needs no key path either, because the account's address is derivable from
`slug` and `bq_project` alone.

### You can only see channels you are a member of

`buzz channels list` shows **open** channels plus the **private** ones your own identity
belongs to. A private channel you are not in is not listed, not searchable, and its UUID is
not resolvable from its name. There is no error — it is simply absent, which reads like a
typo or a deleted channel.

So if they name a channel you cannot find, do not conclude it does not exist. Say this
instead, because it is almost always the real cause:

> I cannot see `#<name>`. Private channels are invisible to agents that are not members —
> add **me** (your own Fizz, not the owner's) to it, then send me the UUID.

Being a member yourself is what matters. The owner already being in the channel does not
help you, and neither does the person you are talking to being in it. Do not try
`buzz channels add-member` to add yourself; you cannot resolve the UUID you would need.

### `JANICE_PUBKEY` is circular in a new community — expect two bootstrap runs

`buzz channels members --channel <janice-uuid>` gives you `JANICE_PUBKEY` **only if a Janice
already exists in that community.** Each operator gets their *own* Janice, whose pubkey does
not exist until they save the draft in Step 4 — so on a first install there is nothing to
look up and nothing anyone can tell you.

That is expected, not a blocker. Leave `JANICE_PUBKEY` blank, note it, and:

1. Bootstrap and create the agents without it. `wake-janice.sh` is the only consumer.
2. After they save the Janice draft, get her pubkey and re-run `bootstrap-nest.mjs`.

Bootstrap is idempotent, so the second run rewrites only that. **Tell them this up front** —
otherwise the first run's unresolved-token failure looks like something went wrong.

Everything else you can resolve yourself: channel UUIDs by name from `buzz channels list`.
Ask only for what you could not find.

Then write the file — **never** to the repo root, always to `buzz-agents/`:

```bash
cp buzz-agents/local-values.example.json buzz-agents/local-values.json
```

Fill it in and confirm it is ignored before you go any further:

```bash
git check-ignore -v buzz-agents/local-values.json
```

If that prints nothing, **stop** — the file is not ignored and this repository is public.

**Put only the keys the example file lists in there.** It is tempting to add the slug, or the
operator's name, since you have both by now — do not. Every value in that file is treated as
a substring to swap for its token when prompts are exported, so a short one does damage out
of all proportion to its usefulness: a slug like `acme` would rewrite the word `acmeism`, and
a first name would rewrite every mention of that person. The slug is a `--slug` argument and
the owner is `--owner`. Neither is a token.

### The one real secret

The **service-account key** is the only true secret in the set, and it is a file, not a
string. It belongs at:

```
~/.buzz/.secrets/claire-<slug>-service-user.json     mode 0600
```

Rules, and they are not negotiable:

- `.secrets/` is `0700` and lives **outside any git checkout**. Never copy a key into the
  repo, not even briefly.
- **Never print a key, or any part of one, into the channel.** Buzz messages are relay
  events; you cannot unsend one. Confirm a key by its path, permissions and
  `client_email` — never its contents.
- Ask them to place the file themselves and tell you the path. Do not ask them to paste it
  to you.

```bash
chmod 600 ~/.buzz/.secrets/claire-<slug>-service-user.json
node -e 'console.log(require(process.argv[1]).client_email)' <path>   # identify, don't dump
```

**You already know what that `client_email` should say, so check it rather than accepting
whatever arrives.** Both the account and the filename follow from values you have:

```
client_email  claire-<slug>-service-user@<BQ_PROJECT>.iam.gserviceaccount.com
filename      ~/.buzz/.secrets/claire-<slug>-service-user.json
```

So for slug `acme` in project `acme-research-123456` the account is
`claire-acme-service-user@acme-research-123456.iam.gserviceaccount.com`. Derive the expected
string, compare it to the file's `client_email`, and say which you got.

A mismatch is worth stopping for, because each of the two ways it can differ is a distinct
problem:

| What differs | What it means |
|---|---|
| The **project** part | The key belongs to another client's project. Do not install it — this is precisely the cross-client leak the isolation check exists to catch. |
| The **slug** part | Either the wrong client's key, or an account whose name simply never matched the slug. Confirm which client it is for before use, and if the name is legitimate, record it as `sa_slug` on the canvas rather than renaming anything. |

Never print the key's contents, any part of a private key, or the `private_key_id`. The
`client_email` is an identifier, not a credential, and is the only field to quote.

## Step 3 — Install the nest

Dry run first, always. Show them what it says:

```bash
node scripts/bootstrap-nest.mjs --check
```

Then:

```bash
node scripts/bootstrap-nest.mjs
```

It downloads a checksum-verified 154 MB `toolbox` binary, so it is not instant. It is
idempotent — re-running is always safe, and is the correct response to almost any failure
after you have fixed the cause.

**Read its output; do not just check the exit code.** Two stops are normal and each names
its own fix:

- *Unresolved tokens* — it lists every missing value and the file needing it. Add them and
  re-run. It refuses rather than installing a script that hunts for a project literally
  named `{{BQ_PROJECT}}`.
- *Missing prerequisite* — it names what to install. `gcloud` missing is only a warning,
  and only matters for case 2.

## Step 4 — Create the agents

`--channel` is **this** channel — the one you were asked in, whose canvas you read in Step 2.

```bash
node buzz-agents/scripts/restore-agents.mjs --channel <this-channel-uuid> --owner <name>          # show the commands
node buzz-agents/scripts/restore-agents.mjs --channel <this-channel-uuid> --owner <name> --run    # open the drafts
```

`--owner` defaults to the first word of the checkout's `git config user.name`, and the script
prints which name it resolved and where from before it sends anything. **Read that line out
and confirm it** — it is what people will type to address the agent. If it cannot work out a
name it stops rather than falling back to bare `Claire`; `--no-owner` is how you ask for the
bare name on purpose, and it is only right for a community that will hold exactly one set of
these agents forever.

That creates them as **`Claire (Alex)`**, `Stu (Alex)` and so on. Everyone runs their own
agents, so a shared channel otherwise ends up holding several bots called `Claire` with
nothing distinguishing them — which happened, and left a real "which of these is mine?"
Only the display name carries the owner; the stored definition stays canonical, so it is
still one shared `agents/claire/` for everybody.

Do not hand-rename an agent in Buzz Desktop to achieve this. Use `--owner`, so the name is
applied the one way the tooling recognises.

**A fifth draft opens, for Loki, and you must tell the operator not to save it.** Every agent
in the repository is restored — there is no skip list — and Loki generates synthetic
transcripts. His fence is an environment variable no CLI flag reaches, so until
`GUIDES/LOKI_SANDBOX_SETUP.md` has been worked through, saving him produces an agent with every
client Drive and dataset on the machine in reach and a prompt that states they are absent. Say
that plainly, in the channel, in the same message as the names: discard Loki's draft for now, or
save it and leave him stopped. He is not part of this install and nothing in it waits on him.

**ALAN registers as `Alan (Alex)`, not `ALAN (Alex)`.** This skill and his own prompt style
him ALAN; `agents/alan/agent.json` says `Alan`, and that is what Buzz gets. Quote the names
the script prints, never the ones in this prose — a mention of `@ALAN (Alex)` resolves to
nothing.

Someone else's `Claire (…)` already in the channel is **not** a conflict and not a reason to
reuse it — it is theirs, on their machine, spending their budget. Two owner-suffixed Claires
in one room is the convention working. What is a real problem is two agents on *one* Mac
answering to the same definition; `sync-prompts.mjs` reports that as `more than one match on
this Mac` and names both, and it will not guess between them.

**You cannot finish this step, and you must not imply that you have.** Each command opens
a prefilled draft in *their* Buzz Desktop that **they** review and save. That gate is
deliberate: a prompt arriving from a git branch gets human eyes before it starts answering
people. Tell them plainly: four drafts to open and save, by hand.

Work through the `MANUAL` block it prints — parallelism, timeouts, avatar upload have no
CLI flags.

If `buzz upload file` rejects an avatar with *media contains metadata or a non-canonical
metadata channel*, the PNG is carrying an `eXIf` chunk. The committed avatars no longer do.
Do **not** try to fix it by re-encoding with `sips` — `sips` is what writes that chunk, so
every retry reproduces the rejection. If you meet it on some other image, strip the chunk:

```bash
node -e 'const f=process.argv[1],fs=require("fs");import("'"$PWD"'/buzz-agents/lib/avatars.mjs").then(m=>fs.writeFileSync(f,m.stripPngMetadata(fs.readFileSync(f))))' <file.png>
```

Then tell them to **restart Buzz Desktop.** MCP servers are read once at startup; until
they restart, their agents have no tools and will look broken.

## Updating agents that already exist

Case 3 only. **Do not use Step 4 here** — `draft-create` proposes a *new* agent, so it would
offer them a second Claire rather than update the one they have.

Start by asking what is actually different, which needs no credentials and changes nothing:

```bash
node buzz-agents/scripts/sync-prompts.mjs
node buzz-agents/scripts/sync-prompts.mjs --diff     # see the change itself
```

Read the state it reports per agent, because the right action is different for each:

| It says | What happened | What to do |
|---|---|---|
| `in sync` | Nothing to do | Say so and stop |
| `BEHIND the branch` | They pulled; their agent is an older commit | Offer the `draft-update` it prints |
| `has local edits not in git` | **They edited the agent in Buzz Desktop and never exported it** | Do NOT apply. Their prompt is unversioned work and applying would delete it |
| `runs the committed prompt, unstamped` | First run since stamps existed, or a stamp got lost | Nothing. It records the version itself and reports `in sync` |
| `prompt in sync, settings differ` | Only runtime/provider/model/`respond_to` moved | Offer the settings-only `draft-update` |
| `prompt not committed yet` | A prompt in the repo has never been committed | Commit it; a version stamp is a commit sha |
| `not installed on this Mac` | Genuinely missing | That one, and only that one, needs Step 4 |
| `more than one match on this Mac` | Two personas here answer to one definition — e.g. a `Claire` and a `Claire (Alex)` | Nothing, until a human resolves it. It names both; ask which to keep. Do not guess — `draft-update` reports `accepted: true` for a name that hits nothing, so the wrong guess looks like a success |

**Check `not installed` against Buzz Desktop before acting on it.** It is the one state whose
wrong answer is expensive: acting on it creates a duplicate agent, and a duplicate cannot be
merged back. If they can see that agent in Desktop, the report is wrong, not the person — say
so and stop rather than creating a second one.

For the local-edits case, tell them what they have and let them choose. The capture is
`node buzz-agents/scripts/export-agents.mjs`, then a normal PR. Do not run
`--force-apply` on their behalf: it exists so a human can overwrite their own work
knowingly, not so you can.

To send the drafts once they have agreed:

```bash
node buzz-agents/scripts/sync-prompts.mjs --channel <uuid> --run
```

Same gate as Step 4 — each one opens a form they must save. If it reports a prompt over the
20,000-character limit, do not trim the prompt to fit; that is a content decision for the
owner, and `~/.buzz/GUIDES/JANICE_REVIEW_CHECKLIST.md` covers how to move a section out to a
guide instead.

**Sending a draft does not record it.** Nothing is stamped until the owner saves the form,
because a draft can be discarded. So after they tell you they have saved, run the report once
more — that pass sees the prompt that actually landed and records the version. Do not tell
them an update is complete on the strength of `accepted: true`.

## Step 5 — Wire this machine up. Every case, including joining

**Run this even when joining a client someone else already created.** It used to say to
skip it, and that was wrong: past the dataset work, this script is the *only* thing that
does the per-machine half of the install.

```bash
~/.buzz/bin/deploy-claire-channel.sh --slug <slug> --channel-uuid <uuid> \
  --drive-folder <folder-id> --sa-key ~/.buzz/.secrets/claire-<slug>-service-user.json --dry-run
```

Run `--dry-run` first and read it. Drop the flag to apply.

| It also does | Which lives nowhere else |
|---|---|
| Registers `bq-<slug>`, `bq-<slug>-ro`, `bq-<slug>-explore`, `drive-<slug>` | `claude mcp add-json`, user scope, on **this** Mac |
| Renders `scribe/lexicon/tagger/analyst/persona-<slug>.md` | into `~/.buzz/.claude/agents/` |
| Writes a per-client fence and launcher for Claire and for Stu | into `~/.buzz/proxy/` — see Step 5b |

Bootstrap ships the *templates* for both and never renders them, so a machine that skips
this step has Claire, no tools and no subagents. Nothing later catches it: Step 6 drives
the toolbox binary directly with the key, so it reports `Isolation holds.` on a machine
with nothing registered at all. The install looks finished and the first ingest fails.

**Joining an existing client**, add `--no-lockdown` and pass only `--sa-key`:

```bash
~/.buzz/bin/deploy-claire-channel.sh --slug <slug> --channel-uuid <uuid> \
  --drive-folder <folder-id> --sa-key ~/.buzz/.secrets/claire-<slug>-service-user.json \
  --no-lockdown
```

Safe against a live dataset holding another operator's data, by design rather than by
luck: the script probes for the dataset and drops `CREATE SCHEMA` when it is already
there, every table is `CREATE TABLE IF NOT EXISTS`, and the tag sync is a `MERGE` on
`tag`. `--no-lockdown` because the `REVOKE` is the creating operator's job and is already
done — without the flag you get a warning about grants that were dealt with weeks ago.

**Creating a new client**, do the Google Cloud steps in
`~/.buzz/GUIDES/CLAIRE_ZERO_TO_RUNNING.md` steps 1–6 first, then run it with
`--lock-down` and an `--admin-key` that holds `bigquery.datasets.update`.

**Pass a lockdown flag either way.** With neither, the script has a question to ask and no
terminal to ask it at, so it decides for you and says so in the summary — which is a line
of output to explain rather than a decision anybody made.

## Step 5b — One Claire and one Stu **per client channel**

Step 5 wrote two launchers. Point a **new** agent identity at each, in Buzz Desktop:

| Field | Value |
|---|---|
| Runtime | `claude` |
| Agent command | `~/.buzz/proxy/agent-claire-<slug>.sh` — and `agent-stu-<slug>.sh` for Stu |

**Set both fields in one save.** Runtime alone, saved first, is the unfenced state: the agent
starts, reads the user-scope registry, and holds every client on this machine.

**Do not reuse a Claire or Stu that already sits in another client's channel.** This is the
mistake to expect, it looks entirely reasonable, and it fails silently. The fence is
`CLAUDE_CONFIG_DIR`, which is fixed when the agent's process starts and cannot vary per
channel — so one identity holds one client whichever channel it happens to be answering in.
Two client channels means two identities.

**IAM does not save you here, and the evidence that it does is misleading.** Each client's
service account really is locked to its own dataset and folder: every cross-client attempt
with the wrong key is refused, on BigQuery and on Drive. But an identity holding two clients'
servers holds two *correct* keys, and both crossings are authorised. IAM answers "may this
credential read this data" and never "should this session be touching this client". The
second question is answered only by which servers the session loaded. So a clean isolation
report in Step 6 is necessary and not sufficient — it is about keys, not about sessions.

**Do not fall back on the prompt.** Claire's and Stu's prompts both say they serve one client,
and a small local model asked to read another client's table did it on the first attempt and
named the other client's tool in its answer. Prompt discipline is not a control.

If Buzz Desktop has no agent-command field on this build, stop and report it rather than
saving runtime on its own — that combination is the unfenced state, not a partial install.

## Step 6 — Prove the fence, before any client data moves

**Not optional, and not a formality.** It tests Google's IAM layer rather than our config,
by trying to read another client's data as this service account and confirming it cannot:

```bash
~/.buzz/bin/verify-channel-isolation.py --slug <slug> \
  --key ~/.buzz/.secrets/claire-<slug>-service-user.json
```

Healthy output ends with `Isolation holds.` **Anything else, stop** and report it. Do not
ingest a transcript to "see if it works" — that is the exact action the fence exists to
make safe. `ISOLATION BROKEN` almost always means a project-level BigQuery role; leave only
`jobUser` on the project and `dataEditor` on the one dataset.

`Isolation holds.` says the key reaches one dataset. It says **nothing** about whether this
machine can use it, because the check runs the toolbox binary itself rather than the
registered servers. So confirm the wiring separately, and do it before you report success:

```bash
claude mcp list | grep -E "bq-<slug>|drive-<slug>"     # expect four
ls ~/.buzz/.claude/agents/*-<slug>.md                   # expect four
ls ~/.buzz/proxy/agent-{claire,stu}-<slug>.sh           # expect two
```

Four servers, four subagent files, two launchers. Anything short of that means Step 5 did
not finish — re-run it rather than restarting Buzz, which is the wrong fix for this and
wastes their time.

**`claude mcp list` is a wiring check, not a fence check.** It reads the registry files
directly and reports everything registered on the machine, so it prints the same list
through a correct fence as through no fence at all. What a fenced agent can actually see is
answered only by a session started with its own launcher:

```bash
CLAUDE_CONFIG_DIR=~/.buzz/proxy/claude-config-stu-<slug> \
  claude -p "List every MCP server prefix you can see." --permission-mode bypassPermissions
```

One prefix for Stu, three for Claire, and no other client named. **Ask the server, not the
agent, whether a write is refused** — a model politely declining a `DELETE` reads exactly
like an enforced fence and is not one.

## Step 7 — Report

Tell them, specifically:

- What is installed and verified, with the isolation result quoted.
- **The agents' full names, including the owner suffix** — `Claire (Alex)`, not `Claire`.
  That is what they type to address one, so "Claire is up" leaves them guessing at the name.
- Whether you changed the canvas, and what you added to it.
- **What they still have to do by hand**: save four drafts, restart Buzz Desktop, and
  anything from the `MANUAL` block.
- Anything you could not verify. Say so plainly rather than implying full success.

Then a smoke test they run themselves, using the real name:
`@Claire (Alex) ingest the transcript in the Drive folder`.

## Things to get right

- **Do not flip `respond_to`.** All four ship `owner-only`. Changing it to `anyone` lets
  everyone in a channel spend the owner's API budget and read that channel's client data.
  It is an access decision for the community owner, not a setup step.
- **Do not edit a prompt to work around a problem.** Fix the install. Prompt changes go
  through `draft-update` and an owner's review.
- **`ANTHROPIC_API_KEY` is theirs.** Every operator brings their own and spends their own
  budget. Never copy one between machines.
- **Never commit `local-values.json`, `.env`, or anything from `.secrets/`.** If a
  `git status` in that checkout ever shows one, stop and say so.
- **The checkout is a public repository, and a commit message cannot be edited after a
  push.** Never write a client name or slug, a dataset or service-account name built from
  one, a participant's name or anything they said, a cloud project id, a Drive or sheet id,
  a channel UUID or a pubkey into a commit message, a branch name, or a PR or issue body.
  Write "the client" or "a participant" instead — the point always survives it. Step 3
  turns on two checks: a git hook that refuses a commit message naming one, and a
  `PreToolUse` hook that refuses the command outright — covering a PR title and body, an
  issue, and a branch or tag name, which git cannot hook at all. If either one stops you,
  rewrite; do not work around it. Text piped in on stdin is warned about rather than
  blocked, because the guard cannot read it — pipe that through
  `node buzz-agents/scripts/check-text-for-names.mjs` yourself. This has gone wrong for
  real, in the prose explaining a bug rather than in any diff — that paragraph is the one
  carrying the name.
- **Add the client's bare slug to `local-redactions.json` when you join a client.** The
  composed forms are caught by shape; the bare word can only be caught by naming it. A
  `manual` entry for each casing is what stops it reaching a branch name.
- **A silent Janice is not a broken Janice.** A clean review produces no message. Do not go
  looking for a fault, and do not tell them it failed.
- Prefer re-running bootstrap over hand-editing anything inside `~/.buzz`. Hand edits are
  invisible to the next operator and to the next `git pull`.
