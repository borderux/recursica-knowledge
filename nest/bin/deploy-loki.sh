#!/usr/bin/env bash
#
# Give Loki his sandbox drive, and nothing else, on this machine.
#
# Loki's fence runs the opposite way to every other agent's. Claire's keeps her inside one
# client's data; Loki's keeps what he manufactures OUT of everybody's. The failure to design
# against is not a leak — it is a synthetic transcript landing in a client folder, being
# ingested as research, and surfacing months later in something presented as true.
#
# So this script's real job is the two-directional fence proof, not the config writing.
# LOKI_SANDBOX_SETUP.md step 6 asks an operator to run four preflights by hand and read four
# exit codes, where three of them must FAIL to pass. That is the step most likely to be
# skipped and the only one that establishes the safety property. Here it is a gate: nothing
# is written until it holds.
#
# Usage:
#   deploy-loki.sh --drive-id <0A...> [--sa-key <path>] [--agent loki] [--allow-folder-id]
#
# --drive-id          the shared drive id from LOKI_SANDBOX_SETUP.md step 1 (starts `0A`).
# --sa-key            Loki's service-account key.
#                     Default: ~/.buzz/.secrets/loki-service-user.json
# --agent             the agent name, if you are wiring a second generator the same way.
# --allow-folder-id   accept a My Drive folder id (starts `1`) instead of a shared drive.
#                     Read the warning it prints before using it.
#
# Steps 1 to 3 of LOKI_SANDBOX_SETUP.md are console work and have to be done first.
# Idempotent. Run it again after a node upgrade or moving the checkout.

set -euo pipefail

BUZZ_HOME="${BUZZ_HOME:-$HOME/.buzz}"
ACP_DEFAULT="$HOME/Library/Application Support/Buzz/node-tools/bin/claude-agent-acp"
ACP_BIN="${ACP_BIN:-$([[ -x "$ACP_DEFAULT" ]] && echo "$ACP_DEFAULT" || command -v claude-agent-acp 2>/dev/null || echo "$ACP_DEFAULT")}"

AGENT="loki"
DRIVE_ID=""
SA_KEY=""
ALLOW_FOLDER=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --drive-id)         DRIVE_ID="$2"; shift 2 ;;
    --sa-key)           SA_KEY="$2"; shift 2 ;;
    --agent)            AGENT="$2"; shift 2 ;;
    --allow-folder-id)  ALLOW_FOLDER=1; shift ;;
    -h|--help)          sed -n '2,28p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

SA_KEY="${SA_KEY:-$BUZZ_HOME/.secrets/${AGENT}-service-user.json}"

step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
warn() { printf '  \033[33m!\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# Resolve node once, here, and write the absolute path into the registry. The MCP server is
# spawned by the Claude CLI running under the launcher below, which inherits launchd's PATH
# from Buzz Desktop — /usr/bin:/bin:/usr/sbin:/sbin, which has no node. A registry entry
# reading `"command": "node"` resolves in a terminal and fails under Buzz, and it fails as
# "the agent has no Drive tools" rather than as anything about node.
NODE_BIN="${NODE_BIN:-}"
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(command -v node 2>/dev/null || true)"
fi
if [[ -z "$NODE_BIN" ]]; then
  NODE_BIN="$(ls -d "$HOME/Library/Application Support/Buzz/runtimes/node"/*/*/bin/node 2>/dev/null | tail -1 || true)"
fi
[[ -n "$NODE_BIN" && -x "$NODE_BIN" ]] || die "no node found — pass NODE_BIN=/path/to/node"

PREFLIGHT="$BUZZ_HOME/mcp/drive-fence/preflight.mjs"
SERVER="$BUZZ_HOME/mcp/drive-fence/server.mjs"
[[ -f "$PREFLIGHT" ]] || die "no drive-fence preflight at $PREFLIGHT — run bootstrap-nest.mjs first"
[[ -f "$SERVER" ]] || die "no drive-fence server at $SERVER — run bootstrap-nest.mjs first"

step "Checking the arguments"

[[ -n "$DRIVE_ID" ]] || die "--drive-id is required. It is the part of the drive URL after /folders/
     and comes from LOKI_SANDBOX_SETUP.md step 1, which is console work this script cannot do."

# A shared drive id is short and starts 0A; a My Drive folder id is 33 chars and starts 1.
# The difference is the whole point of step 1: a shared drive lives outside My Drive entirely
# and cannot become a descendant of a client folder by accident. A folder can.
if [[ "$DRIVE_ID" != 0A* ]]; then
  if (( ALLOW_FOLDER )); then
    warn "$DRIVE_ID is not a shared drive id. A My Drive folder can be moved inside a client
    folder later, by anyone with Drive access, and nothing here would notice. You asked for
    this with --allow-folder-id; re-do step 1 as a shared drive when you can."
  else
    die "$DRIVE_ID does not look like a shared drive id (those start \`0A\`).
     LOKI_SANDBOX_SETUP.md step 1 asks for a shared drive on purpose: it lives outside My
     Drive and cannot end up a descendant of a client folder. A folder can, which turns
     Loki's fence into a fake-transcripts-in-client-data incident waiting on one drag.
     Re-do step 1, or pass --allow-folder-id if you have read that and accepted it."
  fi
fi

[[ -f "$SA_KEY" ]] || die "no service-account key at $SA_KEY
     That is LOKI_SANDBOX_SETUP.md step 2, which is console work this script cannot do."

KEY_MODE="$(stat -f '%Lp' "$SA_KEY")"
if [[ "$KEY_MODE" != "600" ]]; then
  chmod 600 "$SA_KEY"
  warn "$SA_KEY was mode $KEY_MODE; tightened to 600"
fi
ok "drive id $DRIVE_ID, key $SA_KEY"
ok "node $NODE_BIN"
# Buzz's bundled node lives under a versioned directory that moves on a Buzz upgrade, and the
# registry written below holds an absolute path to it. Say so here rather than letting it
# surface later as an agent whose Drive tools have silently vanished.
case "$NODE_BIN" in
  *"/Buzz/runtimes/node/"*)
    warn "that node is Buzz's bundled one and its path carries a version. Re-run this script
    after a Buzz upgrade, or the registry points at a node that no longer exists and Loki
    starts with no Drive tools at all." ;;
esac

# ---------------------------------------------------------------------------------------
# The gate. Three of these four checks pass by failing.
# ---------------------------------------------------------------------------------------

# Exit 0 means the key reached the folder. Anything else means it did not. Output is captured
# rather than shown because a 404 here is the expected result three times out of four, and
# printing a stack trace next to a green tick teaches an operator to ignore both.
reaches() {
  local key="$1" folder="$2"
  GOOGLE_APPLICATION_CREDENTIALS="$key" DRIVE_ROOT_FOLDER_ID="$folder" \
    "$NODE_BIN" "$PREFLIGHT" >/dev/null 2>&1
}

step "Preflight — Loki can reach his own drive"

if ! reaches "$SA_KEY" "$DRIVE_ID"; then
  die "Loki's key cannot reach $DRIVE_ID.
     Almost always LOKI_SANDBOX_SETUP.md step 3: the service account has to be added as a
     MEMBER of the shared drive, as Content manager. Your own Drive access grants a service
     account nothing — service accounts are not members of the Workspace domain and inherit
     nothing from it, so that membership is the entire permission.
     Re-run with the output visible to see the error:
       GOOGLE_APPLICATION_CREDENTIALS=$SA_KEY DRIVE_ROOT_FOLDER_ID=$DRIVE_ID $NODE_BIN $PREFLIGHT"
fi
ok "reachable and writable"

step "Proving the fence in both directions"

# The client folder ids come from the drive-* servers in the user-scope registry, which is
# where every client fence on this machine is already recorded. Reading them beats asking the
# operator to type ids: the set this proves against is then exactly the set of clients that
# exist, and it grows on its own as clients are added.
# Collected into a temp file rather than an array: macOS ships bash 3.2, which has no
# `mapfile`, and this script is run by whatever `/usr/bin/env bash` finds — on a stock Mac
# that is 3.2. A bash-4 builtin here fails as "mapfile: command not found" in the middle of
# a security gate, which under `set -e` aborts before anything is written but reads as a
# broken script rather than as a fence that was never checked.
FENCE_LIST="$(mktemp -t deploy-loki-fences)"
trap 'rm -f "$FENCE_LIST"' EXIT

"$NODE_BIN" -e '
    const fs = require("fs"), os = require("os"), path = require("path");
    const self = process.argv[1];
    let reg = {};
    try { reg = JSON.parse(fs.readFileSync(path.join(os.homedir(), ".claude.json"), "utf8")); } catch {}
    for (const [name, s] of Object.entries(reg.mcpServers || {})) {
      const id = (s.env || {}).DRIVE_ROOT_FOLDER_ID;
      const key = (s.env || {}).GOOGLE_APPLICATION_CREDENTIALS;
      if (!id || id === self) continue;
      console.log([name, id, key || ""].join("\t"));
    }
  ' "$DRIVE_ID" > "$FENCE_LIST"

FENCE_COUNT="$(wc -l < "$FENCE_LIST" | tr -d ' ')"

if [[ "$FENCE_COUNT" == "0" ]]; then
  warn "no other fenced Drive servers in ~/.claude.json, so there is nothing on this machine
    to prove separation against. That is not a pass — it is an untested fence. Re-run this
    script after the first client is deployed."
else
  FAILURES=0
  while IFS=$'\t' read -r cname cfolder ckey; do
    [[ -n "$cname" ]] || continue

    # Direction 1: Loki must not reach a client. A success here means Loki's account was
    # shared onto a client folder — remove it there, not here.
    if reaches "$SA_KEY" "$cfolder"; then
      printf '  \033[31m✗\033[0m %s\n' "Loki's key CAN reach $cname ($cfolder)"
      printf '    %s\n' "Remove loki-service-user from that folder's sharing in Drive."
      FAILURES=$((FAILURES + 1))
    else
      ok "Loki cannot reach $cname"
    fi

    # Direction 2: a client must not reach Loki. A success here means Loki's drive sits
    # inside a client folder, or was shared to that account — fix the location.
    if [[ -z "$ckey" ]]; then
      warn "$cname has no key path in the registry; skipped the reverse check"
    elif [[ ! -f "$ckey" ]]; then
      warn "$cname key $ckey is missing; skipped the reverse check"
    elif reaches "$ckey" "$DRIVE_ID"; then
      printf '  \033[31m✗\033[0m %s\n' "$cname's key CAN reach Loki's drive"
      printf '    %s\n' "Loki's drive is inside a client folder, or was shared to that account."
      FAILURES=$((FAILURES + 1))
    else
      ok "$cname cannot reach Loki's drive"
    fi
    # The counter has to survive the loop, so the loop cannot be a pipeline — a `while read`
    # on the right of a pipe runs in a subshell and FAILURES comes back 0, which turns this
    # gate into a green tick over a real violation. Redirect from the file instead.
    echo "$FAILURES" > "$FENCE_LIST.failures"
  done < "$FENCE_LIST"
  FAILURES="$(cat "$FENCE_LIST.failures" 2>/dev/null || echo "$FAILURES")"
  rm -f "$FENCE_LIST.failures"
  (( FAILURES == 0 )) || die "$FAILURES fence violation(s) above. Nothing was written.
     Fix them in Drive and re-run — a Loki registered through a hole in this fence is the
     one failure mode the whole sandbox exists to prevent."
fi

step "Writing ${AGENT}'s config directory"

FENCE_DIR="$BUZZ_HOME/proxy"
FENCE_AGENT="$FENCE_DIR/claude-config-${AGENT}"
mkdir -p "$FENCE_AGENT"

"$NODE_BIN" -e '
  const fs = require("fs"), path = require("path");
  const [dir, nodeBin, server, key, driveId, label] = process.argv.slice(1);

  // Re-runs are expected. A login writes its account block into this same file, so keep
  // whatever is here and replace only mcpServers — a wholesale overwrite would throw the
  // login away and send the operator back round a browser round-trip they just finished.
  //
  // Nothing is ever carried IN from ~/.claude.json. That file holds every client on this
  // machine, which is what this directory exists to keep out.
  const file = path.join(dir, ".claude.json");
  let existing = {};
  try { existing = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
  delete existing.mcpServers;

  fs.writeFileSync(file, JSON.stringify({
    ...existing,
    hasCompletedOnboarding: true,
    mcpServers: {
      "drive-loki": {
        type: "stdio",
        command: nodeBin,
        args: [server],
        env: {
          GOOGLE_APPLICATION_CREDENTIALS: key,
          DRIVE_ROOT_FOLDER_ID: driveId,
          DRIVE_FENCE_LABEL: label,
        },
      },
    },
  }, null, 2) + "\n");

  // The claude.ai connectors ride on the account login rather than on this registry, and the
  // Google Drive one is unfenced — it reads and creates files anywhere in your Drive. So the
  // isolated registry on its own is defeated by the one server nobody registered, and for
  // Loki that means fake transcripts writable straight into a client folder.
  fs.writeFileSync(path.join(dir, "settings.json"),
    JSON.stringify({ disableClaudeAiConnectors: true }, null, 2) + "\n");
' "$FENCE_AGENT" "$NODE_BIN" "$SERVER" "$SA_KEY" "$DRIVE_ID" "$AGENT"

ok "wrote $FENCE_AGENT/.claude.json (1 server: drive-loki)"
ok "wrote $FENCE_AGENT/settings.json (claude.ai connectors off)"

step "Writing the launcher"

LAUNCHER="$FENCE_DIR/agent-${AGENT}.sh"
cat > "$LAUNCHER" <<LAUNCHEREOF
#!/bin/sh
# ${AGENT}: his own sandbox drive and nothing else.
#
# In Buzz Desktop, set this agent's runtime to "claude" and its AGENT COMMAND to this
# path — both in the SAME save. Runtime alone, saved first, is the unfenced state: the
# agent starts, reads the user-scope registry in ~/.claude.json, and holds every client
# on this machine. For Loki that is write access to client research folders, by an agent
# whose entire output is fabricated. That window is the whole risk, and it is a save
# apart from safety.
#
# Buzz Desktop has no field for an MCP server list. Its per-agent env_vars field is
# documented but does not exist on every build — checked 2026-09-17, managed-agents.json
# has no env key of any kind, and the only env store is global to all agents at once, so
# it cannot fence one. The agent's *command* is the hook that holds, because the script it
# names runs last and is the final writer of its environment.

set -eu

export CLAUDE_CONFIG_DIR="${FENCE_AGENT}"

# Optional, and absent on most machines: an operator running the agents against a local or
# self-hosted model keeps the ANTHROPIC_* variables here.
#
# Written as an if rather than \`[ -f x ] && . x\`, which under \`set -e\` is a list whose
# status is 1 when the file is absent — that exits before exec, so every machine WITHOUT
# the optional file would fail to start the agent at all.
if [ -f "${FENCE_DIR}/model-env.sh" ]; then
  . "${FENCE_DIR}/model-env.sh"
fi

# Buzz Desktop is a GUI app: it inherits launchd's PATH (/usr/bin:/bin:/usr/sbin:/sbin),
# which holds neither node nor the Claude CLI. The adapter is a .js file whose shebang is
# \`#!/usr/bin/env node\`, so exec'ing it directly under that PATH dies with
# "env: node: No such file or directory" before the agent ever starts. That reaches the
# operator as an agent that simply will not come up, with nothing about node anywhere near
# it — so run the adapter under a node resolved here instead.
NODE_FOR_ACP=\$(ls -d "\$HOME/Library/Application Support/Buzz/runtimes/node"/*/*/bin/node 2>/dev/null | tail -1)
[ -n "\$NODE_FOR_ACP" ] || NODE_FOR_ACP=\$(command -v node 2>/dev/null || true)
if [ -z "\$NODE_FOR_ACP" ]; then
  echo "agent-${AGENT}.sh: no node — neither a bundled runtime under ~/Library/Application Support/Buzz/runtimes/node nor one on PATH" >&2
  exit 127
fi

PATH="\$HOME/.local/bin:\$PATH"
export PATH

exec "\$NODE_FOR_ACP" "${ACP_BIN}" "\$@"
LAUNCHEREOF
chmod 755 "$LAUNCHER"
ok "wrote $LAUNCHER"

step "Proving the launcher starts in the environment Buzz gives it"

# Not a formality. Every launcher here is only ever exercised by a GUI parent, while the
# operator writing it has node and ~/.local/bin on PATH — so testing it from a terminal
# proves nothing about the environment it actually runs in.
LAUNCHER_VERSION="$(env -i HOME="$HOME" PATH=/usr/bin:/bin:/usr/sbin:/sbin "$LAUNCHER" --version 2>&1 | tail -1 || true)"
case "$LAUNCHER_VERSION" in
  *[0-9].[0-9]*) ok "launcher runs under launchd's PATH (adapter $LAUNCHER_VERSION)" ;;
  *) die "the launcher does not start under launchd's PATH, which is the only PATH Buzz will
     give it: ${LAUNCHER_VERSION:-no output}
     Reproduce with:
       env -i HOME=\$HOME PATH=/usr/bin:/bin:/usr/sbin:/sbin $LAUNCHER --version" ;;
esac

step "Done — three things left, all manual"

cat <<EOF

  1. In Buzz Desktop, open ${AGENT} and set, in one save:

       runtime         claude
       agent command   ${LAUNCHER}

     The agent command is the fence. LOKI_SANDBOX_SETUP.md step 7 names a per-agent
     environment-variable field instead; on a build that has no such field there is nothing
     to set, and an agent saved without either is not fenced — it reads the user-scope
     registry in ~/.claude.json, which on this machine holds every client's Drive and
     BigQuery server. It looks entirely normal from the outside.

  2. Log in inside the fence. A config directory is its own account: the credential lives
     in the login keychain under an entry keyed to this directory, so a freshly written
     fence is correctly isolated and signed out. Nothing this script writes can change
     that — a login has to mint it.

       CLAUDE_CONFIG_DIR=${FENCE_AGENT} claude auth login

     Do this BEFORE saving the agent command, or his first turns answer
     \`Authentication required\` and the instinct is to undo the isolation.

  3. Restart him. A configuration change never reaches a running process.

  Then verify from the process, not by asking him — a model will describe a fence it does
  not have. Select on BUZZ_ACP_DISPLAY_NAME: the system prompt is not in the process
  environment, so matching "You are Loki" there never matches anything. The loop says
  NO FENCE out loud, because a loop that prints nothing reads as a pass:

    for pid in \$(pgrep -f claude-agent-acp); do
      ps eww -p \$pid | tr ' ' '\n' | grep -qi '^BUZZ_ACP_DISPLAY_NAME=${AGENT}' || continue
      ps eww -p \$pid | tr ' ' '\n' | grep '^CLAUDE_CONFIG_DIR=' || echo "pid \$pid: NO FENCE"
    done
    grep firstStartTime ${FENCE_AGENT}/.claude.json
    CLAUDE_CONFIG_DIR=${FENCE_AGENT} claude auth status

  The second is the stronger check for the fence: that key is written by his own session,
  so it is evidence the file was read, where the file existing is only evidence somebody
  wrote it.

  One last thing that is his prompt's job and not this script's: every document Loki
  writes carries a synthetic banner in its own first lines. The \`Loki_\` folder prefix does
  not survive a document being dragged out of the folder; the banner does. Do not edit it
  out to make a demo look tidier.

EOF
