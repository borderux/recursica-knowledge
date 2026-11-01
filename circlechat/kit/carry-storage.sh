#!/usr/bin/env bash
# Carry CircleChat's stored files from the old containers onto the storage volume, once. Run in the
# stack's CircleChat folder before each `docker compose up` that can recreate the api and the worker.
#
#   CC_DIR=<stack's CircleChat folder> ./circlechat/kit/carry-storage.sh
#
# CircleChat keeps every stored file (uploads, task deliverables, long replies saved as files) on
# disk at STORAGE_DIR. An older CircleChat kept that folder, /app/storage, inside each container: the
# api held people's uploads, the worker held agents' deliverables, and a recreated container lost
# its files. A newer CircleChat mounts the named volume `storage` at /app/storage in both. When the
# stack's compose files name that volume, and the volume is new or empty, this script copies
# /app/storage out of the old api and worker containers, merges the two, and writes the result
# onto the volume, before compose recreates the containers.
#
# It does nothing when compose names no storage volume, when no old container is left, or when the
# volume already holds files. So a second run, and every run after the move, changes nothing. It
# never deletes a stored file and never changes a container: it reads the old containers, and
# writes only onto an empty volume. The temporary copy on this computer is removed at the end.
#
# The merge: each file from the api and from the worker. A key in both keeps the newer file.
set -euo pipefail
cd "${CC_DIR:-.}"
IMAGE=alpine:3.20
say() { echo "Stored files: $1"; }

# The volume's full name and the project's name, from compose itself, so a tenant stack's project
# name and an overlay are both read. Unreadable output counts as no volume: `docker compose up`
# would then fail on the same files.
names="$(docker compose config --format json 2>/dev/null | node -e '
  let s = ""; process.stdin.on("data", (d) => (s += d)).on("end", () => {
    try { const c = JSON.parse(s); const v = c.volumes?.storage; if (v) process.stdout.write(`${v.name ?? `${c.name}_storage`} ${c.name}`); } catch {}
  });' || true)"
[ -n "$names" ] || { say "compose names no storage volume yet, so the files stay inside the containers. Nothing to carry."; exit 0; }
VOLUME="${names% *}" PROJECT="${names#* }"

# Old containers: the api's and the worker's, running or stopped, without the volume mounted. A
# container that mounts the volume already keeps its files there.
old=()
for svc in api worker; do
  for id in $(docker compose ps -a -q "$svc" 2>/dev/null || true); do
    case " $(docker inspect -f '{{range .Mounts}}{{.Name}} {{end}}' "$id") " in
      *" $VOLUME "*) ;;
      *) old+=("$svc:$id") ;;
    esac
  done
done
[ "${#old[@]}" -gt 0 ] || { say "no old api or worker container. Nothing to carry."; exit 0; }

if docker volume inspect "$VOLUME" >/dev/null 2>&1; then
  if [ -n "$(docker run --rm -v "$VOLUME:/v:ro" "$IMAGE" ls -A /v)" ]; then
    say "volume $VOLUME already holds files. Nothing to carry."
    exit 0
  fi
fi

tmp="$(mktemp -d "${TMPDIR:-/tmp}/carry-storage.XXXXXX")"
chmod 700 "$tmp"
trap 'rm -rf "$tmp"' EXIT
mkdir "$tmp/merged"

# Copy each file of <from> into <to>, unless <to> already holds a newer or equally new copy.
merge_into() {
  local from="$1" to="$2" f
  (cd "$from" && find . -type f -print0) | while IFS= read -r -d '' f; do
    f="${f#./}"
    if [ ! -e "$to/$f" ] || [ "$from/$f" -nt "$to/$f" ]; then
      mkdir -p "$to/$(dirname "$f")"
      cp -p "$from/$f" "$to/$f"
    fi
  done
}

for o in "${old[@]}"; do
  svc="${o%%:*}" id="${o#*:}"
  mkdir -p "$tmp/from/$id"
  # docker cp keeps each file's time, which the merge compares. A container without the folder has
  # nothing to carry; any other failure stops here, before anything is recreated.
  if ! err="$(docker cp "$id:/app/storage/." "$tmp/from/$id/" 2>&1)"; then
    case "$err" in
      *"Could not find"*|*"No such"*) say "the $svc container ($id) has no /app/storage."; continue ;;
      *) echo "$err" >&2; say "could not copy /app/storage out of the $svc container ($id). Nothing was recreated."; exit 1 ;;
    esac
  fi
  say "$(find "$tmp/from/$id" -type f | wc -l | tr -d ' ') file(s) in the $svc container ($id)."
  merge_into "$tmp/from/$id" "$tmp/merged"
done

count="$(find "$tmp/merged" -type f | wc -l | tr -d ' ')"
[ "$count" -gt 0 ] || { say "the old containers hold no stored files. Nothing to carry."; exit 0; }

# The volume, labelled as compose labels its own, so compose adopts it without a warning.
docker volume inspect "$VOLUME" >/dev/null 2>&1 \
  || docker volume create --label "com.docker.compose.project=$PROJECT" --label com.docker.compose.volume=storage "$VOLUME" >/dev/null
# Streamed in on stdin, so no folder of this computer is mounted: on a Mac, Docker's VM sees only
# some of the Mac's folders. The api and the worker run as root, and root owns the files.
(cd "$tmp/merged" && COPYFILE_DISABLE=1 tar cf - .) \
  | docker run --rm -i -v "$VOLUME:/dst" "$IMAGE" sh -c 'tar xf - -C /dst && chown -R 0:0 /dst'
say "carried $count file(s) from the old containers onto volume $VOLUME."
