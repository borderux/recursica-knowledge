#!/usr/bin/env bash
# Push Barb's Kev disagreement notes to a private repo (data.repo in site.json), on a new branch,
# and open a pull request there for a person to review. Kev's training reads only the notes a
# person merged into main (pull-kev-notes.sh). Off unless site.json sets data.repo.
#
# The notes name rules and file paths, and can quote the application's code. The job never pushes
# to the knowledge repo or to any public repo: before each push, kev-data.mjs asks GitHub's API for
# the repo's visibility and refuses anything but a private repo. The token is the job's own,
# KEV_DATA_GITHUB_PAT, which the secrets helper writes to $CC_DIR/kev-data.env.
set -euo pipefail
CC_DIR="${CC_DIR:-$HOME/circlechat}"; WS="${WS:-$HOME/circlechat-workspace}"
SITE="${SITE:-$CC_DIR/site.json}"
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
DATA_REPO="$(site_get data.repo)"; [ -n "$DATA_REPO" ] || exit 0
KNOWLEDGE="$(site_get repos.knowledge)"
# Barb writes the notes in the shared workspace, which agents can change. The notes are read without
# following a symlink (safe-files.mjs), so no other file on the computer reaches the repo.
SRC="$WS/reviews/kev-disagreements.md"; [ -f "$SRC" ] || [ -L "$SRC" ] || exit 0
NOTES="$(node "$HERE/safe-files.mjs" read "$WS" "$SRC" && echo x)" || exit 1
NOTES="${NOTES%x}"

. "$HERE/kev-data-auth.sh"
check() { node "$HERE/kev-data.mjs" check "$DATA_REPO" "$KNOWLEDGE"; }
check || exit 1

REPO="$CC_DIR/kev-data-private"; DEST="kev-disagreements.md"; URL="https://github.com/$DATA_REPO.git"
[ -d "$REPO/.git" ] || git clone -q "$URL" "$REPO"
# The address comes from site.json on every run, never from the clone's own settings.
cd "$REPO" && git remote set-url origin "$URL" && git fetch -q --prune origin
git rev-parse -q --verify origin/main >/dev/null || { echo "Refused: $DATA_REPO has no main branch. Give the repo a first commit on main, such as a README. Nothing was pushed." >&2; exit 1; }
# Nothing new: the notes already sit on main, or in the last pull request this job opened.
SENT="$CC_DIR/kit-out/kev-data-sent.sha"
SUM="$(printf '%s' "$NOTES" | git hash-object --stdin)"
[ "$(git rev-parse -q --verify "origin/main:$DEST" 2>/dev/null || true)" != "$SUM" ] || exit 0
[ "$(cat "$SENT" 2>/dev/null || true)" != "$SUM" ] || exit 0

BR="kev-notes/$(date -u +%Y%m%d-%H%M%S)"
git checkout -q -B "$BR" origin/main
printf '%s' "$NOTES" > "$DEST" && git add "$DEST"
git commit -q -m "Kev disagreement notes from Barb"
# The visibility can change between runs, and during this one. Check again right before the push.
check || exit 1
git push -q origin "HEAD:refs/heads/$BR"
node "$HERE/kev-data.mjs" pr "$DATA_REPO" "$BR"
mkdir -p "$(dirname "$SENT")" && printf '%s\n' "$SUM" > "$SENT"
