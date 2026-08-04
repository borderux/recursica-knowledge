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
   `gcloud`.
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

No clone yet? Clone it into `~/.buzz/REPOS/`. Everything below runs from that directory.

## Step 2 — Collect their values

Ask for all of them in **one** message, not one question at a time. Ten round trips to
fill in a form is a worse experience than the README this skill replaces.

What to ask for, and be precise that most of these are **not** secrets — they are
identifiers, and they are the same for everyone in the community:

- `BQ_PROJECT` — the Google Cloud project id
- `DRIVE_FOLDER` — the client's Drive folder id
- `TAG_SHEET_ID` — the shared tag dictionary sheet id
- `CLAIRE_CHANNEL`, `STU_CHANNEL`, `ALAN_CHANNEL`, `JANICE_CHANNEL` — channel UUIDs
- `JANICE_PUBKEY` — this community's Janice, hex
- `BUILDER_REPO`, `BUILDER_REPO_NAME`, `KNOWLEDGE_REPO_NAME` — only if they want ALAN

`buzz-agents/placeholders.json` says where each one is found; quote from it rather than
inventing instructions. Leave `TRANSCRIPT_DIR` blank — bootstrap derives it.

You can resolve some of this yourself instead of asking. Do:

```bash
buzz channels list
```

Channel UUIDs are in there by name, and `buzz channels members --channel <janice-uuid>`
gives you `JANICE_PUBKEY`. Ask only for what you could not find.

Then write the file — **never** to the repo root, always to `buzz-agents/`:

```bash
cp buzz-agents/local-values.example.json buzz-agents/local-values.json
```

Fill it in and confirm it is ignored before you go any further:

```bash
git check-ignore -v buzz-agents/local-values.json
```

If that prints nothing, **stop** — the file is not ignored and this repository is public.

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

```bash
node buzz-agents/scripts/restore-agents.mjs --channel <uuid>          # show the commands
node buzz-agents/scripts/restore-agents.mjs --channel <uuid> --run    # open the drafts
```

**You cannot finish this step, and you must not imply that you have.** Each command opens
a prefilled draft in *their* Buzz Desktop that **they** review and save. That gate is
deliberate: a prompt arriving from a git branch gets human eyes before it starts answering
people. Tell them plainly: four drafts to open and save, by hand.

Work through the `MANUAL` block it prints — parallelism, timeouts, avatar upload have no
CLI flags.

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

## Step 5 — Only for a new client

Skip entirely when joining an existing one.

```bash
~/.buzz/bin/deploy-claire-channel.sh --slug <slug> --channel-uuid <uuid> \
  --drive-folder <folder-id> --sa-key ~/.buzz/.secrets/claire-<slug>-service-user.json --dry-run
```

Run `--dry-run` first and read it. Drop the flag to apply. Google Cloud steps this cannot
do are in `~/.buzz/GUIDES/CLAIRE_ZERO_TO_RUNNING.md` steps 1–6.

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

## Step 7 — Report

Tell them, specifically:

- What is installed and verified, with the isolation result quoted.
- **What they still have to do by hand**: save four drafts, restart Buzz Desktop, and
  anything from the `MANUAL` block.
- Anything you could not verify. Say so plainly rather than implying full success.

Then a smoke test they run themselves: `@Claire ingest the transcript in the Drive folder`.

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
- **A silent Janice is not a broken Janice.** A clean review produces no message. Do not go
  looking for a fault, and do not tell them it failed.
- Prefer re-running bootstrap over hand-editing anything inside `~/.buzz`. Hand edits are
  invisible to the next operator and to the next `git pull`.
