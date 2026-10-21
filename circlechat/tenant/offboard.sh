#!/usr/bin/env bash
# Remove a client: a final encrypted archive, then the client's stack, gone from every computer.
#
#   offboard.sh archive <client>   on the control computer; the new archive key arrives on stdin
#   offboard.sh remove <client>    on each computer that runs anything for the client
#   offboard.sh check <client>     on each computer: a pass/fail table of anything left
#
# The archive key is new, made in the password manager for this archive alone. The key never
# stays on a computer. The archive goes to the backups remote, in archive-<client>-<date>; move the
# folder into the Archive folder in Google Drive by hand afterwards.
set -euo pipefail
CMD="${1:?archive|remove|check}"; CLIENT="${2:?client name}"
[[ "$CLIENT" =~ ^[a-z0-9][a-z0-9-]*$ ]] || { echo "Client name \"$CLIENT\" must be a slug."; exit 1; }
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/../kit/lib.sh"
STACK_DIR="$HOME/tenants/$CLIENT"
CC_DIR="$STACK_DIR/circlechat"
export RCLONE_CONFIG="${RCLONE_CONFIG:-$HOME/.config/rclone/rclone.conf}"

case "$CMD" in
archive)
  [ -f "$CC_DIR/kit-out/tenant.env" ] || { echo "Stack $CLIENT is not open on this computer. Run the Unlock stack workflow first."; exit 1; }
  . "$CC_DIR/kit-out/tenant.env"
  [ -n "$BACKUP_REMOTE" ] || { echo "site.json has no backup.remote."; exit 1; }
  [ -n "$DOCKER_CONTEXT" ] && export DOCKER_CONTEXT
  export RESTIC_PASSWORD; RESTIC_PASSWORD="$(cat)"
  [ "${#RESTIC_PASSWORD}" -ge 24 ] || { echo "The archive key must be at least 24 characters."; exit 1; }
  NAME="archive-$CLIENT-$(date -u +%Y-%m-%d)"
  export RESTIC_REPOSITORY="rclone:$BACKUP_REMOTE/$NAME"
  STAGE="$STACK_DIR/archive-staging"; rm -rf "$STAGE"; mkdir -p "$STAGE"; chmod 700 "$STAGE"
  (cd "$CC_DIR" && docker compose exec -T postgres pg_dump -U postgres circlechat) | gzip > "$STAGE/db.sql.gz"
  docker run --rm -v "${COMPOSE_PROJECT_NAME}_miniodata:/data:ro" -v "$STAGE:/out" alpine:3.20 tar czf /out/minio.tgz -C /data .
  restic init >/dev/null
  restic backup --tag "$CLIENT" --tag final "$STAGE" "$CC_DIR/hermes-homes" "$STACK_DIR/workspace" "$CC_DIR/site.json" \
    --exclude "$CC_DIR/hermes-homes/**/.env" >/dev/null
  rm -rf "$STAGE"
  # Prove the archive restores before anything is deleted.
  SCRATCH="$STACK_DIR/archive-test"; rm -rf "$SCRATCH"; mkdir -p "$SCRATCH"; chmod 700 "$SCRATCH"
  restic restore latest --target "$SCRATCH" >/dev/null
  db="$(find "$SCRATCH" -name db.sql.gz | head -1)"
  ok=true
  { [ -n "$db" ] && gzip -t "$db" && gzip -dc "$db" | grep -q "CREATE TABLE"; } || ok=false
  [ -n "$(find "$SCRATCH" -name minio.tgz | head -1)" ] || ok=false
  [ -d "$(find "$SCRATCH" -type d -name hermes-homes | head -1)" ] || ok=false
  rm -rf "$SCRATCH"; unset RESTIC_PASSWORD
  [ "$ok" = true ] || { echo "The archive did not restore cleanly. Nothing was deleted."; exit 1; }
  echo "Archive $NAME written and test-restored. Next: move the $NAME folder into the Archive folder in Google Drive, then run: offboard.sh remove $CLIENT"
  ;;

remove)
  read -r -p "Remove every trace of client $CLIENT from this computer? Type the client's name to confirm: " typed
  [ "$typed" = "$CLIENT" ] || { echo "Not confirmed. Nothing was removed."; exit 1; }
  if [ -f "$CC_DIR/kit-out/tenant.env" ]; then
    . "$CC_DIR/kit-out/tenant.env"
    [ -n "$DOCKER_CONTEXT" ] && export DOCKER_CONTEXT
    (cd "$CC_DIR" && docker compose down -v --remove-orphans) || true
    docker rm -f "betty-proto-$CLIENT" "cc-gateway-$CLIENT" "cc-slack-notify-$CLIENT" >/dev/null 2>&1 || true
    docker volume rm "cc-notify-state-$CLIENT" >/dev/null 2>&1 || true
    PORT="$(node -e 'console.log(JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).site?.port ?? "")' "$CC_DIR/site.json")"
    [ -n "$PORT" ] && { tailscale serve --https="$PORT" off >/dev/null 2>&1 || true; }
    # The client's nightly backups: the archive replaces them, and this computer can read them.
    if [ -n "${BACKUP_REMOTE:-}" ]; then rclone purge "$BACKUP_REMOTE/$CLIENT" >/dev/null 2>&1 || true; fi
    unset DOCKER_CONTEXT
  fi
  for u in circlechat-boot agents-sync release-watch kev-data-push backup restore-test images jobd; do uninstall_unit "$u-$CLIENT"; done
  if [ "$OS" = Darwin ]; then
    colima delete --profile "$CLIENT" --force >/dev/null 2>&1 || true
    mount | grep -q " on $STACK_DIR (apfs" && hdiutil detach "$STACK_DIR" >/dev/null
    rm -rf "$HOME/tenant-images/$CLIENT.sparsebundle" "$HOME/.colima/_lima/colima-$CLIENT" "$HOME/.colima/$CLIENT"
    docker context rm -f "colima-$CLIENT" >/dev/null 2>&1 || true
  fi
  sudo rm -rf "$STACK_DIR" "$HOME/.recursica-node.$CLIENT.env" "$HOME/.recursica-jobs-$CLIENT" /tmp/*-"$CLIENT".log
  echo "Removed client $CLIENT from $(hostname -s). Run: offboard.sh check $CLIENT"
  ;;

check)
  fail=0
  row() { printf '%-46s %s\n' "$1" "$2"; [ "$2" = pass ] || fail=1; }
  printf '%-46s %s\n' "Place" "Result"
  for p in "$STACK_DIR" "$HOME/tenant-images/$CLIENT.sparsebundle" "$HOME/.colima/_lima/colima-$CLIENT" "$HOME/.colima/$CLIENT" \
           "$HOME/.recursica-node.$CLIENT.env" "$HOME/.recursica-jobs-$CLIENT"; do
    [ -e "$p" ] && row "$p" "FAIL: still exists" || row "$p" pass
  done
  units="$( (systemctl list-unit-files 2>/dev/null; ls /Library/LaunchDaemons 2>/dev/null) | grep -E -- "-$CLIENT(\.|$)" || true)"
  [ -n "$units" ] && row "services and scheduled jobs" "FAIL: $units" || row "services and scheduled jobs" pass
  ctx="$(docker context ls --format '{{.Name}}' 2>/dev/null | grep -x "colima-$CLIENT" || true)"
  [ -n "$ctx" ] && row "Docker context colima-$CLIENT" "FAIL: still exists" || row "Docker context colima-$CLIENT" pass
  left="$(docker ps -a --format '{{.Names}}' 2>/dev/null | grep -E -- "(-|^cc-)$CLIENT(-|$)" || true; docker volume ls --format '{{.Name}}' 2>/dev/null | grep -E -- "(^cc-${CLIENT}_|-${CLIENT}$)" || true)"
  [ -n "$left" ] && row "containers and volumes" "FAIL: $left" || row "containers and volumes" pass
  found="$(grep -rIl --exclude-dir=archived --exclude-dir=.git -- "$CLIENT" "$HOME/circlechat" "$HOME/.config/rclone" /var/lib/agent-cluster 2>/dev/null | head -5 || true)"
  [ -n "$found" ] && row "files naming $CLIENT" "FAIL: $found" || row "files naming $CLIENT" pass
  [ "$fail" = 0 ] && echo "Nothing of client $CLIENT remains on $(hostname -s)." || { echo "Something of client $CLIENT remains on $(hostname -s)."; exit 1; }
  ;;
*) echo "Unknown command $CMD."; exit 1 ;;
esac
