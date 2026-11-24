#!/usr/bin/env bash
# Rotate the cluster's shared tokens: CLUSTER_TOKEN, JOBD_TOKEN and KEV_API_KEY. A person runs this
# on any computer with gh and Node, from the kit's checkout:
#
#   circlechat/deploy/rotate-tokens.sh --repo <owner>/<stacks repo> --site <the stack's site.json>
#                                      [--only cluster|jobd|kev]... [--check]
#
# The command asks for a one-day GitHub token, which a person pastes and nobody sees. See
# circlechat/README.md, "Rotate the shared tokens", for the token's permissions. For each token in
# turn, the command makes a new random value, saves the value as the secret in the stack's GitHub
# environment through stdin, and runs the Deploy secrets workflow for each computer that reads the
# token. No value is ever printed, written to a file here, or put on a command line.
#
# The order keeps each switch short:
#   0. Checks, before anything changes: the token's permissions, and, for KEV_API_KEY, a check run
#      on each computer with a kev-engine (Barb isn't running, and the engine is idle).
#   1. CLUSTER_TOKEN: every computer's run at once. The cluster agents restart.
#   2. JOBD_TOKEN: each computer that runs jobd, and the control computer, at once. jobd restarts.
#   3. KEV_API_KEY, with KEV_ENGINE_KEY set to the same value: one computer at a time, best engine
#      first. Each run checks again, then restarts kev-engine once, with the new key. This command
#      is the only thing that restarts kev-engine (deploy/apply-secrets.sh).
# Each Deploy secrets run writes every secret in the environment, so the command changes one token,
# deploys it everywhere, and only then changes the next one.
#
# --check runs step 0 and changes nothing. --only rotates the named tokens only.
set -euo pipefail
GH="${GH:-gh}"
POLL="${ROTATE_POLL_SECONDS:-5}"
QUEUED_MAX="${ROTATE_QUEUED_MAX_SECONDS:-600}"
WORKFLOW=deploy-secrets.yml

# Who calls each service today, with the key the caller holds. A new caller adds a line here, and
# the rotation must write the caller's key. Barb and Porter called kev-engine and jobd from
# CircleChat 1.x, which was retired on 2026-11-21.
CALLERS_KEV=""
CALLERS_JOBD=""

REPO="" SITE="" CHECK_ONLY=false ONLY="" LAST_RUNS=()
while [ $# -gt 0 ]; do
  case "$1" in
    --repo) REPO="${2:?--repo needs <owner>/<name>}"; shift 2 ;;
    --site) SITE="${2:?--site needs a file}"; shift 2 ;;
    --only) case "${2:-}" in cluster|jobd|kev) ONLY="$ONLY $2" ;; *) echo "--only takes cluster, jobd or kev."; exit 1 ;; esac; shift 2 ;;
    --check) CHECK_ONLY=true; shift ;;
    *) echo "Unknown option $1. Read the comment at the top of $0."; exit 1 ;;
  esac
done
[[ "$REPO" =~ ^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$ ]] || { echo "--repo <owner>/<name> is required: the private repo of stacks."; exit 1; }
[ -f "$SITE" ] || { echo "--site <file> is required: the stack's site.json, from the repo of stacks."; exit 1; }
wants() { [ -z "$ONLY" ] || [[ " $ONLY " == *" $1 "* ]]; }

# The stack's computers, from site.json, one list per token:
#   ENV       the GitHub environment: site.stack_name, or "cluster"
#   ALL       every computer: each runs a cluster agent
#   JOBS      each computer that runs jobd, then the control computer, which keeps a copy in .env
#   KEV       each computer with a service that reads KEV_API_KEY, best engine first (kev.priority)
#   CONTROL   the control computer, which keeps KEV_ENGINE_KEY in .env
read -r ENV ALL JOBS KEV CONTROL < <(node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
  const nodes = s.nodes ?? [];
  const control = nodes.find((n) => n.control)?.name ?? "";
  const list = (a) => [...new Set(a)].join(",") || "-";
  const kev = nodes.filter((n) => (n.services ?? []).some((v) => (v.secret_env ?? []).includes("KEV_API_KEY")))
    .sort((a, b) => (a.kev?.priority ?? 99) - (b.kev?.priority ?? 99)).map((n) => n.name);
  console.log([s.site?.stack_name || "cluster", list(nodes.map((n) => n.name)), list([...nodes.filter((n) => n.jobs).map((n) => n.name), control].filter(Boolean)), list(kev), control || "-"].join(" "));
' "$SITE")
csv() { [ "$1" = - ] || printf '%s' "${1//,/ }"; }
[ "$CONTROL" != - ] || { echo "$SITE names no control computer."; exit 1; }

# The one-day token: pasted at a hidden prompt, or read from stdin when stdin isn't a terminal.
if [ -t 0 ]; then
  printf 'Paste the one-day GitHub token for %s (nothing shows): ' "$REPO" >&2
  IFS= read -rs TOKEN; echo >&2
else
  IFS= read -r TOKEN || true
fi
[ -n "$TOKEN" ] || { echo "No token given. Nothing changed."; exit 1; }
# gh gets the token in its own environment only, never in this shell's exports or on a command line.
ghx() { GH_TOKEN="$TOKEN" GH_PROMPT_DISABLED=1 "$GH" "$@"; }

# One field of the JSON on stdin, by a JavaScript expression of j.
jget() { node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => { const j = JSON.parse(s || "null"); const v = (new Function("j", `return (${process.argv[1]})`))(j); if (v !== undefined && v !== null) console.log(v); });' "$1"; }

# A new value: 32 random bytes, as hex, with no line break.
new_value() { openssl rand -hex 32 | tr -d '\n'; }
# Save one secret in the environment, with the value on stdin.
save_secret() { ghx secret set "$1" --env "$ENV" --repo "$REPO" >/dev/null; }
# The rotation's proof of the value on stdin, as deploy/apply-secrets.sh checks it.
proof() { node -e 'let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => process.stdout.write(require("crypto").createHash("sha256").update("kev-rotation\n" + s).digest("hex")));'; }

# The newest Deploy secrets run's id, or 0.
newest_run() { ghx run list --repo "$REPO" --workflow "$WORKFLOW" --limit 1 --json databaseId | jget 'j[0]?.databaseId ?? 0'; }

# Start one Deploy secrets run, and print its id.
#   start_run <computer> <restart> [<kev_rotation>]
start_run() {
  local computer="$1" restart="$2" rotation="${3:-}" before title id t=0 out
  before="$(newest_run)"
  title="Deploy secrets: $ENV on $computer"
  case "$rotation" in "") ;; check) title="$title, key rotation check" ;; *) title="$title, key rotation" ;; esac
  if ! out="$(ghx workflow run "$WORKFLOW" --repo "$REPO" -f stack="$ENV" -f computer="$computer" -f restart="$restart" -f kev_rotation="$rotation" 2>&1)"; then
    case "$out" in *kev_rotation*|*"Unexpected inputs"*) echo "The Deploy secrets workflow in $REPO has no kev_rotation input. Copy the kit's circlechat/deploy/deploy-secrets.yml to the repo's .github/workflows/ first." >&2 ;;
      *) echo "GitHub refused to start Deploy secrets for $computer: $out" >&2 ;; esac
    return 1
  fi
  while :; do
    id="$(ghx run list --repo "$REPO" --workflow "$WORKFLOW" --limit 20 --json databaseId,displayTitle \
      | jget "j.filter((r) => r.databaseId > $before && r.displayTitle === $(node -e 'console.log(JSON.stringify(process.argv[1]))' "$title")).map((r) => r.databaseId).sort((a, b) => a - b)[0]")"
    [ -z "$id" ] || { echo "$id"; return 0; }
    [ "$t" -lt 60 ] || { echo "GitHub shows no run for $computer a minute after the start." >&2; return 1; }
    sleep "$POLL"; t=$((t + POLL))
  done
}

# Wait for runs to end. Prints each run's result, and the end of a failed run's log, which holds
# secret names and the helper's lines, never a value: GitHub masks each secret in the log.
#   wait_runs <computer>=<id>...   Returns 1 when a run didn't succeed.
wait_runs() {
  local pair computer id state t ok=0 waited
  for pair in "$@"; do
    computer="${pair%%=*}" id="${pair#*=}" waited=0
    while :; do
      state="$(ghx run view "$id" --repo "$REPO" --json status,conclusion | jget 'j.status + " " + (j.conclusion || "")')"
      case "$state" in completed*) break ;; queued*|waiting*|pending*|requested*) waited=$((waited + POLL)) ;; esac
      if [ "$waited" -ge "$QUEUED_MAX" ]; then echo "  $computer: no runner took the run in $((QUEUED_MAX / 60)) minutes. Is the runner on $computer online? Run $id is cancelled."; ghx run cancel "$id" --repo "$REPO" >/dev/null 2>&1 || true; ok=1; continue 2; fi
      sleep "$POLL"
    done
    t="${state#completed }"
    if [ "$t" = success ]; then echo "  $computer: done (run $id)."
    else
      echo "  $computer: $t (run $id). The run's last lines:"
      ghx run view "$id" --repo "$REPO" --log-failed 2>/dev/null | cut -f3- | sed -E 's/^[0-9]{4}-[0-9-]+T[0-9:.]+Z *//' | grep -vE '^##\[' | tail -n 12 | sed 's/^/      /'
      ok=1
    fi
  done
  return "$ok"
}

# Start one run on each computer at once, then wait for every run.
#   deploy_all <restart> <kev_rotation> <computer>...
deploy_all() {
  local restart="$1" rotation="$2" c id runs=()
  shift 2
  for c in "$@"; do id="$(start_run "$c" "$restart" "$rotation")" || return 1; runs+=("$c=$id"); done
  LAST_RUNS=("${runs[@]}")
  wait_runs "${runs[@]}"
}

# A check run of an older helper ignores kev_rotation, and ends like a deploy with restart off. Only
# the new helper (deploy/apply-secrets.sh) writes that the engine may stop, so each check run's log
# must hold that line.
checked_by_new_helper() {
  local pair computer id log ok=0
  for pair in "${LAST_RUNS[@]}"; do
    computer="${pair%%=*}" id="${pair#*=}"
    log="$(ghx run view "$id" --repo "$REPO" --log 2>/dev/null || true)"
    if [[ "$log" != *"kev-engine on $computer may stop for the key rotation"* ]]; then
      echo "  $computer runs an older secrets helper, which can't check kev-engine. The hourly update installs the new helper. Run this command again after the update."
      ok=1
    fi
  done
  return "$ok"
}

echo "Rotating the shared tokens of stack $ENV, in $REPO."

# 0. Checks. Nothing changes until every check passes.
echo "Checks:"
ghx api "repos/$REPO" >/dev/null 2>&1 || { echo "  The token can't read $REPO. Give it access to the repo, with the permissions in circlechat/README.md, \"Rotate the shared tokens\"."; exit 1; }
ghx api "repos/$REPO/environments/$ENV/secrets/public-key" >/dev/null 2>&1 || { echo "  The token can't read the secrets of environment $ENV. Give it Environments: read and write."; exit 1; }
ghx api "repos/$REPO/actions/workflows/$WORKFLOW" >/dev/null 2>&1 || { echo "  The token can't read the Deploy secrets workflow ($WORKFLOW). Give it Actions: read and write, and check that the workflow is in .github/workflows/."; exit 1; }
echo "  The token reaches $REPO, the secrets of environment $ENV, and the Deploy secrets workflow."
if wants jobd; then
  if [ -z "$CALLERS_JOBD" ]; then echo "  Nothing calls jobd today, so the rotation changes JOBD_TOKEN on both sides: each jobd, and the control computer's copy."
  else echo "  jobd's callers: $CALLERS_JOBD."; fi
fi
if wants kev; then
  if [ -z "$CALLERS_KEV" ]; then echo "  Nothing calls kev-engine today, so the rotation changes both sides: KEV_API_KEY in each engine, and KEV_ENGINE_KEY, the callers' copy."
  else echo "  kev-engine's callers: $CALLERS_KEV."; fi
  if [ "$KEV" = - ]; then echo "  No computer runs a service that reads KEV_API_KEY."
  else
    echo "  kev-engine may stop only while Barb isn't running and the engine handles no request. A check run on each computer with a kev-engine:"
    # shellcheck disable=SC2046  # one word for each computer
    deploy_all false check $(csv "$KEV") || { echo "kev-engine may not stop now, and the run's lines say why. Nothing changed."; exit 1; }
    checked_by_new_helper || { echo "Nothing changed."; exit 1; }
  fi
fi
if [ "$CHECK_ONLY" = true ]; then echo "Every check passed. --check changes nothing."; exit 0; fi

# 1. CLUSTER_TOKEN: every computer at once, so the agents' switch is short.
if wants cluster; then
  echo "CLUSTER_TOKEN: a new value, then every computer at once."
  new_value | save_secret CLUSTER_TOKEN
  # shellcheck disable=SC2046
  deploy_all true "" $(csv "$ALL") || { echo "CLUSTER_TOKEN is new in GitHub, and a computer's run failed. Run Deploy secrets again for that computer, with restart on. Until then, the computers whose runs failed can't reach the others, and after 3 minutes each side posts that the other doesn't answer."; exit 1; }
fi

# 2. JOBD_TOKEN: each jobd and the control computer at once.
if wants jobd; then
  echo "JOBD_TOKEN: a new value, then each computer that runs jobd, and the control computer, at once."
  new_value | save_secret JOBD_TOKEN
  # shellcheck disable=SC2046
  deploy_all true "" $(csv "$JOBS") || { echo "JOBD_TOKEN is new in GitHub, and a computer's run failed. Run Deploy secrets again for that computer, with restart on."; exit 1; }
fi

# 3. KEV_API_KEY and KEV_ENGINE_KEY, the same value: one computer at a time, best engine first, so
# one engine still answers while the other one restarts. Kev moves on to the next engine when an
# engine refuses its key (tools/kev/src/failover.mjs).
if wants kev; then
  echo "KEV_API_KEY and KEV_ENGINE_KEY: one new value, then one computer at a time, best engine first."
  KEY="$(new_value)"
  printf '%s' "$KEY" | save_secret KEV_API_KEY
  printf '%s' "$KEY" | save_secret KEV_ENGINE_KEY
  PROOF="$(printf '%s' "$KEY" | proof)"
  KEY=""
  for c in $(csv "$KEV"); do
    deploy_all true "$PROOF" "$c" || {
      echo "KEV_API_KEY is new in GitHub, and kev-engine on $c keeps its old key: its run wrote nothing. The engines before $c in the list run with the new key."
      echo "Run this command again with --only kev, before any other Deploy secrets run. Another run would write the new key without a restart, and kev-engine would then hold a key that differs from its file."
      exit 1
    }
  done
  # The control computer keeps the callers' copy, KEV_ENGINE_KEY, in .env.
  if [[ ",$KEV," != *",$CONTROL,"* ]]; then deploy_all true "" "$CONTROL" || { echo "The control computer's run failed. Run Deploy secrets again for $CONTROL."; exit 1; }; fi
fi
echo "Done. Each token that this run rotated is new in GitHub and on each computer that reads it."
