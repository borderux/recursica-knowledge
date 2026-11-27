#!/usr/bin/env bash
# Push Kev's review data to a private repo (data.repo in site.json), on a new branch, and open a
# pull request there for a person to review. Kev's training reads only what a person merged into
# main (pull-kev-notes.sh). Off unless site.json sets data.repo. Two kinds of data go:
#   - kev-labels.jsonl: the Kev labels each design review's harness writes into its own label
#     folder (kev_labels of its entry in recursicachat.services; kev-labels.mjs). Only real-review
#     labels go: a file with any eval label, or any line that isn't a label, is refused whole.
#   - kev-disagreements.md: the notes CircleChat 1.x's Barb wrote in the shared workspace.
#
# The data names rules and file paths, and can quote the application's code. The job never pushes
# to the knowledge repo or to any public repo: before each push, kev-data.mjs asks GitHub's API for
# the repo's visibility and refuses anything but a private repo. The token comes from the push's
# own GitHub App, which has Contents and Pull requests on data.repo only (kev-data-auth.sh). The
# commit's author is the app's bot. A refused label folder or file is named in one line, and the
# job still pushes the rest, then exits 1.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
# The stack's folder and the workspace, by their new names or CircleChat 1.x's old ones (stack-paths.sh).
# shellcheck source=circlechat/kit/stack-paths.sh
. "$HERE/stack-paths.sh"
CC_DIR="${CC_DIR:-$(stack_dir "$HOME")}"; WS="${WS:-$(workspace_dir "$HOME")}"
SITE="${SITE:-$CC_DIR/site.json}"
. "$HERE/lib.sh"
DATA_REPO="$(site_get data.repo)"; [ -n "$DATA_REPO" ] || exit 0
KNOWLEDGE="$(site_get repos.knowledge)"
# Barb writes the notes in the shared workspace, which agents can change. The notes are read without
# following a symlink (safe-files.mjs), so no other file on the computer reaches the repo.
SRC="$WS/reviews/kev-disagreements.md"; NOTES=""; HAVE_NOTES=""
if [ -f "$SRC" ] || [ -L "$SRC" ]; then
  NOTES="$(node "$HERE/safe-files.mjs" read "$WS" "$SRC" && echo x)" || exit 1
  NOTES="${NOTES%x}"; HAVE_NOTES=1
fi
# The labels from every label folder. Exit 3: something was refused, and the rest still goes.
LABELS="$(node "$HERE/kev-labels.mjs" gather "$SITE"; echo "x$?")"
RC="${LABELS##*x}"; LABELS="${LABELS%x*}"; REFUSED=""
case "$RC" in
  0) ;;
  3) REFUSED=1 ;;
  *) echo "Refused: the Kev labels could not be gathered (the lines above say why). Nothing was pushed." >&2; exit 1 ;;
esac
# The end of a run with nothing more to push: 1 when anything was refused, so the job shows it.
finish() { [ -z "$REFUSED" ] || exit 1; exit 0; }
[ -n "$HAVE_NOTES" ] || [ -n "$LABELS" ] || finish

. "$HERE/kev-data-auth.sh"
check() { node "$HERE/kev-data.mjs" check "$DATA_REPO" "$KNOWLEDGE"; }
check || exit 1

REPO="$CC_DIR/kev-data-private"; DEST="kev-disagreements.md"; LDEST="kev-labels.jsonl"; URL="https://github.com/$DATA_REPO.git"
[ -d "$REPO/.git" ] || git clone -q "$URL" "$REPO"
# The address comes from site.json on every run, never from the clone's own settings.
cd "$REPO" && git remote set-url origin "$URL" && git fetch -q --prune origin
git rev-parse -q --verify origin/main >/dev/null || { echo "Refused: $DATA_REPO has no main branch. Give the repo a first commit on main, such as a README. Nothing was pushed." >&2; exit 1; }
TMP="$(mktemp -d)"; trap 'rm -rf "$TMP"' EXIT
# The labels: main's file, then each new label not on main yet.
git show "origin/main:$LDEST" > "$TMP/main.jsonl" 2>/dev/null || : > "$TMP/main.jsonl"
MAIN_LABELS="$(cat "$TMP/main.jsonl" && echo x)"; MAIN_LABELS="${MAIN_LABELS%x}"
MERGED="$(printf '%s' "$LABELS" | node "$HERE/kev-labels.mjs" merge "$TMP/main.jsonl" && echo x)" || exit 1
MERGED="${MERGED%x}"
NEW_LABELS=""; [ "$MERGED" = "$MAIN_LABELS" ] || NEW_LABELS=1
NSUM=""; NEW_NOTES=""
if [ -n "$HAVE_NOTES" ]; then
  NSUM="$(printf '%s' "$NOTES" | git hash-object --stdin)"
  [ "$(git rev-parse -q --verify "origin/main:$DEST" 2>/dev/null || true)" = "$NSUM" ] || NEW_NOTES=1
fi
# Nothing new: the notes and the labels already sit on main, or in the last pull request this job opened.
[ -n "$NEW_NOTES" ] || [ -n "$NEW_LABELS" ] || finish
SENT="$CC_DIR/kit-out/kev-data-sent.sha"
SUM="$NSUM $(printf '%s' "$MERGED" | git hash-object --stdin)"
[ "$(cat "$SENT" 2>/dev/null || true)" != "$SUM" ] || finish

BR="kev-notes/$(date -u +%Y%m%d-%H%M%S)"
git checkout -q -B "$BR" origin/main
[ -z "$HAVE_NOTES" ] || { printf '%s' "$NOTES" > "$DEST" && git add "$DEST"; }
[ -z "$NEW_LABELS" ] || { printf '%s' "$MERGED" > "$LDEST" && git add "$LDEST"; }
git commit -q -m "Kev review data: labels from the design reviews, and Barb's notes"
# The visibility can change between runs, and during this one. Check again right before the push.
check || exit 1
git push -q origin "HEAD:refs/heads/$BR"
node "$HERE/kev-data.mjs" pr "$DATA_REPO" "$BR"
mkdir -p "$(dirname "$SENT")" && printf '%s\n' "$SUM" > "$SENT"
finish
