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

# Resolution order:
#
#   fences/<community>/<agent>     a client-bound agent: different tools per client
#   fences/_shared/<agent>         a client-independent agent: same tools everywhere
#   claude-config-<agent>-<fence>  legacy, written by deploy-claire-channel.sh
#   claude-config-<agent>          legacy, written by deploy-betty.sh and deploy-loki.sh
#   fences/<community>/_default    an agent nobody has set up yet, in a known community
#
# The two legacy names are in the list because the deploy scripts write there and several
# tools read there — scribe-ingest, tagger-batch and survey-lines all resolve a client's
# server config by that path. Repointing the deploys without those would leave an agent
# whose tools are written somewhere nothing reads; repointing everything is a migration,
# not a fix. Reading both is neither: the existing convention already encodes the same two
# shapes this tree does, with <agent> alone meaning client-independent and <agent>-<client>
# meaning client-bound, so the launcher just recognises it.
#
# The legacy per-client name is matched on the FENCE name, not the client slug. They are
# usually the same word. Where they are not, the lookup misses and falls through to the
# fallback rather than guessing — visible in this log, and fixed by naming the fence after
# the slug in communities.map.
#
# _shared exists because some agents are client-independent by design — they hold no client
# data and serve every client identically. Giving those a directory per community would mean
# N identical copies and N separate logins, since the credential is keychain-scoped per
# directory. Nothing lands in _shared unless an operator puts it there, and a per-community
# directory always wins over it, so a client-bound agent cannot fall into it by accident.
#
# _default is per community, so the fallback written for one client is never another's.
#
# Missing directories are resolved here but only enforced below, under ARMED. An unarmed
# launcher must never refuse to start an agent: it sits in the spawn path of every agent
# pointed at it, so a fence that is not switched on yet has no business deciding whether
# anything runs. Upgrading the launcher ahead of restructuring the directories is the
# ordinary case, not an error.
cfg=""
for candidate in \
  "$DIR/fences/$fence/$agent" \
  "$DIR/fences/_shared/$agent" \
  "$DIR/claude-config-$agent-$fence" \
  "$DIR/claude-config-$agent"
do
  if [ -d "$candidate" ]; then cfg=$candidate; break; fi
done

cfg_ok=yes
case ${cfg:-} in
  "$DIR/fences/$fence/$agent") ;;
  "$DIR/fences/_shared/$agent")
    log "INFO agent=$agent has no dir in $fence -> _shared/$agent" ;;
  "$DIR/claude-config-"*)
    log "INFO agent=$agent using legacy fence dir $(basename -- "$cfg")" ;;
  *)
    if [ -d "$DIR/fences/$fence/_default" ]; then
      log "WARN no fence dir for agent=$agent in $fence -> _default"
      cfg="$DIR/fences/$fence/_default"
    else
      cfg="$DIR/fences/$fence/$agent"
      cfg_ok=no
    fi ;;
esac

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

if [ ! -r "$target" ]; then
  log "FATAL agent command not readable: $target"
  echo "buzz-agent-launcher: agent command not readable: $target" >&2
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

# Optional, and absent on most machines: an operator running the agents against a local or
# self-hosted model keeps the ANTHROPIC_* variables here. Sourced rather than baked in, so
# changing models does not mean touching this script.
#
# Written as an `if` rather than `[ -f x ] && . x`: under `set -e` that form is a list whose
# status is 1 when the file is absent, which exits before the exec below — so every machine
# WITHOUT the optional file would fail to start the agent at all.
if [ -f "$DIR/model-env.sh" ]; then
  . "$DIR/model-env.sh"
fi

# Buzz Desktop is a GUI app: it inherits launchd's PATH (/usr/bin:/bin:/usr/sbin:/sbin),
# which holds neither node nor the Claude CLI. The ACP adapter is a .js file whose shebang
# is `#!/usr/bin/env node`, so exec'ing it directly under that PATH dies with
# "env: node: No such file or directory" before the agent ever starts — reaching the
# operator as an agent that will not come up, with nothing about node anywhere near it.
#
# Run a node-shebang target under node explicitly, and put node and the usual CLI directory
# on PATH for anything downstream that still resolves them by name. Targets that are not
# node scripts are exec'd as they are.
case $(head -n 1 "$target" 2>/dev/null) in
  '#!'*node*)
    node_bin=$(ls -d "$HOME/Library/Application Support/Buzz/runtimes/node"/*/*/bin/node 2>/dev/null | tail -1)
    [ -n "${node_bin:-}" ] || node_bin=$(command -v node 2>/dev/null || true)
    if [ -z "${node_bin:-}" ]; then
      log "FATAL no node for $target (no bundled runtime, none on PATH)"
      echo "buzz-agent-launcher: no node to run $target" >&2
      exit 127
    fi
    PATH="$HOME/.local/bin:$(dirname -- "$node_bin"):$PATH"
    export PATH
    exec "$node_bin" "$target" "$@"
    ;;
esac

PATH="$HOME/.local/bin:$PATH"
export PATH
exec "$target" "$@"
