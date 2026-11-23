#!/usr/bin/env bash
# Install and run the kit's Ollama server on a Linux helper computer, from the node's ollama block in
# services/<node>.json (kit/ollama.mjs linuxOllamaSpec). setup-node.sh runs this script. Safe to rerun.
#
#   ./circlechat/kit/setup-ollama.sh <services/<node>.json>
#
# 1. The pinned Ollama release: the script downloads the archive, checks the archive's SHA-256
#    against the hash in kit/ollama.mjs, and only then unpacks the archive into
#    /opt/recursica-ollama/<version>, owned by root. A version already there is never downloaded again.
# 2. A system account, recursica-ollama, with no login shell. The account owns
#    /var/lib/recursica-ollama, mode 700, which holds the models. No other account can write there.
# 3. A systemd service, recursica-ollama, that runs `ollama serve` as that account. The service
#    listens on the address and port from site.json, with the server's settings from site.json.
# 4. Each model site.json lists, pulled when the server lacks the model. The script removes no model.
#
# The script stops, and changes nothing, when another Ollama already runs on this computer: an
# ollama.service from Ollama's own installer, or another program on the server's port.
set -Eeuo pipefail
SPEC="${1:?usage: setup-ollama.sh <services/<node>.json>}"
HERE="$(cd "$(dirname "$0")" && pwd)"
. "$HERE/lib.sh"
ROOT="${OLLAMA_ROOT:-/opt/recursica-ollama}"
STATE="${OLLAMA_STATE:-/var/lib/recursica-ollama}"
UNITS="${SYSTEMD_UNIT_DIR:-/etc/systemd/system}"
ACCOUNT=recursica-ollama
NAME=recursica-ollama
TRIES="${OLLAMA_START_TRIES:-30}"
get() { node -e 'const o=JSON.parse(require("fs").readFileSync(process.argv[1],"utf8")).ollama; const v=process.argv[2].split(".").reduce((a,k)=>a?.[k],o); process.stdout.write(Array.isArray(v)?v.join("\n"):String(v??""))' "$SPEC" "$1"; }
VERSION="$(get version)"; LISTEN="$(get listen)"; PORT="$(get port)"
[ -n "$VERSION" ] || { echo "$SPEC has no ollama block."; exit 1; }
ADDR="$LISTEN:$PORT"

# Tools the install needs.
for t in curl zstd tar sha256sum systemctl; do
  command -v "$t" >/dev/null || { echo "$t is not installed. Install $t with: sudo apt install $t. Then run setup-node.sh again."; exit 1; }
done
case "$(uname -m)" in
  x86_64) ARCH=amd64 ;;
  aarch64|arm64) ARCH=arm64 ;;
  *) echo "Ollama's Linux release has no archive for $(uname -m)."; exit 1 ;;
esac
URL="$(get "archives.$ARCH.url")"; SHA="$(get "archives.$ARCH.sha256")"

# Another Ollama on this computer stops the setup. Two servers would fight over the GPU and the port.
# OLLAMA_FOREIGN_UNITS is for the tests.
for unit in ${OLLAMA_FOREIGN_UNITS:-/etc/systemd/system/ollama.service /lib/systemd/system/ollama.service /usr/lib/systemd/system/ollama.service}; do
  if [ -e "$unit" ]; then
    echo "Ollama's own installer set up $unit, so another Ollama already runs on this computer. The kit runs Ollama as $NAME instead."
    echo "To hand Ollama to the kit, retire the other service, then run setup-node.sh again:"
    echo "  sudo systemctl disable --now ollama && sudo rm $unit && sudo systemctl daemon-reload"
    echo "Models the other service pulled stay in that service's folder. The kit pulls each model site.json lists again."
    exit 1
  fi
done
holder="$(ss -Hltnp "sport = :$PORT" 2>/dev/null || true)"
if [ -n "$holder" ] && ! systemctl is-active --quiet "$NAME.service"; then
  echo "Another program listens on port $PORT, the Ollama server's port in site.json:"
  echo "$holder"
  echo "Stop that program, or give the Ollama server another port in site.json. Then run setup-node.sh again."
  exit 1
fi

# 1. The pinned release, checked before the archive is unpacked.
DIR="$ROOT/$VERSION"
if [ "$(cat "$DIR/.sha256" 2>/dev/null)" != "$SHA" ]; then
  work="$(mktemp -d)"
  trap 'rm -rf "$work"' EXIT
  echo "Downloading Ollama $VERSION for $ARCH."
  curl -fsSL --retry 3 -o "$work/ollama.tar.zst" "$URL"
  got="$(sha256sum "$work/ollama.tar.zst" | cut -d' ' -f1)"
  if [ "$got" != "$SHA" ]; then
    echo "The Ollama archive's SHA-256 is $got, and kit/ollama.mjs pins $SHA. Nothing was installed."
    exit 1
  fi
  sudo mkdir -p "$ROOT"
  sudo rm -rf "$DIR.new"
  sudo mkdir -p "$DIR.new"
  zstd -dc "$work/ollama.tar.zst" | sudo tar -xf - -C "$DIR.new" --no-same-owner
  [ -x "$DIR.new/bin/ollama" ] || { sudo rm -rf "$DIR.new"; echo "The Ollama archive holds no bin/ollama. Nothing was installed."; exit 1; }
  printf '%s\n' "$SHA" | sudo tee "$DIR.new/.sha256" >/dev/null
  sudo chmod -R go-w "$DIR.new"
  sudo rm -rf "$DIR"
  sudo mv "$DIR.new" "$DIR"
  echo "Installed Ollama $VERSION in $DIR."
fi
BIN="$DIR/bin/ollama"

# 2. The system account, with no login shell, and the models folder only the account can write.
if getent passwd "$ACCOUNT" >/dev/null; then
  shell="$(getent passwd "$ACCOUNT" | cut -d: -f7)"
  case "$shell" in */nologin|*/false) ;; *) echo "The account $ACCOUNT has the login shell $shell. The kit's Ollama account must have none. Fix the account with: sudo usermod --shell /usr/sbin/nologin $ACCOUNT"; exit 1 ;; esac
else
  sudo useradd --system --user-group --home-dir "$STATE" --no-create-home --shell /usr/sbin/nologin "$ACCOUNT"
fi
# The GPU's device files belong to the video and render groups on some Linux computers.
for g in video render; do
  if getent group "$g" >/dev/null; then sudo usermod -aG "$g" "$ACCOUNT"; fi
done
sudo mkdir -p "$STATE/models"
sudo chown -R "$ACCOUNT:$ACCOUNT" "$STATE"
sudo chmod 700 "$STATE" "$STATE/models"

# 3. The service.
env_lines="Environment=HOME=$STATE
Environment=OLLAMA_HOST=$ADDR
Environment=OLLAMA_MODELS=$STATE/models"
while IFS= read -r kv; do [ -n "$kv" ] && env_lines="$env_lines
Environment=$kv"; done <<<"$(get env)"
changed=""
write_unit "$UNITS/$NAME.service" "$(cat <<UNIT
[Unit]
Description=Ollama $VERSION (circlechat kit)
After=network-online.target
Wants=network-online.target

[Service]
User=$ACCOUNT
Group=$ACCOUNT
ExecStart=$BIN serve
$env_lines
Restart=always
RestartSec=5
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
ReadWritePaths=$STATE

[Install]
WantedBy=multi-user.target
UNIT
)" && changed=1
if [ -n "$changed" ]; then
  sudo systemctl daemon-reload
  sudo systemctl enable --quiet "$NAME.service"
  sudo systemctl restart "$NAME.service"
  echo "$NAME changed: restarted"
else
  sudo systemctl enable --quiet --now "$NAME.service"
  echo "$NAME is running and unchanged"
fi

# The server answers on its address, with the pinned version.
answer=""
for _ in $(seq 1 "$TRIES"); do
  answer="$(curl -fsS --max-time 5 "http://$ADDR/api/version" 2>/dev/null || true)"
  [ -n "$answer" ] && break
  sleep 2
done
[ -n "$answer" ] || { echo "The Ollama server does not answer on $ADDR. Read its log with: sudo journalctl -u $NAME -n 50"; exit 1; }
grep -F "\"$VERSION\"" >/dev/null <<<"$answer" || { echo "The server on $ADDR answers $answer, and the kit installed Ollama $VERSION."; exit 1; }

# 4. Each model site.json lists. A name without a tag means the tag latest, as Ollama names the model.
have="$(curl -fsS --max-time 10 "http://$ADDR/api/tags" | node -e 'let b="";process.stdin.on("data",d=>b+=d).on("end",()=>{for(const m of JSON.parse(b).models??[])console.log(m.name)})')"
while IFS= read -r model; do
  [ -n "$model" ] || continue
  full="$model"; case "$model" in *:*) ;; *) full="$model:latest" ;; esac
  if grep -Fx "$full" >/dev/null <<<"$have"; then
    echo "Model $model: already on the server."
  else
    echo "Model $model: pulling."
    OLLAMA_HOST="$ADDR" "$BIN" pull "$model"
  fi
done <<<"$(get models)"
echo "Ollama $VERSION serves on $ADDR."
