#!/usr/bin/env bash
# The first step of Kev's nightly training: the reviewed Kev disagreement notes, from the main
# branch of the private repo in data.repo, and from nowhere else. A note reaches main only through
# a pull request a person merged (push-data.sh opens each one). Off unless site.json sets data.repo.
#
# Writes $CC_DIR/kev-reviewed/kev-disagreements.md, the one file Kev's training reads its labels
# from (tools/kev/evals/README.md). The file is read from origin/main with git show, never from a
# working tree or another branch, so a notes branch that waits for review never reaches training.
set -euo pipefail
CC_DIR="${CC_DIR:-$HOME/circlechat}"
SITE="${SITE:-$CC_DIR/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
DATA_REPO="$(site_get data.repo)"; [ -n "$DATA_REPO" ] || exit 0
. "$HERE/kev-data-auth.sh"
node "$HERE/kev-data.mjs" check "$DATA_REPO" "$(site_get repos.knowledge)" || exit 1

REPO="$CC_DIR/kev-data-private"; URL="https://github.com/$DATA_REPO.git"; OUT="$CC_DIR/kev-reviewed"
[ -d "$REPO/.git" ] || git clone -q "$URL" "$REPO"
git -C "$REPO" remote set-url origin "$URL"
git -C "$REPO" fetch -q origin main
mkdir -p "$OUT"
tmp="$(mktemp "$OUT/.new.XXXXXX")"
git -C "$REPO" show "origin/main:kev-disagreements.md" > "$tmp" 2>/dev/null || : > "$tmp"
mv -f "$tmp" "$OUT/kev-disagreements.md"
