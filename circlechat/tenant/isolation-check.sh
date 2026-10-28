#!/usr/bin/env bash
# Check that a client stack shares nothing with another stack on this computer: a pass/fail table.
# Runs on a Mac, on Linux and in WSL, while the client's stack is unlocked.
#
#   isolation-check.sh <client>
#
# The rows: the stack's own Docker context and Docker engine, the stack's containers, volumes and
# networks in that engine only, ports no other stack uses, and every folder of the stack inside the
# open disk image. The table leaves out secrets, the gateway and the outgoing filter: check those
# separately.
set -euo pipefail
CLIENT="${1:?client name}"
[[ "$CLIENT" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Client name \"$CLIENT\" must be a slug."; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"
STACK_DIR="$HOME/tenants/$CLIENT"
CTX="colima-$CLIENT"
SITE="$STACK_DIR/circlechat/site.json"
fail=0
row() { printf '%-52s %s\n' "$1" "$2"; [ "$2" = pass ] || fail=1; }
printf '%-52s %s\n' "Check" "Result"

# The disk image is open, and the stack's folder is the image.
status="$(bash "$HERE/disk-image.sh" status "$CLIENT" 2>&1 || true)"
[ "$status" = unlocked ] && row "$STACK_DIR is the open disk image" pass || row "$STACK_DIR is the open disk image" "FAIL: $status"

# The stack's Docker context points at a socket inside the disk image.
endpoint="$(docker context inspect "$CTX" --format '{{.Endpoints.docker.Host}}' 2>/dev/null || true)"
case "$endpoint" in
  "unix://$STACK_DIR/"*) row "Docker context $CTX inside the disk image" pass ;;
  "") row "Docker context $CTX inside the disk image" "FAIL: no context $CTX" ;;
  *) row "Docker context $CTX inside the disk image" "FAIL: $endpoint" ;;
esac

# Each other Docker engine on this computer: the default one and every other stack's VM. A locked
# stack's engine does not answer, and holds nothing of this stack.
own_id="$(docker --context "$CTX" info --format '{{.ID}}' 2>/dev/null || true)"
[ -n "$own_id" ] && row "Docker engine of $CTX answers" pass || row "Docker engine of $CTX answers" "FAIL: no answer"
shared=""; leaked=""
pattern="(^|[-_])$CLIENT([-_]|$)"
for other in $(docker context ls --format '{{.Name}}' 2>/dev/null); do
  [ "$other" = "$CTX" ] && continue
  id="$(docker --context "$other" info --format '{{.ID}}' 2>/dev/null || true)"
  [ -n "$id" ] || continue
  [ "$id" = "$own_id" ] && shared="$shared $other"
  found="$( { docker --context "$other" ps -a --format '{{.Names}}'; docker --context "$other" volume ls --format '{{.Name}}'; \
              docker --context "$other" network ls --format '{{.Name}}'; } 2>/dev/null | grep -E -- "$pattern" || true)"
  [ -n "$found" ] && leaked="$leaked $other:$(printf '%s' "$found" | tr '\n' ',')"
done
[ -z "$shared" ] && row "no other context reaches the same engine" pass || row "no other context reaches the same engine" "FAIL:$shared"
[ -z "$leaked" ] && row "containers, volumes, networks only in $CTX" pass || row "containers, volumes, networks only in $CTX" "FAIL:$leaked"

# Every folder a container of the stack mounts sits inside the disk image. A named volume lives in
# the stack's own engine, on the VM's disk inside the image.
outside=""
if [ -n "$own_id" ]; then
  for c in $(docker --context "$CTX" ps -aq); do
    for src in $(docker --context "$CTX" inspect "$c" --format '{{range .Mounts}}{{if eq .Type "bind"}}{{.Source}} {{end}}{{end}}'); do
      case "$src" in "$STACK_DIR"|"$STACK_DIR/"*|/var/run/docker.sock|/run/docker.sock) ;; *) outside="$outside $src" ;; esac
    done
  done
fi
[ -z "$outside" ] && row "container folders inside $STACK_DIR" pass || row "container folders inside $STACK_DIR" "FAIL:$outside"

# The VM mounts the stack's folder and nothing else from this computer.
conf="$STACK_DIR/colima/$CLIENT/colima.yaml"
mounts="$( (sed -n 's/^ *- *location: *//p' "$conf" 2>/dev/null || true) | tr -d "\"'" | tr '\n' ' ')"
[ "$mounts" = "$STACK_DIR " ] && row "Docker VM mounts $STACK_DIR only" pass || row "Docker VM mounts $STACK_DIR only" "FAIL: ${mounts:-no colima.yaml in the disk image}"

# The stack's three ports, against every other stack's site.json on this computer.
ports() { node -e '
  const s = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8")).site ?? {};
  console.log([s.port, s.preview_port, s.gateway_port].filter((p) => p != null).join(" "));
' "$1"; }
if [ -f "$SITE" ]; then
  mine="$(ports "$SITE")"; clash=""
  for f in "$HOME/circlechat/site.json" "$HOME"/tenants/*/circlechat/site.json; do
    [ -f "$f" ] && [ "$f" != "$SITE" ] || continue
    for p in $(ports "$f"); do [[ " $mine " == *" $p "* ]] && clash="$clash $p($f)"; done
  done
  [ "$(wc -w <<<"$mine")" = 3 ] || clash="$clash site.json sets $(wc -w <<<"$mine") of the three ports"
  [ -z "$clash" ] && row "ports $mine used by no other stack" pass || row "ports used by no other stack" "FAIL:$clash"
else
  row "ports used by no other stack" "FAIL: no $SITE"
fi

[ "$fail" = 0 ] && echo "Stack $CLIENT shares nothing with another stack on $(hostname -s)." \
  || { echo "Stack $CLIENT shares something with another stack on $(hostname -s)."; exit 1; }
