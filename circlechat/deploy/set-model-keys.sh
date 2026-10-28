#!/usr/bin/env bash
# Put a stack's cloud key values in the stack's GitHub environment, as MODEL_KEY_<NAME> secrets:
# one for each key in the stack's model_keys. The "Deploy secrets" workflow then writes them to the
# gateway's secrets file.
#
#   ./circlechat/deploy/set-model-keys.sh <stack site.json> <owner/private repo>
#
# Run it yourself, in a terminal, outside Claude Code. It asks for each value at the keyboard,
# never shows the value, and passes the value to gh on stdin, never on a command line. It refuses to
# run without a person at the keyboard, or inside a Claude Code session.
set -euo pipefail
SITE="${1:?usage: set-model-keys.sh <stack site.json> <owner/private repo>}"
REPO="${2:?usage: set-model-keys.sh <stack site.json> <owner/private repo>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
if [ -n "${CLAUDECODE:-}" ] || [ ! -t 0 ] || [ ! -t 1 ]; then
  echo "Run set-model-keys.sh yourself, in your own terminal, outside Claude Code. A key's value goes in only at the keyboard."
  exit 1
fi
command -v gh >/dev/null || { echo "Install the GitHub CLI (gh) and sign in first."; exit 1; }
[ -f "$SITE" ] || { echo "No $SITE."; exit 1; }

# The stack's GitHub environment: border for the stack with no tenant name, client-<name> otherwise.
# One line per key: <secret name><TAB><key name><TAB><provider><TAB><model>.
INFO="$(node --input-type=module -e '
  import fs from "node:fs";
  const { keySecret } = await import(process.argv[2]);
  const s = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
  console.log(s.site?.tenant ? `client-${s.site.tenant}` : "border");
  for (const [name, k] of Object.entries(s.model_keys ?? {})) console.log([keySecret(name), name, k.provider, k.model].join("\t"));
' "$SITE" "$HERE/../kit/render.mjs")"
ENV="$(head -1 <<<"$INFO")"
KEYS="$(tail -n +2 <<<"$INFO")"
[ -n "$KEYS" ] || { echo "$SITE has no model_keys, so the stack needs no cloud key."; exit 0; }

echo "Stack environment $ENV in $REPO. Paste each key's value; the screen shows nothing."
while IFS=$'\t' read -r secret name provider model; do
  value=""
  read -r -s -p "$secret (key $name: $provider, $model): " value </dev/tty
  echo
  if [ -z "$value" ]; then echo "  skipped $secret"; continue; fi
  printf '%s' "$value" | gh secret set "$secret" --env "$ENV" --repo "$REPO" >/dev/null
  value=""
  echo "  saved $secret"
done <<<"$KEYS"
echo "Next: run the \"Deploy secrets\" workflow for $ENV, and save a copy of each key in the password manager."
