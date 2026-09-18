#!/bin/sh
# Per-agent, per-community tool fence for Buzz managed agents.
#
# One agent record, one identity, one name — a different MCP registry in each community it
# belongs to, and a different one per agent within a community.
#
# Buzz spawns one agent process per (pubkey, relayUrl) and puts both BUZZ_RELAY_URL and
# BUZZ_ACP_DISPLAY_NAME in that process's environment. The agent *record* is
# community-agnostic, but the *process* knows both which agent it is and which community it
# is serving. This script runs as the agent's command, reads the two, picks the matching
# CLAUDE_CONFIG_DIR, and execs the real ACP agent.
#
# Both dimensions are needed. Keyed on community alone, every agent in a client community
# shares one tool list — which hands an agent that is supposed to hold no client data the
# same database and Drive access as the one that ingests it.
#
# Install: Buzz Desktop -> each agent -> agent command -> this path. Then quit and reopen
# Buzz Desktop; saving restarts that agent only on the community you are looking at.
#
# It applies nothing until you `touch ARMED` beside it. Until then it logs the decision it
# would have made, which is what you read before committing to it.
#
# See nest/GUIDES/PER_COMMUNITY_TOOL_FENCE.md.

set -u
DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
LOG="$DIR/launcher.log"
MAP="$DIR/communities.map"

# Log the decision and nothing else. The process environment this script inherits holds the
# agent's private key; never write "$@" or `env` output to a file that is not 0600.
log() { printf '%s pid=%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$$" "$*" >> "$LOG"; }

relay=${BUZZ_RELAY_URL:-}
host=$(printf '%s' "$relay" | sed -e 's|^[a-z]*://||' -e 's|[:/].*$||')

# The display name is the only agent identifier Buzz puts in the environment — there is no
# id. Fold to a directory-safe slug: lower case, anything else to a single dash. A renamed
# agent therefore stops matching its own directory and lands on _default; verify-fence.sh
# reports that, because silently losing tools reads as a broken agent.
agent=$(printf '%s' "${BUZZ_ACP_DISPLAY_NAME:-}" \
  | tr '[:upper:]' '[:lower:]' \
  | sed -e 's|[^a-z0-9]\{1,\}|-|g' -e 's|^-||' -e 's|-$||')
[ -n "$agent" ] || agent=_default

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

# <community>/<agent>, falling back to <community>/_default. Both are per community, so the
# fallback an operator writes for one client is never another client's.
#
# Missing directories are resolved here but only enforced below, under ARMED. An unarmed
# launcher must never refuse to start an agent: it sits in the spawn path of every agent
# pointed at it, so a fence that is not switched on yet has no business deciding whether
# anything runs. Upgrading the launcher ahead of restructuring the directories is the
# ordinary case, not an error.
cfg="$DIR/fences/$fence/$agent"
cfg_ok=yes
if [ ! -d "$cfg" ]; then
  if [ -d "$DIR/fences/$fence/_default" ]; then
    log "WARN no fence dir for agent=$agent in $fence -> _default"
    cfg="$DIR/fences/$fence/_default"
  else
    cfg_ok=no
  fi
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
  if [ "$cfg_ok" = no ]; then
    log "FATAL armed, but no fence dir for agent=$agent in $fence and no _default: $cfg"
    echo "buzz-agent-launcher: no fence dir for agent '$agent' in '$fence'," \
         "and no _default. Create one, or remove $DIR/ARMED to disable the fence." >&2
    exit 1
  fi
  CLAUDE_CONFIG_DIR=$cfg
  export CLAUDE_CONFIG_DIR
  log "ARMED agent=$agent relay=$relay host=$host fence=$fence CLAUDE_CONFIG_DIR=$cfg"
elif [ "$cfg_ok" = no ]; then
  log "PROBE agent=$agent relay=$relay host=$host fence=$fence NO DIR ($cfg) — would refuse if armed"
else
  log "PROBE agent=$agent relay=$relay host=$host fence=$fence would-set CLAUDE_CONFIG_DIR=$cfg (not applied)"
fi

exec "$target" "$@"
