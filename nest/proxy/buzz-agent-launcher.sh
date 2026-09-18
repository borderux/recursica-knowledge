#!/bin/sh
# Per-community tool fence for Buzz managed agents.
#
# One agent record, one identity, one name — a different MCP registry per community.
#
# Buzz spawns one agent process per (pubkey, relayUrl) and puts BUZZ_RELAY_URL in that
# process's environment. The agent *record* is community-agnostic, but the *process* is
# not. This script runs as the agent's command, reads the relay, picks the matching
# CLAUDE_CONFIG_DIR, and execs the real ACP agent.
#
# Install: Buzz Desktop -> the agent -> agent command -> this path. Then quit and reopen
# Buzz Desktop; saving restarts the agent only on the community you are looking at.
#
# It applies nothing until you `touch ARMED` beside it. Until then it logs the decision it
# would have made, which is what you read before committing to it.
#
# See nest/GUIDES/PER_COMMUNITY_TOOL_FENCE.md.

set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LOG="$DIR/launcher.log"
MAP="$DIR/communities.map"

# Log the decision and nothing else. The process environment this script inherits holds
# the agent's private key; never write "$@" or `env` output to a file that is not 0600.
log() { printf '%s pid=%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$$" "$*" >> "$LOG"; }

relay=${BUZZ_RELAY_URL:-}
host=$(printf '%s' "$relay" | sed -e 's|^[a-z]*://||' -e 's|[:/].*$||')

fence=""
if [ -n "$host" ] && [ -f "$MAP" ]; then
  while IFS='	' read -r m_host m_fence; do
    case "$m_host" in ''|\#*) continue ;; esac
    if [ "$m_host" = "$host" ]; then fence=$m_fence; break; fi
  done < "$MAP"
fi

# Fail closed. An unmapped relay is a community nobody has granted anything, so it gets the
# empty registry rather than the operator's own. A new community therefore starts with no
# tools and says so in this log, which is the safe direction to be wrong in.
if [ -z "$fence" ]; then
  fence=_unknown
  log "WARN unmapped relay=${relay:-<empty>} -> deny-all fence _unknown"
fi

cfg="$DIR/fences/$fence"
if [ ! -d "$cfg" ]; then
  log "FATAL fence dir missing: $cfg (relay=$relay)"
  echo "buzz-agent-launcher: fence dir missing: $cfg" >&2
  exit 1
fi

# The real agent. NOT $BUZZ_ACP_AGENT_COMMAND — Buzz sets that to whatever it was told to
# run, which once this script is installed is this script, so reading it execs a fork bomb.
# Order: explicit override, then a `target` file beside this script, then where Buzz Desktop
# ships it.
target=${BUZZ_AGENT_ACP_TARGET:-}
if [ -z "$target" ] && [ -f "$DIR/target" ]; then target=$(cat "$DIR/target"); fi
if [ -z "$target" ]; then
  target="$HOME/Library/Application Support/Buzz/node-tools/bin/claude-agent-acp"
fi

if [ "$target" = "$0" ] || [ "$target" = "$DIR/$(basename -- "$0")" ]; then
  log "FATAL target resolves to this launcher: $target"
  echo "buzz-agent-launcher: target resolves to this launcher; would loop" >&2
  exit 1
fi

if [ ! -x "$target" ]; then
  log "FATAL agent command not executable: $target"
  echo "buzz-agent-launcher: agent command not executable: $target" >&2
  exit 1
fi

# Opt in, rather than opt out. An unarmed launcher is a no-op that logs; an armed one
# redirects every agent on this machine to a config directory that needs its own login. The
# file is the operator's, so re-running the bootstrap can neither arm nor disarm the fence —
# which it could if this were a PROBE file the bootstrap had to ship and then not restore.
if [ -f "$DIR/ARMED" ]; then
  CLAUDE_CONFIG_DIR=$cfg
  export CLAUDE_CONFIG_DIR
  log "ARMED relay=$relay host=$host fence=$fence CLAUDE_CONFIG_DIR=$cfg"
else
  log "PROBE relay=$relay host=$host fence=$fence would-set CLAUDE_CONFIG_DIR=$cfg (not applied)"
fi

exec "$target" "$@"
