#!/usr/bin/env bash
# Keep each agent on the stack's RecursicaChat 2.0 server in step with the kit and site.json: the
# instructions, the model, autonomy, the sandbox, the monthly budget and the starters an empty chat
# shows (kit/rc-sync.mjs). Safe to
# rerun. setup-host.sh runs the script once, as the owner, and installs the hourly job, which runs
# the script as root.
# Usage: rc-sync.sh [--check]     --check reports what would change, and changes nothing
#
# The settings come from site.json's recursicachat block (circlechat/README.md, "Agents on
# RecursicaChat 2.0"). Without the block, the script does nothing.
#
# Everything on the server goes through the server's root-only CLI (kit/rc-cli.sh). The sync signs in
# to nothing, so no account and no session is involved. For each agent:
#   1. The agent's model key: the agent's own gateway handle, rc-<handle>, never a 1.x agent's handle,
#      and the agent's own provider on the server, gw-<handle>. When the provider's stored key is the
#      key the gateway records for rc-<handle>, the step only refreshes the provider's address and
#      models. Otherwise the step issues a new key, checks the key on the gateway, and pipes the key
#      into the CLI (kit/rc-gateway-key.mjs, cli.ts set-provider). No argument, environment variable,
#      file, clipboard or output line ever holds the key.
#   2. The agent is managed (cli.ts manage): the server's API refuses changes to the five settings
#      from every session, and the web app shows them read-only.
#   3. The five settings and the starters, as JSON from kit/rc-sync.mjs, go into cli.ts agent-set on
#      stdin. The CLI sets only the settings that differ. A server whose agent-get prints no
#      "starters" is too old to keep them: the step leaves them out, with a note when the kit names
#      some, and sets the rest.
#   4. Skills, for each Hermes agent in a Docker sandbox: the agent keeps only the bundled skills its
#      kit settings name, in "skills" in agents/<handle>/runtime/recursicachat.json; with none named,
#      none (kit/rc-skills.mjs). Hermes's own hermes-agent and every skill that isn't bundled, such
#      as one the agent learned, stay. Only while the server is quiet (cluster/quiet.mjs): no turn
#      running and no one online. The engine sees the change at its next start; nothing restarts.
# Then a warning for each agent on the server whose model can use another agent's key.
#
# As root (the hourly job), the script runs only the server's CLI and the key step as root. The read
# of site.json and the kit's files run as OWNER, the account that owns the stacks.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
CHECK=""
[ "${1:-}" = --check ] && CHECK=--check
CC_DIR="${CC_DIR:-$HOME/circlechat}"
GW_STATE="${GW_STATE:-$CC_DIR/gateway-state}"
SITE="${SITE:-$CC_DIR/site.json}"
KIT_NODE="${KIT_NODE:-$(command -v node || true)}"
[ -n "$KIT_NODE" ] && [ -x "$KIT_NODE" ] || { echo "No Node to run the sync. Set KIT_NODE."; exit 2; }

# The kit's own steps run as the owner, never as root.
if [ "$(id -u)" = 0 ]; then
  [ -n "${OWNER:-}" ] && [ "$OWNER" != root ] || { echo "As root, set OWNER to the account that owns the stacks."; exit 2; }
  as_owner() { sudo -u "$OWNER" -H "$@"; }
else
  as_owner() { "$@"; }
fi
kit() { as_owner "$KIT_NODE" "$HERE/kit/rc-sync.mjs" "$@"; }

SETTINGS="$(kit settings "$SITE")" || { echo "$SETTINGS"; exit 2; }
# $( ) drops trailing empty lines, so a setting left out at the end reads as empty.
RC_APP="" RC_DATA="" RC_VAULT_KEY_FILE="" RC_NODE="" GW_URL="" OLD_ACCOUNT=""
{ IFS= read -r RC_APP || true; IFS= read -r RC_DATA || true; IFS= read -r RC_VAULT_KEY_FILE || true
  IFS= read -r RC_NODE || true; IFS= read -r GW_URL || true; IFS= read -r OLD_ACCOUNT || true; } <<<"$SETTINGS"
[ -n "$RC_APP" ] || { echo "site.json has no recursicachat block: no RecursicaChat 2.0 server to sync."; exit 0; }
RC_NODE="${RC_NODE:-$KIT_NODE}"
export RC_APP RC_DATA RC_VAULT_KEY_FILE RC_NODE
[ -z "$OLD_ACCOUNT" ] || echo "note: recursicachat.account is no longer used. Remove it from site.json, and remove the account in RecursicaChat."

# The server's CLI needs Node 24 or newer, outside the server's folder: the server's own Node is the
# server account's alone.
case "$RC_NODE" in "$(dirname "$RC_APP")"/*) echo "recursicachat.node is inside the server's folder. Use a Node 24 outside the folder."; exit 2 ;; esac
[ -x "$RC_NODE" ] || { echo "$RC_NODE is not a Node this account can run. Set recursicachat.node in site.json."; exit 2; }
major="$("$RC_NODE" -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)"
[ "$major" -ge 24 ] || { echo "The server's CLI needs Node 24 or newer, and $RC_NODE is Node $major. Set recursicachat.node in site.json to a Node 24."; exit 2; }

. "$HERE/kit/rc-cli.sh"

# Not root: sudo asks for the password once, here, before any output.
[ "$(id -u)" = 0 ] || sudo -v

as_root() { if [ "$(id -u)" = 0 ]; then "$@"; else sudo "$@"; fi; }
gw_key() { as_root "$KIT_NODE" "$HERE/kit/rc-gateway-key.mjs" "$@"; }
AGENTS="$(kit agents "$SITE")" || { echo "$AGENTS"; exit 2; }
FAILED=0
# The list comes in on descriptor 3, so no command in the loop can read the list's next lines.
while IFS=$'\t' read -r -u 3 h gw provider model routes; do
  [ -n "$h" ] || continue

  # 1. The model key.
  stored="$(rc_cli provider-key-hash "$provider" </dev/null)" || { echo "$h: FAILED: the server's CLI could not read $provider."; FAILED=1; continue; }
  recorded="$(gw_key hash "$GW_STATE" "$gw" </dev/null)" || { echo "$h: FAILED: the gateway's key records could not be read."; FAILED=1; continue; }
  if [ -n "$stored" ] && [ "$stored" = "$recorded" ]; then
    if [ -n "$CHECK" ]; then
      echo "$h: the gateway key in $provider is current"
    else
      # Empty stdin keeps the stored key, and refreshes the address and the models.
      rc_cli set-provider "$provider" --base-url "$GW_URL" --models "$routes" </dev/null 2>/dev/null \
        || { echo "$h: FAILED: $provider could not be refreshed."; FAILED=1; continue; }
    fi
  elif [ -n "$CHECK" ]; then
    echo "$h: would issue a new gateway key for $gw, and set it in $provider"
  elif gw_key issue "$GW_STATE" "$gw" "$GW_URL" "$model" "$routes" </dev/null | rc_cli set-provider "$provider" --base-url "$GW_URL" --models "$routes" 2>/dev/null; then
    echo "$h: issued a new gateway key for $gw, and set it in $provider"
  else
    echo "$h: FAILED: no new key reached $provider (the lines above say why)."; FAILED=1; continue
  fi

  # 2. Managed: the app refuses changes to the five settings.
  state="$(rc_cli agent-get "$h" </dev/null 2>&1)" || { echo "$h: FAILED: $state"; FAILED=1; continue; }
  case "$state" in
    *'"managed":true'*) ;;
    *)
      if [ -n "$CHECK" ]; then echo "$h: would mark @$h managed"; continue; fi
      rc_cli manage "$h" </dev/null 2>/dev/null || { echo "$h: FAILED: @$h could not be marked managed."; FAILED=1; continue; }
      echo "$h: marked managed" ;;
  esac

  # 3. The five settings and the starters, as JSON on stdin; no starters for a server too old for them.
  want="$(kit want "$SITE" "$h" 2>&1)" || { echo "$h: FAILED: $want"; FAILED=1; continue; }
  case "$state" in
    *'"starters":'*) ;;
    *)
      case "$want" in *'"starters":["'*) echo "$h: note: this server keeps no starters yet, so @$h's starters wait for a newer RecursicaChat" ;; esac
      want="$(kit want "$SITE" "$h" --no-starters 2>&1)" || { echo "$h: FAILED: $want"; FAILED=1; continue; } ;;
  esac
  if out="$(printf '%s\n' "$want" | rc_cli agent-set "$h" $CHECK 2>&1)"; then
    echo "$h: $out"
  else
    echo "$h: FAILED: $out"; FAILED=1
  fi
done 3<<<"$AGENTS"

# 4. Skills. Two short containers on the server's own Docker, from Hermes's own image, with no
# network: one reads the agent's skills folder, read-only, and one removes the folders rc-skills.mjs
# names. Each folder is ./<names>/ inside the skills folder, which rc-skills.mjs checks.
HERMES_IMAGE=circlechat/engine-hermes:latest
dk() { as_root env HOME=/opt/recursicachat/home DOCKER_HOST=unix:///opt/recursicachat/home/.colima/recursicachat/docker.sock /opt/homebrew/bin/docker "$@"; }
# shellcheck disable=SC2016 # the JavaScript and the container's shell read their own arguments
skills_step() {
  local why plan h vol allow found dirs n out
  # stdout is the reason the server is busy, or nothing; stderr goes to the job's log
  why="$(as_root "$KIT_NODE" --input-type=module -e '
    const { serverQuiet } = await import(process.argv[1]);
    const site = JSON.parse((await import("node:fs")).readFileSync(process.argv[2], "utf8"));
    process.stdout.write((await serverQuiet(site)).why);
  ' "$HERE/cluster/quiet.mjs" "$SITE")" || { echo "skills: FAILED: the quiet check could not run (the lines above say why)"; FAILED=1; return; }
  if [ -n "$why" ]; then echo "skills: not now, the server isn't quiet ($why); the next sync tries again"; return; fi
  plan="$(as_root "$KIT_NODE" "$HERE/kit/rc-skills.mjs" plan "$RC_DATA/circlechat.db" "$SITE" 2>&1)" || { echo "skills: FAILED: $plan"; FAILED=1; return; }
  while IFS=$'\t' read -r -u 4 h vol allow; do
    [ -n "$h" ] || continue
    found="$(dk run --rm --network none --read-only --user 0:0 -v "$vol:/v:ro" --entrypoint /bin/sh "$HERMES_IMAGE" -c 'cd /v/home/skills 2>/dev/null || exit 0; cat .bundled_manifest 2>/dev/null; echo ---; find . -name SKILL.md' 2>&1)" ||
      { echo "$h: skills: FAILED: could not read $vol: $found"; FAILED=1; continue; }
    dirs="$(printf '%s\n' "$found" | "$KIT_NODE" "$HERE/kit/rc-skills.mjs" remove "$allow" 2>&1)" || { echo "$h: skills: FAILED: $dirs"; FAILED=1; continue; }
    n="$(grep -c . <<<"$dirs" || true)"
    if [ "$n" = 0 ]; then echo "$h: skills: no bundled skill beyond what its settings name"; continue; fi
    if [ -n "$CHECK" ]; then echo "$h: skills: would remove $n bundled skill(s): $(tr '\n' ' ' <<<"$dirs")"; continue; fi
    # shellcheck disable=SC2086 # one folder a line, each ./<names>/ with no space in it
    out="$(dk run --rm --network none --read-only --user 0:0 -v "$vol:/v" --entrypoint /bin/sh "$HERMES_IMAGE" -c 'cd /v/home/skills && rm -rf -- "$@"' sh $dirs 2>&1)" ||
      { echo "$h: skills: FAILED: could not remove them: $out"; FAILED=1; continue; }
    echo "$h: skills: removed $n bundled skill(s) its settings don't name; its engine sees it at its next start"
  done 4<<<"$plan"
}
skills_step

# Agents whose model can use another agent's key.
rc_cli agent-models </dev/null | kit warn "$SITE" || true
exit "$FAILED"
