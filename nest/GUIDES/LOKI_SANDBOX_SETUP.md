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

Nine steps, about 20 minutes. Steps 1–3 are console work, the rest is local.

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

## Step 4 — Preflight

Proves the account can reach the drive before anything is registered.

```bash
GOOGLE_APPLICATION_CREDENTIALS=~/.buzz/.secrets/loki-service-user.json \
DRIVE_ROOT_FOLDER_ID=<loki-drive-id> \
node ~/.buzz/mcp/drive-fence/preflight.mjs
```

Exit 0 means reachable and writable. A 404 means step 3 was missed, or the id is wrong.

Preflight insists the id resolves to `application/vnd.google-apps.folder`. A shared drive root
normally reports exactly that. If yours reports `application/vnd.google-apps.drive` instead, that
is a preflight limitation and not a broken fence — confirm access by hand, then widen the check
rather than working around it.

## Step 5 — Register the MCP server

```bash
claude mcp add-json --scope user drive-loki '{
  "type": "stdio",
  "command": "node",
  "args": ["/Users/<you>/.buzz/mcp/drive-fence/server.mjs"],
  "env": {
    "GOOGLE_APPLICATION_CREDENTIALS": "/Users/<you>/.buzz/.secrets/loki-service-user.json",
    "DRIVE_ROOT_FOLDER_ID": "<loki-drive-id>",
    "DRIVE_FENCE_LABEL": "loki"
  }
}'
```

Absolute paths — the server is launched by Buzz, not by your shell, and `~` will not expand.

Verify: `claude mcp list | grep drive-loki`

Register it in **Loki's own config directory** (step 7), not the shared one. A `drive-loki` in the
shared registry is readable by every other agent on the machine, and a fake transcript another
agent can read is a fake transcript something will eventually treat as a finding.

## Step 6 — Prove the fence in both directions

Two checks, and both matter:

1. **Loki cannot reach a client.** Run preflight again with the Loki key and a *client* folder
   id. It must **fail**. If it succeeds, the Loki account was shared onto a client folder —
   remove it.
2. **A client cannot reach Loki.** Run preflight with a *client* key and the Loki drive id. It
   must **fail**. If it succeeds, the Loki drive is inside a client folder or was shared to that
   account — fix the location.

Only after both fail as expected should Loki generate anything.

## Step 7 — Make the client servers absent, not merely forbidden

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

`CLAUDE_CONFIG_DIR`, which Buzz does not set. It relocates the whole user-scope Claude config:
the MCP registry, the settings file, and the credential lookup.

```
~/.buzz/.loki-claude/
  .claude.json         registry — drive-loki only
  .credentials.json    mode 600, see the trade-off below
  settings.json        disableClaudeAiConnectors: true
```

Set on the Loki agent in Buzz Desktop, under environment variables:

```
CLAUDE_CONFIG_DIR = /Users/<you>/.buzz/.loki-claude
```

**The credential file is the price.** Claude reads the macOS Keychain only when the config dir is
the default one, so an isolated dir comes up `Not logged in` until the token is written to
`.credentials.json`. That moves the token from the Keychain to a file any process running as you
can read. Bounded — every agent on the machine already authenticates with that same token — but a
real downgrade, and the operator's call to make, not the agent's.

**`disableClaudeAiConnectors` is not optional here.** The isolated registry removes the local
client servers, but the claude.ai Google Drive connector rides on the account login rather than
the MCP registry, and it is **unfenced** — it reads and creates files anywhere in your Drive.
Without that setting the whole exercise is defeated by the one server nobody registered.

## Step 8 — Verify the isolation from outside

`claude mcp list` is the wrong test. It reads the registry files directly and reports every
server even through a correctly isolated config.

Ask a **session**, and ask about connectors explicitly or it will not mention them:

```bash
CLAUDE_CONFIG_DIR=~/.buzz/.loki-claude \
  claude -p "List every MCP server you can see, including claude.ai connectors." < /dev/null
# -> drive-loki

claude -p "List every MCP server you can see, including claude.ai connectors." < /dev/null
# -> everything, unchanged for every other agent
```

Then verify the **live** agent by reading its process environment rather than asking it what it
can see:

```bash
for pid in $(pgrep -f "MacOS/buzz-acp"); do
  ps eww -p $pid | grep -q "You are Loki" && ps eww -p $pid | tr " " "\n" | grep "^CLAUDE_CONFIG_DIR="
done
```

## Step 9 — Install the agent

Loki is in `buzz-agents/agents/loki/`, and `restore-agents.mjs` installs him with the rest. The
env var from step 7 has no CLI flag, so it arrives as a `MANUAL` step to set in Buzz Desktop —
**and it is the fence.** An agent saved without it starts fine and sees every client on the
machine.

Set it, restart the agent, and re-run step 8 before asking him for anything.

---

## Why the synthetic marker is not just the folder name

The `Loki_` prefix lives on the folder. A document dragged out of that folder keeps none of it.
So every document Loki writes carries a synthetic banner in its own first lines — that is what
survives a copy into a client folder, and it is the last line of defence against fake research
being read as real. It is in his prompt; do not edit it out to make a demo look tidier.

## The workaround this replaces

The isolation above rests on a config-directory variable that Buzz happens not to overwrite, and
it puts the operator's token on disk. The real fix is a per-agent MCP allowlist in Buzz itself, so
a fenced agent is configuration rather than a relocated config directory. Until that ships, steps
7–9 are how this holds — and the same gap applies to every agent on the platform, not just Loki.
