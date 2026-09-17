# A new client, start to finish

One community per client. The community boundary is the fence — an agent that is not in a
client's community cannot be asked anything about that client, whatever its file permissions
say.

This is the whole path, in order, with the verification for each step. Do the steps in this
order: several of them are safe only because of the one before.

> **Why one community per client.** Measured on a working machine: 15 of 16 agents were
> running in all four communities, so every client's agents were present in three communities
> that were not their client. Per-file fences stopped them reading anything; nothing stopped
> them being there, answering, and spawning a process each. One community per client took 61
> agent processes to roughly 16, and removed the trap where saving an agent's config restarts
> it in one community and leaves stale copies running in the rest.

---

## Before you start

You need, for this client:

- their **slug** — short, lowercase, hyphens
- their **BigQuery dataset** and **cloud project**
- their **Drive folder id**
- their **service-account key**, already on this Mac under `~/.buzz/.secrets/`
- the **tag sheet id**, if they are using the shared taxonomy

If you are missing one, get it before you start rather than half-way through. A community
created and left half-configured looks identical to one that is finished.

---

## Step 1 — Create the community

In Buzz Desktop. There is no CLI for this.

Name it for the client. Note the relay URL it gives you — every command below takes it as
`--relay`, and the rest of this file assumes you have it to hand.

## Step 2 — Say which client it is

One command, and it is what everything else reads:

```bash
buzz --relay <relay> notes set --name client-config --title "Client configuration" --content - <<'EOF'
## client: <slug>

- slug: <slug>
- bq_project: <project>
- bq_dataset: <dataset>
- drive_folder: <folder id>
- tag_sheet: <sheet id>
EOF
```

**This is readable by everyone in the community.** It carries names and ids, never a key —
the same rule the channel canvas has always had, but a wider audience than a channel. If that
is not acceptable for a given client, keep their settings on the channel instead; the old
whole-block form still works and still wins.

Check it:

```bash
~/.buzz/bin/client-config.mjs resolve --channel <any channel here>
```

Once this note exists, every channel in the community resolves to this client and no channel
needs to repeat any of it. A channel that must stay out of client data says so explicitly:

```markdown
## Claire config
- client: none
```

## Step 3 — Create the working channels

```bash
buzz --relay <relay> channels create --name transcripts
```

Nothing else is needed on them. That is the point of Step 2.

## Step 4 — Build the fence directory

`GUIDES/PER_CLIENT_AGENT_FENCE.md` has the recipe. One directory per client, holding only
that client's connectors, that client's subagents, and a sandbox that denies every other
client's paths.

Verify it before any agent uses it, with a manifest built **outside** the fence:

```bash
~/.buzz/bin/verify-agent-fence.sh <manifest>
```

**An all-BLOCKED result is not a pass.** The manifest must contain at least one path that
must be readable — this client's own key. The first build of this put the re-allow in the
wrong settings block, and the agent's own key came back blocked along with everyone else's.
The output looked more secure, not less.

## Step 5 — Join this client's agents, and only theirs

In Buzz Desktop, for each agent this client needs:

1. join it to this community
2. set `runtime: claude` **and** `CLAUDE_CONFIG_DIR` to the directory from Step 4 —
   **in the same save**

Splitting those two matters. An agent that comes up on the `claude` runtime without its
config dir is briefly holding every client's connectors.

Then **remove every other client's agents from this community.** An agent belonging to another
client should leave, not be fenced harder — its own client's community is where it runs.

## Step 6 — Restart Buzz Desktop

Quit and reopen it. Saving a config restarts the agent only on the community you were standing
in; every other community keeps running the old environment indefinitely.

## Step 7 — Prove it, three ways

```bash
~/.buzz/bin/verify-client-community.mjs --relay <relay>
```

Wants: one client, and only its agents. It reads the **running processes**, because an agent's
presence in a community is invisible in Buzz Desktop and invisible in the config files.

```bash
~/.buzz/bin/check-agent-fence-live.sh "<agent name>"
```

Wants: every process for that agent carrying the config dir. This is the check that catches
Step 6 not having happened.

Then **send the agent a message in its own channel.** A fresh config directory is signed out,
and that only shows on the first real turn — the agent starts clean, reports nothing wrong,
and fails every turn with an authentication error. If that happens, once, in a terminal:

```bash
CLAUDE_CONFIG_DIR=<the directory> claude
```

then `/login`, then `/exit`.

---

## What this does not do

- **Existing history does not move.** A new community is a fresh space; messages and channels
  stay where they are. Data in BigQuery and Drive is untouched.
- **Channel ids change**, so anything that points at a channel by id — Janice's routing above
  all — has to be re-pointed.
- **It does not create the Google side.** Dataset, folder and service account are console work
  and deliberately need permissions these agents do not have.

## When it looks wrong

| What you see | What it usually is |
|---|---|
| `verify-client-community` reports another client's agent | It was joined here before the split. Remove it in Desktop — do not try to fence around it |
| `verify-client-community` reports an unfenced agent | Its config dir was set without the runtime flip, or Desktop was not restarted |
| The agent answers nothing, with a spinner | Signed-out config directory. Step 7, last part |
| `client-config resolve` says the community and channel disagree | One of them names a different client. Do not pick — find out which is right |
| `client-config resolve` exits 3 in a client community | The note is missing, or that channel opted out |
