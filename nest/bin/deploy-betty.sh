#!/usr/bin/env bash
#
# Give Betty her knowledge server, and nothing else, on this machine.
#
# Betty is client-independent: one identity serves every client, because she holds no
# client data of her own and reaches research through Claire instead. This script is what
# makes that true rather than aspirational. It writes her a Claude config directory whose
# MCP registry contains exactly one server — the knowledge server, which reads a public
# repository and needs no credentials — and a launcher that points her at it.
#
# So her fence is a stronger claim than a per-client fence: not "one client's data" but
# "no client's data". The registry is the evidence. Anything that reaches client data has
# to get there some other way, which is what the two warnings below are about.
#
# Usage:
#   deploy-betty.sh [--knowledge-repo <path>] [--agent betty]
#
# --knowledge-repo  the recursica-knowledge checkout whose skills she should serve.
#                   Defaults to the checkout this script was run from.
# --agent           the agent name, if you are wiring a second builder the same way.
#
# Idempotent. Run it again after moving the checkout.

set -euo pipefail

BUZZ_HOME="${BUZZ_HOME:-$HOME/.buzz}"
NODE_BIN="${NODE_BIN:-$(command -v node 2>/dev/null || echo /usr/local/bin/node)}"
# `claude-agent-acp`, not `buzz-acp`. Both exist on a machine with Buzz Desktop installed and
# they are different binaries; every launcher already on this Mac execs the first. An earlier
# draft of this script preferred the second, which resolves and starts and is simply the wrong
# process to hand a Claude-runtime agent.
ACP_DEFAULT="$HOME/Library/Application Support/Buzz/node-tools/bin/claude-agent-acp"
ACP_BIN="${ACP_BIN:-$([[ -x "$ACP_DEFAULT" ]] && echo "$ACP_DEFAULT" || command -v claude-agent-acp 2>/dev/null || echo "$ACP_DEFAULT")}"

AGENT="betty"
KNOWLEDGE_REPO=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --knowledge-repo) KNOWLEDGE_REPO="$2"; shift 2 ;;
    --agent)          AGENT="$2"; shift 2 ;;
    -h|--help)        sed -n '2,22p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "unknown argument: $1" >&2; exit 2 ;;
  esac
done

step() { printf '\n\033[1m%s\033[0m\n' "$*"; }
ok()   { printf '  \033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '  \033[31m✗\033[0m %s\n' "$*" >&2; exit 1; }

# Default to the checkout this script lives in, which is right whenever it is run from
# there and wrong in a way that is immediately visible when it is not.
if [[ -z "$KNOWLEDGE_REPO" ]]; then
  KNOWLEDGE_REPO="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
fi
KNOWLEDGE_REPO="$(cd "$KNOWLEDGE_REPO" && pwd)"

SERVER="$KNOWLEDGE_REPO/nest/mcp/knowledge/server.mjs"
[[ -f "$SERVER" ]] || die "no knowledge server at $SERVER — pass --knowledge-repo"
[[ -d "$KNOWLEDGE_REPO/skills" ]] || die "no skills/ under $KNOWLEDGE_REPO — that is not the knowledge checkout"

# A linked worktree has a `.git` FILE; the main checkout has a directory. Baking a worktree
# path into the launcher works perfectly until the branch merges and the worktree is removed,
# and then the agent starts with no tools and says it has none — which reads as a broken agent
# rather than as a deleted directory. Refuse rather than warn: the failure is far away from
# the cause, and this is the only moment anybody is looking.
if [[ -f "$KNOWLEDGE_REPO/.git" ]]; then
  die "$KNOWLEDGE_REPO is a linked worktree, and it will not survive its branch being merged.
     Point --knowledge-repo at the main checkout instead:
       $(git -C "$KNOWLEDGE_REPO" rev-parse --path-format=absolute --git-common-dir 2>/dev/null | sed 's|/\.git$||')"
fi

# Start it once and read its banner. A server registered without being run is the failure
# that looks like success: the agent starts, the tools are simply absent, and it reports
# that it has no such tool rather than that its server is broken.
step "Checking the server starts"
BANNER="$(printf '' | "$NODE_BIN" "$SERVER" 2>&1 >/dev/null | head -1 || true)"
[[ "$BANNER" == *"ready"* ]] || die "server did not report ready: ${BANNER:-no output}"
ok "$BANNER"

step "Writing ${AGENT}'s config directory"

FENCE_DIR="$BUZZ_HOME/proxy"
FENCE_AGENT="$FENCE_DIR/claude-config-${AGENT}"
mkdir -p "$FENCE_AGENT"

"$NODE_BIN" -e '
  const fs = require("fs"), path = require("path");
  const [dir, nodeBin, server] = process.argv.slice(1);
  fs.writeFileSync(path.join(dir, ".claude.json"), JSON.stringify({
    mcpServers: {
      "recursica-knowledge": { command: nodeBin, args: [server] },
    },
    hasCompletedOnboarding: true,
  }, null, 2) + "\n");
  // The claude.ai connectors ride on the account login rather than on this registry, and
  // the Google Drive one reaches all of Drive. Isolating the registry does not remove it,
  // so an agent whose whole safety property is "holds no client data" has to turn it off
  // explicitly. This single line is the difference between a fence and a description of one.
  fs.writeFileSync(path.join(dir, "settings.json"),
    JSON.stringify({ disableClaudeAiConnectors: true }, null, 2) + "\n");
' "$FENCE_AGENT" "$NODE_BIN" "$SERVER"

ok "wrote $FENCE_AGENT/.claude.json (1 server: recursica-knowledge)"
ok "wrote $FENCE_AGENT/settings.json (claude.ai connectors off)"

step "Writing the launcher"

LAUNCHER="$FENCE_DIR/agent-${AGENT}.sh"
cat > "$LAUNCHER" <<LAUNCHEREOF
#!/bin/sh
# ${AGENT}: the knowledge server and nothing else.
#
# In Buzz Desktop, set this agent's runtime to "claude" and its agent command to this
# path — both in the SAME save. Runtime alone, saved first, is the unfenced state: the
# agent starts, reads the user-scope registry in ~/.claude.json, and holds every client
# on this machine. That window is the whole risk, and it is a save apart from safety.
#
# Buzz Desktop has no field for an MCP server list, and its per-agent env_vars field
# loses to values Buzz sets afterwards. The agent's *command* is the one hook that
# holds, because the script it names runs last and is the final writer of its environment.

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

exec "${ACP_BIN}" "\$@"
LAUNCHEREOF
chmod 755 "$LAUNCHER"
ok "wrote $LAUNCHER"

step "Done — one thing left, and it is manual"

cat <<EOF

  In Buzz Desktop, open ${AGENT} and save BOTH of these in one edit:

    runtime         claude
    agent command   ${LAUNCHER}

  Saving the runtime by itself leaves her reading the user-scope registry, which on this
  machine holds every client's BigQuery and Drive server. One save, both fields.

  To check it afterwards, ask her to list her tools. She should see the five
  recursica-knowledge tools and no bq-* or drive-* server at all. **Ask the server, not
  the agent, if the answer matters**: a model will describe a fence it does not have.
  The file is the evidence:

    cat ${FENCE_AGENT}/.claude.json

EOF
