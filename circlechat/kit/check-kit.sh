#!/usr/bin/env bash
# Check the kit checkout that root runs, or that an installer copies into a command root runs.
# Every script that runs as root, and every installer of such a script, runs this check first.
#
#   check-kit.sh <kit folder> [<owner account>] [<owner's home folder>]
#
# The check refuses the kit checkout in three cases:
#   - The checkout sits inside an agents' workspace, which every agent container mounts and can
#     change: $WS, ~/circlechat-workspace, or ~/tenants/<stack>/workspace.
#   - The group or other accounts can change a file or folder in the checkout, or a folder above
#     the checkout. A root-owned folder with the sticky bit, such as /tmp, passes: other accounts
#     can add files there, but cannot rename or delete the owner's folder.
#   - An account other than the owner owns a file or folder in the checkout. A folder above the
#     checkout belongs to the owner or to root.
# The owner is the account that owns the stacks. Without one, the owner of the home folder is used.
# Use a checkout outside the workspace, such as ~/recursica-knowledge.
set -euo pipefail
KIT_IN="${1:?usage: check-kit.sh <kit folder> [<owner account>] [<owner home folder>]}"
OWNER_HOME="${3:-${OWNER_HOME:-$HOME}}"
OWNER="${2:-$(ls -ld "$OWNER_HOME" | awk '{ print $3 }')}"
KIT="$(cd -P "$KIT_IN" && pwd -P)" || { echo "No kit checkout at $KIT_IN."; exit 1; }
fail() { echo "Refusing the kit checkout $KIT: $1 Use a checkout outside the agents' workspace that only $OWNER can change, such as $OWNER_HOME/recursica-knowledge."; exit 1; }

# The agents' workspaces, as real paths: a link to a workspace counts as the workspace.
spaces=("$OWNER_HOME/circlechat-workspace")
[ -n "${WS:-}" ] && spaces+=("$WS")
for d in "$OWNER_HOME"/tenants/*/workspace; do [ -e "$d" ] && spaces+=("$d"); done
for w in "${spaces[@]}"; do
  [ -d "$w" ] || continue
  w="$(cd -P "$w" && pwd -P)"
  case "$KIT/" in "$w/"*) fail "the checkout sits inside the agents' workspace $w." ;; esac
done

# find's -perm and -user work the same with GNU find (Linux) and BSD find (macOS).
f="$(find "$KIT" ! -type l \( -perm -g+w -o -perm -o+w \) -print -quit 2>/dev/null || true)"
[ -z "$f" ] || fail "the group or other accounts can change $f. Run: chmod -R go-w $KIT"
f="$(find "$KIT" ! -user "$OWNER" -print -quit 2>/dev/null || true)"
[ -z "$f" ] || fail "$f belongs to $(ls -ld "$f" | awk '{ print $3 }'), not $OWNER."
d="$(dirname "$KIT")"
while :; do
  [ -z "$(find "$d" -maxdepth 0 \( -perm -g+w -o -perm -o+w \) ! \( -perm -1000 -user root \) -print)" ] || fail "the group or other accounts can change $d, a folder above the checkout."
  [ -n "$(find "$d" -maxdepth 0 \( -user "$OWNER" -o -user root \) -print)" ] || fail "$d, a folder above the checkout, belongs to neither $OWNER nor root."
  [ "$d" = / ] && break
  d="$(dirname "$d")"
done
