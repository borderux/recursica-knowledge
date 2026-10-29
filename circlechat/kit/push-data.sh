#!/usr/bin/env bash
# Push Barb's Kev disagreement notes to a branch of the knowledge repository, so they can be
# reviewed and merged as rule-wording fixes. Off unless site.json sets data.kev_disagreements_branch.
# The notes name rules and file paths, never people; the branch is as public as the repository,
# so leave it off for a deployment whose application code is confidential.
set -euo pipefail
CC_DIR="${CC_DIR:-$HOME/circlechat}"; WS="${WS:-$HOME/circlechat-workspace}"
SITE="${SITE:-$CC_DIR/site.json}"
. "$(dirname "$0")/lib.sh"
BR="$(site_get data.kev_disagreements_branch)"; [ -n "$BR" ] || exit 0
# Barb writes the notes in the shared workspace, which agents can change. The notes are read without
# following a symlink (safe-files.mjs), so no other file on the computer reaches the public branch.
SRC="$WS/reviews/kev-disagreements.md"; [ -f "$SRC" ] || [ -L "$SRC" ] || exit 0
NOTES="$(node "$(dirname "$0")/safe-files.mjs" read "$WS" "$SRC" && echo x)" || exit 1
NOTES="${NOTES%x}"
REPO="$CC_DIR/kev-data"; DEST="tools/kev/evals/kev-disagreements.md"
[ -d "$REPO/.git" ] || git clone -q "$(site_get repos.knowledge)" "$REPO"
cd "$REPO" && git fetch -q origin
if git ls-remote --exit-code --heads origin "$BR" >/dev/null; then git checkout -q -B "$BR" "origin/$BR"
else git checkout -q -B "$BR" origin/main; fi
printf '%s' "$NOTES" > "$DEST" && git add "$DEST"
git diff --cached --quiet && exit 0
git commit -q -m "chore(kev): update Kev disagreements from Barb" && git push -q -u origin "$BR"
