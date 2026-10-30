#!/usr/bin/env bash
# Run AFTER installing the agent through the CircleChat UI. Safe to rerun.
# Usage: setup-agent.sh <handle>
#        setup-agent.sh --sync <handle>   only the skills and the persona, with no sudo (sync-skills.sh)
#   alan, betty, porter: GitHub access comes from the agent's GitHub App in site.json's github_apps
#   barb: KEV_ENGINE_KEY=... if a Kev-engine is running (optional)
#
# Run as the account that owns the stacks, never as root. An agent can change its own home and the
# shared workspace, so every write there goes through kit/safe-files.mjs, which never follows a
# symlink. Every file the script copies comes from the kit's own checkout, never from the
# workspace's checkout, which agents can change too. Without --sync, the writes in the agent's home
# run with sudo, because the agent's container can own files there.
set -euo pipefail

SYNC=false; [ "${1:-}" = --sync ] && { SYNC=true; shift; }
HANDLE="${1:?usage: setup-agent.sh [--sync] <handle>}"
[ "$(id -u)" != 0 ] || { echo "Run setup-agent.sh as the account that owns the stacks, never as root."; exit 1; }
if [ -n "${TENANT:-}" ]; then
  CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"
  WS="${WS:-$HOME/tenants/$TENANT/workspace}"
fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
HERE="$(cd "$(dirname "$0")" && pwd)"
KIT_ROOT="$(cd "$HERE/.." && pwd)"
H="$CC_DIR/hermes-homes/.hermes-$HANDLE"
SOUL="$KIT_ROOT/portable/circlechat/agents/$HANDLE/SOUL.md"
MARK="<!-- recursica-circlechat -->"
. "$HERE/kit/lib.sh"
# Per-deployment values (app repo name, Kev engines) come from setup-host.sh's render of site.json.
KIT_OUT="$CC_DIR/kit-out"
[ -f "$KIT_OUT/app.env" ] && . "$KIT_OUT/app.env"

# Each write in the agent's home or the workspace: kit/safe-files.mjs, as the owner with --sync and
# with sudo otherwise.
sf() {
  if [ "$SYNC" = true ]; then node "$HERE/kit/safe-files.mjs" "$@"
  else sudo "$(command -v node)" "$HERE/kit/safe-files.mjs" "$@"; fi
}
# read_home <file>: the file's text in TEXT, or "" when the file is missing. A symlink stops the script.
read_home() { TEXT="$(sf read "$H" "$1" && echo x)" || exit 1; TEXT="${TEXT%x}"; }
# put_home <file>: the file's new text on stdin, written as a new file.
put_home() { sf write "$H" "$1"; }

# Alan sends pull requests only to the stack's own knowledge repo. A client stack that still uses
# the public knowledge repo never runs Alan, so no client detail reaches a public pull request.
if [ -f "$KIT_OUT/tenant.env" ] && grep -q '^TENANT_KIND=client' "$KIT_OUT/tenant.env" && grep -q '^PUBLIC_KNOWLEDGE=yes' "$KIT_OUT/tenant.env" && [ "$HANDLE" = alan ]; then
  echo "This client stack uses the public knowledge repo, so it never runs Alan. Point repos.knowledge at the client's own fork first."; exit 1
fi
[ ! -L "$H" ] || { echo "Refused: $H is a symlink. Nothing was written."; exit 1; }
[ -d "$H" ] || { echo "No $H — install $HANDLE in the CircleChat UI first."; exit 1; }

# Loki on CircleChat has no Drive: his fence is /workspace/loki (agents/loki/platform/circlechat.md).
# What would break that fence is a tool server reaching client data, so refuse if he has any.
if [ "$SYNC" = false ] && [ "$HANDLE" = loki ]; then
  read_home "$H/config.yaml"
  if printf '%s\n' "$TEXT" | grep -qE '^mcp_servers:'; then
    echo "Loki's config.yaml has mcp_servers. On CircleChat his fence is /workspace/loki and he has no"
    echo "tool servers; one that reaches client data breaks the fence. Remove it, or set him up by hand."
    exit 1
  fi
fi
if [ ! -f "$SOUL" ]; then
  [ "$SYNC" = true ] || { echo "No built CircleChat persona for $HANDLE at $SOUL."; exit 1; }
fi

# Skills (flattened) + Barb's subagents, which run as skills here
sf copy "$H" "$H/skills" "$KIT_ROOT"/skills/*/*
if [ "$HANDLE" = barb ]; then
  sf copy "$H" "$H/skills" "$KIT_ROOT/agents/barb/subagents/checker" "$KIT_ROOT/agents/barb/subagents/feisty"
fi
# The knowledge MCP server's copy in the agent's own home (KNOWLEDGE_MCP_AGENTS in kit/lib.sh): the
# server, the skills it serves, and the two scripts it imports, from the kit's checkout. Hermes runs
# it inside the agent's container at /opt/data/knowledge-mcp. Never point it at the workspace's
# checkout, which every agent can change.
case " $KNOWLEDGE_MCP_AGENTS " in *" $HANDLE "*)
  KM="$H/$KNOWLEDGE_MCP_DIR"
  sf copy "$H" "$KM/tools/knowledge-mcp" "$KIT_ROOT/tools/knowledge-mcp/server.mjs"
  sf copy "$H" "$KM" "$KIT_ROOT/skills"
  sf copy "$H" "$KM/scripts" "$KIT_ROOT/scripts/screen-skill-manifest.mjs"
  sf copy "$H" "$KM/scripts/lib" "$KIT_ROOT/scripts/lib/skill-sections.mjs"
  ;;
esac
if [ ! -f "$SOUL" ]; then echo "synced skills for $HANDLE (persona not managed here)"; exit 0; fi

# Persona: replace our marked section with the built CircleChat persona, keep CircleChat's part.
# The built file already has every platform passage filled in; never paste agents/<handle>/SKILL.md,
# whose unfilled markers silently drop whole passages.
# A SOUL.md with no marker was written whole by something else (an older sync); appending to it
# would leave two personas in one file. Back it up and start clean.
# Deploy tokens (@APP_REPO@, @APP_REPO_GITHUB@) are this deployment's values, filled in here.
if grep -q '@APP_REPO' "$SOUL" && [ -z "${APP_REPO:-}" ]; then
  echo "No app repo configured. Run setup-host.sh with a site.json first (repos.app_dir)."; exit 1
fi
PERSONA="$(sed -e "s|@APP_REPO_GITHUB@|${APP_REPO_GITHUB:-}|g" -e "s|@APP_REPO@|${APP_REPO:-}|g" "$SOUL")"
if printf '%s' "$PERSONA" | grep -qE '@[A-Z0-9_]+@'; then
  echo "Unfilled deploy token in $HANDLE's persona: $(printf '%s' "$PERSONA" | grep -oE '@[A-Z0-9_]+@' | sort -u | tr '\n' ' ')"; exit 1
fi
# A symlinked SOUL.md is never read: the write below replaces the symlink.
if [ -L "$H/SOUL.md" ]; then TEXT=""; else read_home "$H/SOUL.md"; fi
if ! printf '%s\n' "$TEXT" | grep -qx "$MARK" && [ -n "$TEXT" ]; then
  printf '%s' "$TEXT" | put_home "$H/SOUL.md.premark.bak"
  BASE=""
else
  BASE="$(printf '%s\n' "$TEXT" | sed "/^$MARK\$/,\$d")"
fi
{ [ -z "$BASE" ] || printf '%s\n' "$BASE"; echo "$MARK"; printf '%s\n' "$PERSONA"; } | put_home "$H/SOUL.md"
if [ "$SYNC" = true ]; then echo "synced skills and persona for $HANDLE"; exit 0; fi

# The model gateway. The agent sends every model request to the stack's gateway with the agent's
# own gateway key, and asks for the agent's first route in site.json (agents.<handle>.routes). The
# gateway decides, for each request, whether a cluster model or the agent's cloud key answers.
# No cloud key stays in the agent's home. Porter's shell also gets the gateway's address and key,
# to ask for each port job's task key.
[ -f "$KIT_OUT/gateway.json" ] || { echo "No $KIT_OUT/gateway.json. Run setup-host.sh first."; exit 1; }
gateway_access "$HANDLE" "$H" "$([ "$HANDLE" = porter ] && echo env)"
case "$HANDLE" in
  betty) EFFORT=low ;;
  *)     EFFORT=medium ;;
esac
# Every other model setting goes to the gateway too (compression, the side tasks, subagents and
# fallbacks), and speech stays on the computer. gateway_access stops when one still points elsewhere.
read_home "$H/config.yaml"
printf '%s' "$TEXT" | sed -e "s/reasoning_effort: .*/reasoning_effort: $EFFORT/" | put_home "$H/config.yaml"

# The knowledge MCP server's entry in mcp_servers, for the agents in KNOWLEDGE_MCP_AGENTS: the copy
# above, in the agent's own home, run inside the agent's container. CircleChat writes the same entry
# from CC_AGENT_MCP_SERVERS only when it installs the agent, or on Skills → Re-equip, and writes the
# file without the kit's symlink check. Every other server stays, such as CircleChat's own, and a
# cli toolset list that names a server gets this server too (gateway/hermes-access.mjs
# setMcpServer). The new text is complete before the write starts, so a failure writes nothing.
case " $KNOWLEDGE_MCP_AGENTS " in *" $HANDLE "*)
  read_home "$H/config.yaml"
  NEW="$(printf '%s' "$TEXT" | node "$HERE/kit/mcp-entry.mjs" "$KNOWLEDGE_MCP_NAME" "$KNOWLEDGE_MCP_TIMEOUT" node "$KNOWLEDGE_MCP_SERVER")" || exit 1
  printf '%s\n' "$NEW" | put_home "$H/config.yaml"
  ;;
esac

# Barb's delegation limits. Each default made a full review fail; agents/barb/runtime/hermes.md
# says which and why. Appended only when absent, because merging YAML with sed is how a key ends
# up under the wrong parent and silently ignored.
if [ "$HANDLE" = barb ]; then
  read_home "$H/config.yaml"
  if printf '%s\n' "$TEXT" | grep -qE '^(delegation|tool_loop_guardrails):'; then
    echo "Barb's config.yaml already has delegation or tool_loop_guardrails. Check the values"
    echo "against agents/barb/runtime/hermes.md by hand."
  else
    { printf '%s' "$TEXT"; cat << 'YAML'

delegation:
  oneshot_max_children: 0
  max_concurrent_children: 3
  max_iterations: 50

tool_loop_guardrails:
  loop_caps:
    max_subagents: 150
YAML
    } | put_home "$H/config.yaml"
  fi
fi

# Loki's context sizes. Hermes guesses a local model's window from its own model list and
# has guessed 51,200 for a model served with 262,144: below Hermes' 64K compression minimum
# (every turn refused) and too small for a long task thread (turns died "too long to read").
# agents/loki/runtime/hermes.md has the detail. Set once; edit by hand after that.
if [ "$HANDLE" = loki ]; then
  CTX="${LOKI_CONTEXT:-131072}"
  read_home "$H/config.yaml"
  if ! printf '%s\n' "$TEXT" | grep -qE '^  context_length:'; then
    printf '%s' "$TEXT" | awk -v c="$CTX" '{ print } /^model:/ { print "  context_length: " c }' | put_home "$H/config.yaml"
    read_home "$H/config.yaml"
  fi
  # gateway_access wrote auxiliary.compression, so the size goes inside it.
  if ! printf '%s\n' "$TEXT" | grep -qE '^    context_length:'; then
    printf '%s' "$TEXT" | awk -v c="$CTX" '{ print } /^[^ ]/ { aux = ($0 == "auxiliary:") } aux && $0 == "  compression:" { print "    context_length: " c }' | put_home "$H/config.yaml"
  fi
  sf mkdir "$WS" "$WS/loki" 777
fi

# Secrets go in the agent's own .env, never in SOUL.md. The value passes on stdin, never as an
# argument.
set_secret() { # set_secret NAME VALUE
  read_home "$H/.env"
  { printf '%s\n' "$TEXT" | grep -v -e "^$1=" -e '^$' || true; printf '%s=%s\n' "$1" "$2"; } | put_home "$H/.env"
}
# GitHub: each agent that pushes has a GitHub App of the agent's own (site.json's github_apps). The
# token service writes the app's installation token to the agent's .env as <AGENT>_GITHUB_TOKEN,
# and renews the token before the token ends (circlechat/github/token-service.mjs). A retired
# personal access token leaves the .env, and so does a GITHUB_TOKEN line: Hermes removes
# GITHUB_TOKEN and GH_TOKEN from every shell Hermes starts.
read_home "$H/.env"
if printf '%s\n' "$TEXT" | grep -qE '^(GITHUB_TOKEN|ALAN_GITHUB_PAT|BETTY_GITHUB_PAT|PORTER_GITHUB_PAT)='; then
  { printf '%s\n' "$TEXT" | grep -vE -e '^(GITHUB_TOKEN|ALAN_GITHUB_PAT|BETTY_GITHUB_PAT|PORTER_GITHUB_PAT)=' -e '^$' || true; } | put_home "$H/.env"
fi
case "$HANDLE" in alan|betty|porter|otto)
  if ! node -e 'process.exit(JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).github_apps?.[process.argv[2]] ? 0 : 1)' "${SITE:-$CC_DIR/site.json}" "$HANDLE" 2>/dev/null; then
    echo "$HANDLE has no GitHub App in site.json's github_apps, so $HANDLE has no push access (circlechat/README.md, \"GitHub access for agents\")."
  fi ;;
esac
if [ "$HANDLE" = barb ] && [ -n "${KEV_ENGINE_KEY:-}" ]; then
  set_secret KEV_ENGINE_KEY "$KEV_ENGINE_KEY"
fi
# Porter: where the job runners are, the shared job-runner token, and whom to mention with a result.
if [ "$HANDLE" = porter ]; then
  [ -s "$KIT_OUT/job-nodes.txt" ] || { echo "No job runners in site.json. Porter needs a node with a jobs block."; exit 1; }
  set_secret PORTER_JOB_NODES "$(tr -d '\n' < "$KIT_OUT/job-nodes.txt")"
  set_secret JOBD_TOKEN "$(sed -n 's/^JOBD_TOKEN=//p' "$CC_DIR/.env")"
  set_secret PORTER_OWNER "$(sed -n 's/^PORTER_OWNER=//p' "$KIT_OUT/porter.env")"
fi
# Where Barb finds Kev-engines, best first, from site.json. Not a secret, but it lives with her
# other settings so her prompt never has to name a machine.
if [ "$HANDLE" = barb ] && [ -s "$KIT_OUT/kev-engines.txt" ]; then
  set_secret KEV_ENGINE_URLS "$(tr -d '\n' < "$KIT_OUT/kev-engines.txt")"
fi

# The stack's git host and repo access method, for Betty's new-project and commit rules.
if [ -f "$KIT_OUT/tenant.env" ]; then
  for k in GIT_HOST REPO_ACCESS; do
    v="$(sed -n "s/^$k=//p" "$KIT_OUT/tenant.env")"
    [ -n "$v" ] && set_secret "$k" "$v"
  done
fi

sf chmod "$H" "$H" 777
# One test turn, the way CircleChat runs an agent turn (kit/hermes-turn.sh). A turn that Hermes
# refuses stops the setup here with Hermes's reason, instead of showing up as the agent's first
# reply. The hourly --sync runs no turn: each turn is a model request.
if [ "$SYNC" = false ]; then CC_DIR="$CC_DIR" "$HERE/kit/hermes-turn.sh" "$H" || exit 1; fi
echo "$HANDLE set up. Changes apply on the next message."
