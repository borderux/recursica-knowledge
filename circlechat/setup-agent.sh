#!/usr/bin/env bash
# Run AFTER installing the agent through the CircleChat UI. Safe to rerun.
# Usage: setup-agent.sh <handle>
#   alan: GITHUB_TOKEN=... on the first run (fine-grained: Contents + Pull requests + Issues on
#         the knowledge repo, Issues on the adapter repos and Theme Forge — no merge rights)
#   barb: KEV_ENGINE_KEY=... if a Kev-engine is running (optional)
set -euo pipefail

HANDLE="${1:?usage: setup-agent.sh <handle>}"
if [ -n "${TENANT:-}" ]; then
  CC_DIR="${CC_DIR:-$HOME/tenants/$TENANT/circlechat}"
  WS="${WS:-$HOME/tenants/$TENANT/workspace}"
fi
CC_DIR="${CC_DIR:-$HOME/circlechat}"
WS="${WS:-$HOME/circlechat-workspace}"
K="$WS/recursica-knowledge"
H="$CC_DIR/hermes-homes/.hermes-$HANDLE"
SOUL="$K/portable/circlechat/agents/$HANDLE/SOUL.md"
MARK="<!-- recursica-circlechat -->"
. "$(dirname "$0")/kit/lib.sh"
# Per-deployment values (app repo name, Kev engines) come from setup-host.sh's render of site.json.
KIT_OUT="$CC_DIR/kit-out"
[ -f "$KIT_OUT/app.env" ] && . "$KIT_OUT/app.env"
# Alan proposes changes to the public knowledge repo, so a client stack never runs Alan: no client
# detail can reach a public pull request.
if [ -f "$KIT_OUT/tenant.env" ] && grep -q '^TENANT_KIND=client' "$KIT_OUT/tenant.env" && [ "$HANDLE" = alan ]; then
  echo "A client stack never runs Alan: Alan's pull requests go to the public knowledge repo."; exit 1
fi

# Loki on CircleChat has no Drive: his fence is /workspace/loki (agents/loki/platform/circlechat.md).
# What would break that fence is a tool server reaching client data, so refuse if he has any.
if [ "$HANDLE" = loki ] && sudo grep -qE '^mcp_servers:' "$H/config.yaml" 2>/dev/null; then
  echo "Loki's config.yaml has mcp_servers. On CircleChat his fence is /workspace/loki and he has no"
  echo "tool servers; one that reaches client data breaks the fence. Remove it, or set him up by hand."
  exit 1
fi
sudo test -d "$H" || { echo "No $H — install $HANDLE in the CircleChat UI first."; exit 1; }
[ -f "$SOUL" ] || { echo "No built CircleChat persona for $HANDLE at $SOUL."; exit 1; }

# Skills (flattened) + Barb's subagents, which run as skills here
sudo cp -r "$K"/skills/*/* "$H/skills/"
if [ "$HANDLE" = barb ]; then
  sudo cp -r "$K/agents/barb/subagents/checker" "$K/agents/barb/subagents/feisty" "$H/skills/"
fi

# Model and effort. The model that runs is the one in config.yaml, not the label in the UI.
# MODEL=... overrides; otherwise only Alan's is set, and the others keep what the install chose.
case "$HANDLE" in
  alan) MODEL="${MODEL:-claude-sonnet-5-5}" ;;
  *)    MODEL="${MODEL:-}" ;;
esac
case "$HANDLE" in
  betty) EFFORT=low ;;
  *)     EFFORT=medium ;;
esac
if [ -n "$MODEL" ]; then
  sudo_sedi -e "s/^\(  default:\).*/\1 $MODEL/" "$H/config.yaml"
fi
# Compression summaries run on Haiku, except for Loki: he runs on a local model with no
# Anthropic key, so his summaries run on his own model.
if [ "$HANDLE" = loki ]; then
  SUMMARY="$(sudo sed -n 's/^  default: *//p' "$H/config.yaml" | head -1)"
else
  SUMMARY=claude-haiku-4-5
fi
sudo_sedi \
  -e "s/reasoning_effort: .*/reasoning_effort: $EFFORT/" \
  -e "s/summary_model: .*/summary_model: $SUMMARY/" \
  "$H/config.yaml"

# Barb's delegation limits. Each default made a full review fail; agents/barb/runtime/hermes.md
# says which and why. Appended only when absent, because merging YAML with sed is how a key ends
# up under the wrong parent and silently ignored.
if [ "$HANDLE" = barb ]; then
  if sudo grep -qE '^(delegation|tool_loop_guardrails):' "$H/config.yaml"; then
    echo "Barb's config.yaml already has delegation or tool_loop_guardrails. Check the values"
    echo "against agents/barb/runtime/hermes.md by hand."
  else
    sudo tee -a "$H/config.yaml" >/dev/null << 'YAML'

delegation:
  oneshot_max_children: 0
  max_concurrent_children: 3
  max_iterations: 50

tool_loop_guardrails:
  loop_caps:
    max_subagents: 150
YAML
  fi
fi

# Loki's context sizes. Hermes guesses a local model's window from its own model list and
# has guessed 51,200 for a model served with 262,144: below Hermes' 64K compression minimum
# (every turn refused) and too small for a long task thread (turns died "too long to read").
# agents/loki/runtime/hermes.md has the detail. Set once; edit by hand after that.
if [ "$HANDLE" = loki ]; then
  CTX="${LOKI_CONTEXT:-131072}"
  sudo grep -qE '^  context_length:' "$H/config.yaml" || sudo_sedi "/^model:/a\\  context_length: $CTX" "$H/config.yaml"
  if ! sudo grep -qE '^auxiliary:' "$H/config.yaml"; then
    printf '\nauxiliary:\n  compression:\n    context_length: %s\n' "$CTX" | sudo tee -a "$H/config.yaml" >/dev/null
  fi
  sudo mkdir -p "$WS/loki" && sudo chmod 777 "$WS/loki"
fi

# Secrets go in the agent's own .env, never in SOUL.md.
set_secret() { # set_secret NAME VALUE
  sudo_sedi "/^$1=/d" "$H/.env"
  echo "$1=$2" | sudo tee -a "$H/.env" >/dev/null
}
# Alan's GitHub token is stored as ALAN_GITHUB_PAT, not GITHUB_TOKEN: Hermes strips GITHUB_TOKEN
# and GH_TOKEN from every shell it spawns, with no setting to allow them, so under those names
# the token is saved but never reaches him. You still pass it in as GITHUB_TOKEN=... here.
if [ "$HANDLE" = alan ]; then
  if [ -n "${GITHUB_TOKEN:-}" ]; then
    set_secret ALAN_GITHUB_PAT "$GITHUB_TOKEN"
  elif sudo grep -q '^GITHUB_TOKEN=' "$H/.env" && ! sudo grep -q '^ALAN_GITHUB_PAT=' "$H/.env"; then
    old="$(sudo sed -n 's/^GITHUB_TOKEN=//p' "$H/.env" | tail -1)"
    set_secret ALAN_GITHUB_PAT "$old"
  elif ! sudo grep -q '^ALAN_GITHUB_PAT=' "$H/.env"; then
    echo "alan needs GITHUB_TOKEN=... on the first run (fine-grained: Contents + Pull requests +"
    echo "Issues on the knowledge repo, Issues on the adapter repos and Theme Forge). Without merge rights on"
    echo "it, he cannot merge — that is the point."
    exit 1
  fi
  sudo_sedi '/^GITHUB_TOKEN=/d' "$H/.env"
fi
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

# Persona: replace our marked section with the built CircleChat persona, keep CircleChat's part.
# The built file already has every platform passage filled in; never paste agents/<handle>/SKILL.md,
# whose unfilled markers silently drop whole passages.
# A SOUL.md with no marker was written whole by something else (an older sync); appending to it
# would leave two personas in one file. Back it up and start clean.
if ! sudo grep -qx "$MARK" "$H/SOUL.md" 2>/dev/null && sudo test -s "$H/SOUL.md"; then
  sudo cp "$H/SOUL.md" "$H/SOUL.md.premark.bak"
  sudo sh -c ": > '$H/SOUL.md'"
fi
sudo_sedi "/^$MARK\$/,\$d" "$H/SOUL.md"
# Deploy tokens (@APP_REPO@, @APP_REPO_GITHUB@) are this deployment's values, filled in here.
if grep -q '@APP_REPO' "$SOUL" && [ -z "${APP_REPO:-}" ]; then
  echo "No app repo configured. Run setup-host.sh with a site.json first (repos.app_dir)."; exit 1
fi
PERSONA="$(sed -e "s|@APP_REPO_GITHUB@|${APP_REPO_GITHUB:-}|g" -e "s|@APP_REPO@|${APP_REPO:-}|g" "$SOUL")"
if printf '%s' "$PERSONA" | grep -qE '@[A-Z0-9_]+@'; then
  echo "Unfilled deploy token in $HANDLE's persona: $(printf '%s' "$PERSONA" | grep -oE '@[A-Z0-9_]+@' | sort -u | tr '\n' ' ')"; exit 1
fi
{ echo "$MARK"; printf '%s\n' "$PERSONA"; } | sudo tee -a "$H/SOUL.md" >/dev/null

sudo chmod -R 777 "$H"
echo "$HANDLE set up. Changes apply on the next message."
