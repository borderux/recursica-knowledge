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

| Half | What it is | Where it comes from |
|---|---|---|
| **The agents** | Claire, Stu, Janice, ALAN — their prompts and settings | `buzz-agents/` → drafts you approve in Buzz Desktop |
| **The nest** | The scripts, fenced MCP servers and guides they use at runtime | `nest/` → `~/.buzz/` via one command |

An agent without the nest starts up and then cannot do anything, because every tool it
reaches for lives in `~/.buzz`. Install both.

---

## Step 1 — Prerequisites

| | Why | Get it |
|---|---|---|
| **Buzz Desktop** | Supplies the `buzz` CLI *and* `buzz-acp`. Neither is distributed separately. | Install the app |
| **Claude Code** | The runtime every agent is configured against | `claude` on your PATH |
| **Node 18+** | Runs the Drive fence server and these scripts | `node` on your PATH |
| **`gcloud`** | Only if you will create a *new* client dataset | Google Cloud SDK |
| **`ANTHROPIC_API_KEY`** | Your own. Never shared between operators. | Your account |

Step 4 checks all of these and names anything missing, so you do not have to verify by hand.

---

## Step 2 — Clone the repo

```bash
git clone https://github.com/borderux/recursica-knowledge.git
cd recursica-knowledge
git checkout feature/buzz-agent-definitions
```

---

## Step 3 — Fill in your values

Identifiers are not stored in this repository — it is public. Prompts and scripts carry
`{{TOKEN}}` markers, and you supply the values for *your* installation.

```bash
cp buzz-agents/local-values.example.json buzz-agents/local-values.json
```

Open it and fill it in. [`placeholders.json`](placeholders.json) says what each value is
and exactly where to find it. `TRANSCRIPT_DIR` you can leave blank — Step 4 derives it.

Ask whoever runs your community for the channel UUIDs; they are the same for everyone in it.

> `local-values.json` is gitignored. Keep it that way — it is the file that would put your
> project and folder ids into a public repo.

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

**If it stops, read what it says.** Two stops are normal and both name their own fix:

- *Unresolved tokens* — it lists every missing value and the file that needed it. Add them
  to `local-values.json` and re-run. It refuses rather than installing a script that would
  go looking for a project literally named `{{BQ_PROJECT}}`.
- *toolbox not installed* — see [Step 4a](#step-4a--the-toolbox-binary).

### Step 4a — the toolbox binary

The BigQuery MCP server is a 154 MB binary that is deliberately not committed here. The
build this stack is known to work against (1.8.0) is **not currently downloadable from
anywhere the script can verify** — the published bucket stops at v1.1.0.

So, easiest first:

```bash
# Copy it from a machine that already has a working nest
scp othermac:~/.buzz/bin/toolbox ~/.buzz/bin/toolbox
chmod 755 ~/.buzz/bin/toolbox
```

Then re-run Step 4 — it verifies the checksum and confirms you have the right build.

If nobody can hand you a copy, `--allow-toolbox-fallback` installs the older published
version. Read the warning it prints first: that binary is what enforces the dataset fence,
so if you use it, run Step 7's isolation check before touching client data.

---

## Step 5 — Create the agents

```bash
# See the commands first
node buzz-agents/scripts/restore-agents.mjs --channel <your-channel-uuid>

# Run them
node buzz-agents/scripts/restore-agents.mjs --channel <your-channel-uuid> --run
```

Each command opens a **prefilled form in your Buzz Desktop that you review and save.** That
review step is deliberate and cannot be skipped — an agent definition arriving from a git
branch should be read by a person before it starts answering them.

The script also prints a `MANUAL` block for the few settings the CLI has no flag for
(parallelism, timeouts, avatar upload). Work through it; it is short.

Then **restart Buzz Desktop.** MCP servers are read once at startup, so until you do, your
agents have no tools.

---

## Step 6 — Only if you are creating a *new* client

Joining a client that already exists? Skip this. You need the dataset to exist and the
Drive folder shared with the service account — ask whoever set it up.

Creating one from scratch? Follow
[`nest/GUIDES/CLAIRE_ZERO_TO_RUNNING.md`](../nest/GUIDES/CLAIRE_ZERO_TO_RUNNING.md), then:

```bash
~/.buzz/bin/deploy-claire-channel.sh \
  --slug <slug> \
  --channel-uuid <channel-uuid> \
  --drive-folder <folder-id> \
  --sa-key ~/.buzz/.secrets/claire-<slug>-service-user.json
```

Add `--dry-run` first to validate without changing anything.

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

| Symptom | Cause | Fix |
|---|---|---|
| Bootstrap stops on prerequisites | Missing app or binary | Install what it named, re-run |
| Bootstrap stops on unresolved tokens | Blank values | Fill in `local-values.json`, re-run |
| Your agent has no tools | Buzz not restarted since install | Restart Buzz Desktop |
| A tool is missing entirely | `toolbox` not installed | Step 4a |
| `Access Denied` on your own dataset | Dataset grant missing, or wrong region (must be US) | Check both |
| Janice never says anything | Normal — a clean turn gets no message | Nothing to fix |
| Janice posts to a channel named `{{JANICE_CHANNEL}}` | Nest installed with tokens unresolved | Re-run Step 4 |
| `ISOLATION BROKEN` | Project-level BigQuery role on the service account | Leave only `jobUser`, re-run Step 7 |

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

For prompt changes, ask Fizz — or run the drift check and approve the draft it offers you.
Your agents will not silently rewrite themselves.
