# Loki — sandbox setup

Loki manufactures fake interview transcripts so the pipeline can be tested and demoed without
touching a real participant's words. He writes into **his own shared drive** and has **no
BigQuery access at all**.

The fence here runs the opposite way to every other agent's. Claire's keeps her inside one
client's data; Loki's keeps what he makes **out** of everybody's. The failure to design against
is not a leak — it is a synthetic transcript landing in a client folder, being ingested as
research, and surfacing months later in something presented as true.

This is deliberately **not** `deploy-claire-channel.sh`. That script creates a BigQuery dataset
and four ingest subagents Loki has no use for.

Three console steps, then one command. Steps 1–3 are work in the Google console that no
script here can do; step 4 is `deploy-loki.sh`, which refuses to write anything until
the fence holds in both directions. About 20 minutes, most of it waiting on the console.

---

## Step 1 — Create the Drive location

A **Shared Drive** named `Loki`. Its id is the part of the URL after `/folders/`.

A shared drive id is short and starts `0A`; a My Drive folder id is 33 characters and starts `1`.
That difference is not cosmetic — it changes step 3.

**Use a shared drive, not a folder.** A shared drive lives outside My Drive entirely and cannot
end up a descendant of a client folder by accident. A folder can.

The fence server handles shared drives already: it passes `supportsAllDrives`,
`includeItemsFromAllDrives` and `corpora: allDrives` on every call, and its ancestry walk
terminates at the drive root, whose id **is** the drive id.

That id is `<loki-drive-id>` in the commands below — substitute it by hand. Bootstrap does not
fill it in, deliberately: the drive does not exist until you have done this step, so an installer
run earlier had nothing to supply.

## Step 2 — Create the service account

Cloud console → **IAM & Admin → Service Accounts → Create service account**

- **Name:** `loki-service-user`
- **Grant this service account access to project:** **skip it.** Leave the roles step empty and
  click Continue. Loki touches no Google Cloud resource — his only permission comes from the
  Drive membership in step 3.
- **Grant users access:** skip.

Then **Keys → Add key → Create new key → JSON**. It downloads once.

```bash
mv ~/Downloads/<downloaded>.json ~/.buzz/.secrets/loki-service-user.json
chmod 600 ~/.buzz/.secrets/loki-service-user.json
```

## Step 3 — Add it as a member of the shared drive

Copy the service account email from the console — it ends `.iam.gserviceaccount.com`.

Because this is a **shared drive** and not a folder, the account is added as a **member of the
drive**, not given a file share:

Drive → **Shared drives → Loki** → the drive name at the top → **Manage members** → paste the
email → **Content manager** → uncheck "Notify people" → Send.

**Content manager**, not Viewer or Commenter — Loki creates folders and documents. Not
**Manager** either; that would let the account change the drive's own membership, which it never
needs.

A person's Drive access grants a service account nothing. Service accounts are not members of
the Workspace domain and inherit nothing from it — this membership is the whole permission.

Add this account to **no client folder and no other drive**, ever.

## Step 4 — Everything local, in one command

```bash
~/.buzz/bin/deploy-loki.sh --drive-id <loki-drive-id>
```

That does the preflight, proves the fence in **both** directions, writes Loki's own Claude
config directory with `drive-loki` as its only server, turns the claude.ai connectors off, and
writes the launcher that step 5 needs. It writes nothing until every check passes, and it is
idempotent — re-run it after a Buzz upgrade or after moving the checkout.

Run `--help` for the arguments. The two worth knowing:

- It **refuses an id that does not start `0A`**, because that is a My Drive folder and not a
  shared drive, and a folder can be dragged inside a client folder later by anyone with Drive
  access. `--allow-folder-id` overrides it; read what it prints first.
- It tightens the key file to mode 600 if it is not already.

### What it is actually checking, and why that is the whole step

Four preflights, and **three of them pass by failing**:

| Key | Folder | Must |
| --- | --- | --- |
| Loki | Loki's drive | **succeed** — otherwise step 3 was missed |
| Loki | each client folder | **fail** — a success means Loki's account was shared onto a client folder; remove it there |
| each client | Loki's drive | **fail** — a success means Loki's drive sits inside a client folder, or was shared to that account |

This was four commands and four exit codes to read by hand, where a green result and a red one
look the same at a glance and the red ones are the passes. It is now a gate. The client folders
come from the `drive-*` servers in `~/.claude.json`, so the set it proves against is exactly the
set of clients on the machine and grows on its own as clients are added.

If there are **no** other fenced Drive servers yet, the script says so and carries on. That is
not a pass — it is an untested fence. Re-run after the first client is deployed.

A shared-drive id normally resolves to `application/vnd.google-apps.folder`, which is what
preflight insists on. If yours reports `application/vnd.google-apps.drive` instead, that is a
preflight limitation and not a broken fence — confirm access by hand, then widen the check
rather than working around it.

### Why the registry is not `claude mcp add`

An earlier version of this guide had you run `claude mcp add-json --scope user drive-loki`, and
then told you two paragraphs later to register it in Loki's own config directory and not the
shared one. Those instructions contradict each other: `--scope user` **is** the shared registry.
Following the command literally puts `drive-loki` in `~/.claude.json`, where every other agent
on the machine can read it — and a fake transcript that another agent can read is a fake
transcript something will eventually treat as a finding. The script writes the fenced directory
directly and never touches the user registry.

`claude mcp list` is also the wrong way to check afterwards; see step 6.

## Step 5 — Make the client servers absent, not merely forbidden

`claude mcp add --scope user` registers per machine, so by default every agent session on this
Mac sees every client's Drive and BigQuery server. Loki's prompt tells him not to touch them.
Nothing stops him.

Three approaches were tried. Two fail in ways that look like success, so both are recorded rather
than deleted.

**`agent_args` does nothing.** Buzz passes it to `claude-agent-acp`, whose entrypoint drops every
argument except `--cli` and `--version` before calling `runAcp()`. So `--disallowed-tools` never
reaches the CLI, and nothing complains.

**`CLAUDE_CODE_EXECUTABLE` is overwritten.** Buzz sets it for every agent, *after* per-agent
config, so a per-agent value silently loses. Confirmed by reading the running agent's process
environment — not by asking the agent.

### What works

`CLAUDE_CONFIG_DIR`, which Buzz does not set. It relocates the whole user-scope Claude config —
the MCP registry, the settings file, and the credential lookup — so the client servers become
**absent** rather than merely forbidden.

`deploy-loki.sh` has already written it, at the path the other fenced agents on this machine
use:

```
~/.buzz/proxy/claude-config-loki/
  .claude.json     registry — drive-loki only
  settings.json    disableClaudeAiConnectors: true
~/.buzz/proxy/agent-loki.sh   the launcher that exports the variable
```

**The variable is the mechanism. The question is which Buzz field can set it**, and the answer
differs by build — so check before you trust either:

```bash
python3 -c "import json;d=json.load(open('$HOME/Library/Application Support/xyz.block.buzz.app/agents/managed-agents.json'));print(sorted({k for a in d for k in a}))"
```

- **An `env_vars` (or similar) key in that list** — set `CLAUDE_CONFIG_DIR` on the Loki agent in
  Buzz Desktop under environment variables.
- **No env key at all** — and this is the case on the machine these guides were written on,
  checked 2026-09-17 — there is no per-agent environment field to set. The only env store is
  `agents/global-agent-config.json`, whose `env_vars` apply to **every** agent at once, so it
  cannot fence one. Set the agent's **agent command** to the launcher instead:

  ```
  runtime         claude
  agent command   /Users/<you>/.buzz/proxy/agent-loki.sh
  ```

  `agent_command` is persisted per agent, and the script it names runs last, so it is the final
  writer of the environment. Set both where both exist; the launcher wins.

**Set the runtime and the fence in the same save.** Runtime alone, saved first, is the unfenced
state: he starts, reads `~/.claude.json`, and holds every client's Drive and BigQuery server on
the machine. For Loki specifically that is write access to client research folders, by an agent
whose entire output is fabricated. And it looks completely normal from the outside.

**Then log in inside the fence, before you save the command.**

```bash
CLAUDE_CONFIG_DIR=~/.buzz/proxy/claude-config-loki claude auth login
```

A config directory is its own account. There is one `Claude Code-credentials` keychain entry on
this machine and it belongs to the default directory, so a freshly written fence is correctly
isolated and **signed out** — `claude auth status` against it returns `"loggedIn": false`, and
nothing `deploy-loki.sh` writes can change that. Every turn answers `Authentication required`
until a login mints a credential for this directory.

That failure is worth naming because the instinct on seeing it is to undo the isolation, which is
exactly backwards. It also means an agent pointed at a fence nobody logged into is *visibly*
broken rather than quietly unfenced — the better of the two failures, and the reason to do the
login first rather than after.

**`disableClaudeAiConnectors` is not optional here.** The isolated registry removes the local
client servers, but the claude.ai Google Drive connector rides on the account login rather than
the MCP registry, and it is **unfenced** — it reads and creates files anywhere in your Drive.
Without that setting the whole exercise is defeated by the one server nobody registered.

## Step 6 — Verify the isolation from outside

`claude mcp list` is the wrong test. It reads the registry files directly and reports every
server even through a correctly isolated config.

Ask a **session**, and ask about connectors explicitly or it will not mention them:

```bash
CLAUDE_CONFIG_DIR=~/.buzz/proxy/claude-config-loki \
  claude -p "List every MCP server you can see, including claude.ai connectors." < /dev/null
# -> drive-loki

claude -p "List every MCP server you can see, including claude.ai connectors." < /dev/null
# -> everything, unchanged for every other agent
```

Then verify the **live** agent by reading its process environment rather than asking it what it
can see — a model will describe a fence it does not have:

```bash
for pid in $(pgrep -f claude-agent-acp); do
  ps eww -p "$pid" | tr ' ' '\n' | grep -q '^BUZZ_ACP_DISPLAY_NAME=Loki' || continue
  ps eww -p "$pid" | tr ' ' '\n' | grep '^CLAUDE_CONFIG_DIR=' || echo "pid $pid: NO FENCE"
done
```

Two things about that loop are easy to get wrong, and both fail silently:

- **`claude-agent-acp`, not `MacOS/buzz-acp`.** Both processes exist on a machine running Buzz
  and they are different: `buzz-acp` is the supervisor, and it spawns the agent command, which
  for a fenced agent is the launcher, which execs `claude-agent-acp`. The variable is exported
  by the launcher, so it appears on the adapter and not on the supervisor.
- **Select on `BUZZ_ACP_DISPLAY_NAME`, not on the prompt.** An earlier version of this step
  matched `ps eww` output against `"You are Loki"`. The system prompt is **not** in the process
  environment — checked 2026-09-17, `ps eww` for a running agent contains no part of it — so
  that grep matches nothing for every agent, and a loop that prints nothing reads as "fine".
  Match the display name prefix; Buzz injects the owner into the name, so `Loki (You)` has to
  match as a prefix rather than exactly.

The `|| echo "pid $pid: NO FENCE"` matters for the same reason. Without it, the one output that
means *the fence is missing* is no output at all, which is indistinguishable from the agent not
running.

Two cheaper checks worth having as well:

```bash
grep firstStartTime ~/.buzz/proxy/claude-config-loki/.claude.json
CLAUDE_CONFIG_DIR=~/.buzz/proxy/claude-config-loki claude auth status
```

The first is the stronger evidence for the fence: that key is written by his own session, so it
is proof the file was **read**, where the file existing is only proof somebody wrote it. The
second is the login — `"loggedIn": true`, or step 5's login has not been done.

## Step 7 — Install the agent

Loki is in `buzz-agents/agents/loki/`, and `restore-agents.mjs` installs him with the rest:

```bash
node buzz-agents/scripts/restore-agents.mjs --channel <uuid> --agent loki --run
```

His prompt carries no `{{TOKEN}}` markers, so he needs no values file — unlike Claire and Stu,
he is the same on every install.

**Do this step last, and do steps 1 to 5 first.** The fence from step 5 has no CLI flag, so it
arrives as a `MANUAL` step to set in Buzz Desktop — **and it is the fence.** An agent saved
without it starts fine and sees every client on the machine. A draft that sits unsaved is safe;
a Loki saved before his drive exists is the failure this entire guide is written to prevent.

Set the fence, log in inside it, restart the agent, and re-run step 6 before asking him for
anything.

---

## Why the synthetic marker is not just the folder name

The `Loki_` prefix lives on the folder. A document dragged out of that folder keeps none of it.
So every document Loki writes carries a synthetic banner in its own first lines — that is what
survives a copy into a client folder, and it is the last line of defence against fake research
being read as real. It is in his prompt; do not edit it out to make a demo look tidier.

## The workaround this replaces

The isolation above rests on a config-directory variable that Buzz happens not to overwrite, set
through whichever per-agent field this build of Buzz Desktop actually has — and on a build with
no env field at all, through the agent's *command*, which means the fence is a shell script on
disk that an operator has to paste a path to by hand. It also costs a second login.

The real fix is a per-agent MCP allowlist in Buzz itself, so a fenced agent is configuration
rather than a relocated config directory. Until that ships, steps 5–7 are how this holds — and
the same gap applies to every agent on the platform, not just Loki. The gap is not theoretical:
on the machine these guides were written on, every agent's `agent_command` is the bare adapter
and no agent has ever held a launcher path, so every fence documented here is currently a
description of one.
