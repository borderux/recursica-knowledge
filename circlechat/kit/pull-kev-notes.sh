#!/usr/bin/env bash
# The first step of Kev's nightly training: the reviewed Kev labels and disagreement notes, from
# the main branch of the private repo in data.repo, and from nowhere else. A label or a note reaches
# main only through a pull request a person merged (push-data.sh opens each one). Off unless
# site.json sets data.repo.
#
# Writes the two files Kev's training reads its labels from (tools/kev/evals/README.md):
#   $CC_DIR/kev-reviewed/kev-labels.jsonl          only the real-review labels: a line whose run
#                                                  isn't "review", or that isn't a label, is
#                                                  dropped and counted (kev-labels.mjs filter), so
#                                                  an eval label never reaches training, even if a
#                                                  person merged one
#   $CC_DIR/kev-reviewed/kev-disagreements.md      CircleChat 1.x Barb's notes
# Each file is read from origin/main with git show, never from a working tree or another branch, so
# a notes branch that waits for review never reaches training. A file missing on main gives an
# empty file.
set -euo pipefail
HERE="$(cd "$(dirname "$0")" && pwd)"
# The stack's folder, by its new name or CircleChat 1.x's old one (stack-paths.sh).
# shellcheck source=circlechat/kit/stack-paths.sh
. "$HERE/stack-paths.sh"
CC_DIR="${CC_DIR:-$(stack_dir "$HOME")}"
SITE="${SITE:-$CC_DIR/site.json}"
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
tmp="$(mktemp "$OUT/.new.XXXXXX")"
{ git -C "$REPO" show "origin/main:kev-labels.jsonl" 2>/dev/null || true; } | node "$HERE/kev-labels.mjs" filter > "$tmp" || { rm -f "$tmp"; exit 1; }
mv -f "$tmp" "$OUT/kev-labels.jsonl"
