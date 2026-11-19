#!/bin/bash
# Starts the RecursicaChat 2.0 server. install.sh renders it from site.json and installs it as
# /opt/recursicachat/bin/run.sh, root:wheel 755.
# launchd runs it as _recursicachat (io.recursica.recursicachat). It checks its setup, then replaces
# itself with the server, which gets a clean environment: only the variables listed below.
set -euo pipefail
umask 077

APP=/opt/recursicachat/app
NODE=/opt/recursicachat/node/v24.22.3/bin/node
DATA=/opt/recursicachat/data
KEY_FILE=/etc/recursicachat/master.key
# Sign in with Google (site.json recursicachat.google_client_id and google_domain). The client ID
# isn't secret; the secret stays in its file, which the server reads at each sign-in.
GOOGLE_CLIENT_ID=@GOOGLE_CLIENT_ID@
GOOGLE_SECRET_FILE=/etc/recursicachat/google-client-secret
GOOGLE_DOMAIN=@GOOGLE_DOMAIN@
PUBLIC_URL=@PUBLIC_URL@
IMAGE_ID_FILE=/opt/recursicachat/hermes.image-id
HERMES_IMAGE=circlechat/engine-hermes:latest
HOME_DIR=/opt/recursicachat/home
# The server's own Colima VM's Docker socket, never the default VM's.
SOCK="$HOME_DIR/.colima/recursicachat/docker.sock"
PATH_SAFE=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin

fail() { echo "run.sh: $1" >&2; exit 1; }

# The checks below run docker too. sudo can keep the caller's HOME, so docker would look for its
# config there. Every docker call here uses the account's own home.
export HOME="$HOME_DIR"
cd /

[ "$(id -un)" = _recursicachat ] || fail "must run as _recursicachat, not $(id -un)"
[ -x "$NODE" ] || fail "no Node at $NODE"
[ "$("$NODE" -v)" = v24.22.3 ] || fail "Node at $NODE is not v24.22.3"
[ -f "$APP/REVISION" ] || fail "no app at $APP"
[ -d "$DATA" ] && [ -O "$DATA" ] || fail "$DATA is missing or not owned by _recursicachat"
[ "$(stat -f %Lp "$DATA")" = 700 ] || fail "$DATA must be mode 700"
# The key lives only in /etc/recursicachat. A master.key in the data folder means something wrote one.
[ ! -e "$DATA/master.key" ] || fail "$DATA/master.key exists; the key must not be next to the database"
[ -r "$KEY_FILE" ] || fail "can't read $KEY_FILE"
[ "$(stat -f %Lp "$KEY_FILE")" = 400 ] || fail "$KEY_FILE must be mode 400"
[[ "$GOOGLE_CLIENT_ID" =~ ^[0-9]+-[a-z0-9]+\.apps\.googleusercontent\.com$ ]] || fail "GOOGLE_CLIENT_ID isn't a Google client ID"
[ -f "$GOOGLE_SECRET_FILE" ] && [ ! -L "$GOOGLE_SECRET_FILE" ] && [ -r "$GOOGLE_SECRET_FILE" ] || fail "can't read $GOOGLE_SECRET_FILE"
[ "$(stat -f %Su:%Sg:%Lp "$GOOGLE_SECRET_FILE")" = root:_recursicachat:440 ] || fail "$GOOGLE_SECRET_FILE must be root:_recursicachat, mode 440"

# Wait up to 3 minutes for its Colima VM's Docker, such as right after boot.
for i in $(seq 90); do
  DOCKER_HOST="unix://$SOCK" PATH="$PATH_SAFE" docker info >/dev/null 2>&1 && break
  [ "$i" = 90 ] && fail "the server VM's Docker at $SOCK did not answer"
  sleep 2
done

# The Hermes image must be the one recorded when it was built, pinned by its base image's digest.
want="$(cat "$IMAGE_ID_FILE")"
have="$(DOCKER_HOST="unix://$SOCK" PATH="$PATH_SAFE" docker image ls --no-trunc --format '{{.ID}}' "$HERMES_IMAGE")"
[ -n "$want" ] && [ "$have" = "$want" ] || fail "$HERMES_IMAGE is not the recorded image (have: ${have:-none})"

key="$(cat "$KEY_FILE")"
[ -n "$key" ] || fail "$KEY_FILE is empty"

# First start only: a seed file in the data folder creates the owner before the server listens, so
# nothing that reaches 127.0.0.1:3100 first can claim the workspace. The server deletes the file.
SEED="$DATA/seed.json"
use_seed=""
if [ -e "$SEED" ]; then
  [ -f "$SEED" ] && [ ! -L "$SEED" ] && [ -O "$SEED" ] || fail "$SEED must be a plain file owned by _recursicachat"
  use_seed=1
fi

cd "$APP"
# The server starts with only the variables below. They are set in this shell and exported, never
# passed as arguments: any account on this Mac can list a process's arguments with ps, so the key
# must never be one, even for the moment an env -i would take to start the server.
for v in $(compgen -e); do unset "$v" 2>/dev/null || true; done
export HOME="$HOME_DIR" PATH="$PATH_SAFE" DOCKER_HOST="unix://$SOCK"
export CIRCLECHAT_DATA="$DATA" CIRCLECHAT_HOST=127.0.0.1 CIRCLECHAT_PORT=3100
export CIRCLECHAT_AGENT_EGRESS=none CIRCLECHAT_WARM_ON_BOOT=0
# docker only: no agent runs as a process on the server (CIRCLECHAT_SANDBOXES).
export CIRCLECHAT_SANDBOXES=docker
# The only address people open the app at (site.json recursicachat.public_url). A browser request
# that changes something must come from it (CIRCLECHAT_PUBLIC_URL).
export CIRCLECHAT_PUBLIC_URL="$PUBLIC_URL"
# A connected app's tool with no rule is blocked; an admin allows each tool on purpose.
export CIRCLECHAT_TOOL_DEFAULT=block
# Nobody signs in with a password (off): everyone here signs in with Google. Google sign-in
# finds any existing account at GOOGLE_DOMAIN, whatever its role.
export CIRCLECHAT_GOOGLE_CLIENT_ID="$GOOGLE_CLIENT_ID" CIRCLECHAT_GOOGLE_CLIENT_SECRET_FILE="$GOOGLE_SECRET_FILE"
export CIRCLECHAT_GOOGLE_DOMAIN="$GOOGLE_DOMAIN" CIRCLECHAT_PASSWORD_SIGNIN=off
export CIRCLECHAT_MASTER_KEY="$key"
[ -z "$use_seed" ] || export CIRCLECHAT_SEED="$SEED"
exec "$NODE" server/src/index.ts
