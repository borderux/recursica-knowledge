#!/usr/bin/env bash
# Open Stu locally from this folder — no ~/.buzz layout required.
#
# Copy stu.env.example to stu.env and fill it in first — this repository stores no channel,
# project, or slug of its own. Then double-click it in Finder, or run it from a terminal:
#
#   ./start.command                    # everything from stu.env, opens a browser
#   ./start.command --port 4400        # alongside another copy
#   ./start.command --slug acme --channel <uuid> --project <gcp-project>
#
# This is the portable sibling of ~/.buzz/bin/stu. That launcher runs Stu as a long-lived
# launchd job wired into Buzz Desktop's lifetime, which is right for an agent starting the
# explorer and wrong for a folder someone checked out. This one runs in the foreground and
# stops with Ctrl-C, so what you get is exactly what you see.
#
# The server imports only Node builtins — it talks to BigQuery over REST and signs its own JWT —
# so nothing is installed for it. The web UI is a different matter: no build is committed, so
# the first run needs npm and a network, and after that `web/dist` is there.

set -euo pipefail

HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$HERE"

# Settings live in stu.env, which is gitignored, so a checkout of this folder carries no
# client's identity and can be pointed at any channel without editing the script. Anything on
# the command line still wins.
# shellcheck disable=SC1091
[[ -f "$HERE/stu.env" ]] && source "$HERE/stu.env"

SLUG="${STU_SLUG:-}"
CHANNEL="${STU_CHANNEL:-}"
PROJECT="${STU_PROJECT:-}"
PORT="${STU_PORT:-4317}"
KEY="${STU_BQ_KEY:-}"
OPEN_BROWSER=1

while [[ $# -gt 0 ]]; do
  case "$1" in
    --slug)      SLUG="$2"; shift 2 ;;
    --channel)   CHANNEL="$2"; shift 2 ;;
    --project)   PROJECT="$2"; shift 2 ;;
    --port)      PORT="$2"; shift 2 ;;
    --key)       KEY="$2"; shift 2 ;;
    --no-open)   OPEN_BROWSER=0; shift ;;
    -h|--help)   sed -n '2,18p' "$0" | sed 's/^# \{0,1\}//'; exit 0 ;;
    *) echo "start.command: unknown argument $1" >&2; exit 1 ;;
  esac
done

die() { echo "start.command: $*" >&2; echo; read -r -p "Press return to close." _ 2>/dev/null || true; exit "${2:-1}"; }

# Named separately from the regex check below: "you have not set this up yet" and "what you set
# is malformed" are different problems and only one of them is answered by stu.env.example.
[[ -n "$SLUG" ]] || die "no channel slug. Copy stu.env.example to stu.env and fill it in,
  or pass --slug <slug> --project <gcp-project> --channel <uuid>."
[[ -n "$PROJECT" ]] || die "no Google Cloud project. Set STU_PROJECT in stu.env, or pass --project."

[[ "$SLUG" =~ ^[a-z0-9][a-z0-9-]*$ ]] || die "--slug must be lowercase alphanumeric with hyphens: got \"$SLUG\""

# -------------------------------------------------------------------- node

# Finder hands a double-clicked script a login shell, but not necessarily one that has seen
# nvm/homebrew. Fall back to the Node that Buzz Desktop bundles before giving up.
BUZZ_HOME="${BUZZ_HOME:-$HOME/.buzz}"
NODE_BIN="${STU_NODE:-$(command -v node || true)}"
if [[ -z "$NODE_BIN" || ! -x "$NODE_BIN" ]]; then
  NODE_BIN="$(ls -1 "$HOME/Library/Application Support/Buzz/runtimes/node"/*/*/bin/node 2>/dev/null | tail -1 || true)"
fi
[[ -n "$NODE_BIN" && -x "$NODE_BIN" ]] || die "no Node found. Install Node 18 or newer (https://nodejs.org),
  or set STU_NODE to the absolute path of a node binary."

NODE_MAJOR="$("$NODE_BIN" -p 'process.versions.node.split(".")[0]')"
(( NODE_MAJOR >= 18 )) || die "Node $NODE_MAJOR is too old — the server uses global fetch, which needs Node 18+."

# -------------------------------------------------------------------- key

# Search order: what you passed, a key placed beside this folder, then the normal Buzz location.
# The middle one is what makes a zipped copy work on a machine that has no ~/.buzz.
if [[ -z "$KEY" ]]; then
  for candidate in \
    "$HERE/secrets/claire-$SLUG-service-user.json" \
    "$BUZZ_HOME/.secrets/claire-$SLUG-service-user.json"
  do
    [[ -f "$candidate" ]] && { KEY="$candidate"; break; }
  done
fi
[[ -n "$KEY" && -f "$KEY" ]] || die "no BigQuery service-account key found.
  Looked for: $HERE/secrets/claire-$SLUG-service-user.json
              $BUZZ_HOME/.secrets/claire-$SLUG-service-user.json
  Pass one with --key <path>, or drop it at the first path above.
  Keys are deliberately not shipped inside this folder — see README."

# -------------------------------------------------------------------- web build

# No build is committed, so this fires once per checkout and never again. `npm install` also
# fetches the Recursica tokens — @recursica/official-release's postinstall writes
# recursica_variables_scoped.css into web/, which is what postcss.config.js reads.
if [[ ! -f "$HERE/web/dist/index.html" ]]; then
  command -v npm >/dev/null || die "the web UI has not been built and npm is not installed.
  Install Node 18+ (which brings npm), then rerun — the first run needs a network."
  echo "stu: no web build found — installing and building (first run only)"
  ( cd "$HERE/web" && npm install --silent && npm run build --silent ) || die "the web build failed" 2
fi

# -------------------------------------------------------------------- run

URL="http://127.0.0.1:$PORT"

# Reuse rather than fail: a second double-click should show you the app, not a port error.
if BODY="$(curl -fsS --max-time 2 "$URL/api/config" 2>/dev/null)"; then
  if grep -q "\"slug\":\"$SLUG\"" <<<"$BODY"; then
    echo "stu: already running — $URL"
    [[ "$OPEN_BROWSER" == 1 ]] && open "$URL"
    exit 0
  fi
  die "port $PORT is already serving a different channel: $BODY
  Pass --port to run this one alongside it." 2
fi

ARGS=(--slug "$SLUG" --project "$PROJECT" --port "$PORT" --key "$KEY")
[[ -n "$CHANNEL" ]] && ARGS+=(--channel "$CHANNEL")

if [[ "$OPEN_BROWSER" == 1 ]]; then
  # Poll rather than sleep-and-hope: the browser opens when the port actually answers.
  ( for _ in $(seq 1 40); do
      curl -fsS --max-time 1 "$URL/api/config" >/dev/null 2>&1 && { open "$URL"; exit 0; }
      sleep 0.5
    done ) &
fi

echo "stu: $SLUG → $URL   (Ctrl-C to stop)"
exec "$NODE_BIN" "$HERE/server/server.mjs" "${ARGS[@]}"
