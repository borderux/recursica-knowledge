# Install the agents on your own Mac

Everyone runs their own agents. There is no shared server — your Claire is yours, on your
machine, spending your own API budget, and she is awake when your Mac is.

**Time:** about 15 minutes if you are joining an existing client. Longer the first time
only because you install Buzz Desktop.

**You need a Mac.** `buzz` and `buzz-acp` ship only as arm64 macOS binaries inside
Buzz.app. There is no Linux build and no container option.

---

## What you are installing

Two halves, and it is worth knowing which is which when something breaks:

| Half           | What it is                                                     | Where it comes from                                 |
| -------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| **The agents** | Claire, Stu, Janice, ALAN — their prompts and settings         | `buzz-agents/` → drafts you approve in Buzz Desktop |
| **The nest**   | The scripts, fenced MCP servers and guides they use at runtime | `nest/` → `~/.buzz/` via one command                |

An agent without the nest starts up and then cannot do anything, because every tool it
reaches for lives in `~/.buzz`. Install both.

---

## The short way: ask Fizz

Fizz ships with Buzz Desktop, so you already have her. Do Step 1 — install Buzz Desktop and
have `claude` and `node` on your PATH — then **add your own Fizz to the channel the agents
are for** and send her this **one message, in that channel**. It replaces Step 2 onward; she
clones the repo herself:

```
deploy the buzz agents: clone https://github.com/borderux/recursica-knowledge into ~/.buzz/REPOS/ and follow nest/.claude/skills/deploy-agents/SKILL.md
```

She reads the configuration out of that channel's canvas, installs the nest, opens the four
drafts for you to approve, and runs the isolation check. That is why the channel matters: a
private channel is invisible to an agent that is not a member of it — canvas, name and all —
and _your_ being in it does not cover her. Asked in the right channel she needs almost
nothing from you; asked anywhere else she has to interview you for every value.

**Why that line carries the repo URL and a file path.** The instructions she follows live
_inside_ the repo, so on a clean Buzz install she has no way to find them and no way to
find the thing that contains them. This message is the only one that has to spell both out.
Once the nest is installed the skill is registered locally, and from then on it is just:

```
deploy the agents
```

That shorter line also covers repairing a half-finished install and updating after a
`git pull` — she works out which case she is in by looking at `~/.buzz`.

The rest of this page is the same process by hand. Use it if you would rather see every
command, or if something went wrong and you want to know what she was doing.

> **Never paste a service-account key into a chat**, with Fizz or anyone. Put the file at
> `~/.buzz/.secrets/` and tell her the path. Relay messages cannot be unsent.

Handing this to someone else? [ONBOARD_AN_OPERATOR.md](ONBOARD_AN_OPERATOR.md) is the
owner's side — what to send, what never to send, and how to revoke it later.

---

## Step 1 — Prerequisites

|                         | Why                                                                          | Get it                |
| ----------------------- | ---------------------------------------------------------------------------- | --------------------- |
| **Buzz Desktop**        | Supplies the `buzz` CLI _and_ `buzz-acp`. Neither is distributed separately. | Install the app       |
| **Claude Code**         | The runtime every agent is configured against                                | `claude` on your PATH |
| **Node 18+**            | Runs the Drive fence server and these scripts                                | `node` on your PATH   |
| **`gcloud`**            | Only if you will create a _new_ client dataset                               | Google Cloud SDK      |
| **`ANTHROPIC_API_KEY`** | Your own. Never shared between operators.                                    | Your account          |

Step 4 checks all of these and names anything missing, so you do not have to verify by hand.

---

## Step 2 — Clone the repo

Clone it into `~/.buzz/REPOS/` — that is where Fizz looks for it:

```bash
mkdir -p ~/.buzz/REPOS
git clone https://github.com/borderux/recursica-knowledge.git ~/.buzz/REPOS/recursica-knowledge
cd ~/.buzz/REPOS/recursica-knowledge
```

Everything below runs from that directory. `main` is what you want — no branch to check
out.

---

## Step 3 — Fill in your values

Identifiers are not stored in this repository — it is public. Prompts and scripts carry
`{{TOKEN}}` markers, and you supply the values for _your_ installation.

```bash
cp buzz-agents/local-values.example.json buzz-agents/local-values.json
```

Open it and fill it in. [`placeholders.json`](placeholders.json) says what each value is
and exactly where to find it. `TRANSCRIPT_DIR` you can leave blank — Step 4 derives it.

Ask whoever runs your community for the channel UUIDs; they are the same for everyone in it.

> `local-values.json` is gitignored. Keep it that way — it is the file that would put your
> project and folder ids into a public repo.

### `JANICE_PUBKEY` cannot be filled in yet — leave it blank

Every other value exists before you start. This one does not, and the ordering is circular:
each operator runs their **own** Janice, and her pubkey does not exist until you have saved
her draft in Step 5. On a first install there is nothing to look up and nobody who can tell
you.

So leave it blank and expect **Step 4 to run twice**:

1. Run it now. It installs everything it can, then stops with
   `✗ Unresolved tokens: JANICE_PUBKEY` and exits non-zero. **That is the expected result,
   not a failure** — `bin/wake-janice.sh` is the only file that needs the value, and it is
   the only one held back.
2. Do Step 5, save the Janice draft, then get her pubkey and re-run Step 4:

   ```bash
   buzz channels members --channel <your-janice-channel-uuid>
   ```

   Bootstrap is idempotent, so the second run writes only that one file.

Until it does, Janice is installed and healthy but never wakes up — and a silent Janice is
also what a clean review looks like, so nothing will tell you it did not happen.

---

## Step 4 — Install the nest

See what it would do:

```bash
node scripts/bootstrap-nest.mjs --check
```

Then do it:

```bash
node scripts/bootstrap-nest.mjs
```

It verifies prerequisites, creates `~/.buzz/` with `.secrets/` locked to `0700`, installs
the scripts, MCP servers and guides, and resolves your tokens on the way in.

**It is idempotent.** Re-run it after every `git pull` to pick up changes; it rewrites only
what differs.

**If it stops, read what it says.** The usual stop is _unresolved tokens_ — it lists every
missing value and the file that needed it. Add them to `local-values.json` and re-run. It
refuses rather than installing a script that would go looking for a project literally named
`{{BQ_PROJECT}}`.

**A stop naming only `JANICE_PUBKEY` is the expected first run**, for the reason in Step 3.
Carry on to Step 5 and come back to this step once her draft is saved.

It also downloads the 154 MB BigQuery `toolbox` binary from Google's official release
bucket and verifies its sha256 against the version this stack is pinned to. That is the
slow part of the step — give it a minute. The binary is not committed here; it is fetched
and checked, and a mismatch aborts instead of installing, because `toolbox` is the
component that enforces the dataset fence.

---

## Step 5 — Create the agents

```bash
# See the commands first
node buzz-agents/scripts/restore-agents.mjs --channel <your-channel-uuid> --owner <your-name>

# Run them
node buzz-agents/scripts/restore-agents.mjs --channel <your-channel-uuid> --owner <your-name> --run
```

`--owner` names them **`Claire (Your Name)`**, `Stu (Your Name)` and so on. Everyone runs
their own agents, so a shared channel otherwise holds several bots called `Claire` with no
way to tell whose is whose. Only the display name changes — the definition in the repo stays
canonical and shared.

> **ALAN is created as `Alan (Your Name)`.** These pages and his own prompt style him ALAN,
> but the name in [`agents/alan/agent.json`](agents/alan/agent.json) is `Alan`, and that is
> the one Buzz registers. `@ALAN (Your Name)` will not resolve. The script prints every name
> it is about to create — take it from there rather than from prose.

Use the flag rather than renaming an agent in Buzz Desktop afterwards. A hand-rename is not
recognised as the same agent by `sync-prompts.mjs` or `export-agents.mjs`.

Each command opens a **prefilled form in your Buzz Desktop that you review and save.** That
review step is deliberate and cannot be skipped — an agent definition arriving from a git
branch should be read by a person before it starts answering them.

The script also prints a `MANUAL` block for the few settings the CLI has no flag for
(parallelism, timeouts, avatar upload). Work through it; it is short.

Then **restart Buzz Desktop.** MCP servers are read once at startup, so until you do, your
agents have no tools.

---

## Step 6 — Wire up this machine

**Everyone runs this, including if you are joining a client that already exists.** Past the
dataset work, it is the only thing that registers your MCP servers (`bq-<slug>`,
`bq-<slug>-ro`, `drive-<slug>`) and writes your four subagents into
`~/.buzz/.claude/agents/`. Step 4 installs the *templates* for those and never renders
them, so skipping this leaves you with Claire, no tools and no subagents — and nothing
downstream notices.

Add `--dry-run` first to validate without changing anything.

**Joining an existing client.** You need the dataset to already exist and the Drive folder
shared with the service account — ask whoever set it up. Then:

```bash
~/.buzz/bin/deploy-claire-channel.sh \
  --slug <slug> \
  --channel-uuid <channel-uuid> \
  --drive-folder <folder-id> \
  --sa-key ~/.buzz/.secrets/claire-<slug>-service-user.json \
  --no-lockdown
```

This is safe to run against a dataset someone else is already using: `CREATE SCHEMA` is
dropped when the dataset exists, every table is `CREATE TABLE IF NOT EXISTS`, and the tag
sync is a `MERGE`. `--no-lockdown` because the `REVOKE` was the creating operator's job and
is already done.

**Creating one from scratch.** Follow
[`nest/GUIDES/CLAIRE_ZERO_TO_RUNNING.md`](../nest/GUIDES/CLAIRE_ZERO_TO_RUNNING.md) first,
then run the same command with `--lock-down` and an `--admin-key` that can administer the
dataset.

Either way, pass one of `--lock-down` / `--no-lockdown`. With neither, the script has a
question to ask and — if an agent is running it for you — no terminal to ask at, so it
decides for you and tells you what it chose.

---

## Step 7 — Prove it works

**If you touch client data, this step is not optional.** It tests Google's IAM layer rather
than our config, by trying to reach other clients' data as your service account and
confirming it cannot:

```bash
~/.buzz/bin/verify-channel-isolation.py --slug <slug> \
  --key ~/.buzz/.secrets/claire-<slug>-service-user.json
```

Healthy output ends with `Isolation holds.` Anything else — stop and fix it before ingesting
anything.

Then smoke-test in your channel:

```
@Claire ingest the transcript in the Drive folder
```

---

## When it goes wrong

| Symptom                                              | Cause                                               | Fix                                      |
| ---------------------------------------------------- | --------------------------------------------------- | ---------------------------------------- |
| Bootstrap stops on prerequisites                     | Missing app or binary                               | Install what it named, re-run            |
| Bootstrap stops on unresolved tokens                 | Blank values                                        | Fill in `local-values.json`, re-run      |
| …and the only one named is `JANICE_PUBKEY`           | Expected on a first install — it cannot exist yet   | Step 5, save Janice's draft, re-run Step 4 |
| `stu: no Stu app at …`                               | The checkout moved after bootstrap baked its path   | Re-run Step 4 from the checkout          |
| Your agent has no tools                              | Buzz not restarted since install                    | Restart Buzz Desktop                     |
| …and restarting did not help                         | Step 6 never ran, so nothing was registered         | `claude mcp list` — expect three `<slug>` servers. None? Run Step 6 |
| A tool is missing entirely                           | `toolbox` download failed or was interrupted        | Re-run Step 4; it refetches and verifies |
| `Access Denied` on your own dataset                  | Dataset grant missing, or wrong region (must be US) | Check both                               |
| Janice never says anything                           | Normal — a clean turn gets no message               | Nothing to fix                           |
| Janice posts to a channel named `{{JANICE_CHANNEL}}` | Nest installed with tokens unresolved               | Re-run Step 4                            |
| `ISOLATION BROKEN`                                   | Project-level BigQuery role on the service account  | Leave only `jobUser`, re-run Step 7      |

---

## What stays manual, and why

Not oversights — each is deliberate:

- **Approving each agent draft.** A prompt from a git branch gets human eyes first.
- **Avatar upload.** No CLI flag exists; the `MANUAL` block gives you the command.
- **Agent memory.** Each agent's `core` lives on the relay and only that agent can read it.
  A freshly installed agent starts with an empty memory and builds its own.
- **Your `ANTHROPIC_API_KEY` and any service-account key.** Yours, not shared.
- **Google Cloud console steps** for a brand-new client that need permissions a channel
  service account deliberately does not have.

---

## Keeping up to date

```bash
git pull
node scripts/bootstrap-nest.mjs      # picks up changed scripts and guides
```

Re-running bootstrap also picks up new nest files, including updates to the `deploy-agents`
skill Fizz uses. Your own `.claude/settings.json` is left alone once it exists — bootstrap
reports when it differs from the branch instead of overwriting your hooks and permissions.

Bootstrap covers the nest. It does not touch your agents' prompts, because nothing is
allowed to rewrite an agent's instructions without you looking at them first. So after a
pull, ask what changed:

```bash
node buzz-agents/scripts/sync-prompts.mjs
```

Each agent carries a **version stamp** — an env var recording the commit its prompt came
from — so the check is a version comparison rather than a prompt comparison. Where the branch
has a newer commit than the one you installed, it prints a `buzz agents draft-update` you can
run; where _you_ are ahead — you edited an agent in Buzz Desktop and never exported it — it
says so and refuses to overwrite your edit. Add `--diff` to see the change before deciding,
and `--channel <uuid> --run` to send the drafts.

The first run on an existing setup finds no stamps, checks the prompts once to work out where
each agent actually stands, and writes them. From then on it is two string comparisons per
agent. Use `--check` if you want a report that writes nothing at all.

Applying an update takes two runs, on purpose. The first sends the draft; the second, after
you have saved it in Buzz Desktop, records the version that actually landed. Nothing stamps
an agent for a draft you might still discard.

Every draft still opens a form in Buzz Desktop that you have to save. Your agents will not
silently rewrite themselves.
