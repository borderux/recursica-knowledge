#!/bin/bash
# Builds the RecursicaChat 2.0 server's PDF text reader image, and records its image ID, as the Hermes
# image is recorded. install.sh installs it as /opt/recursicachat/bin/build-pdftext.sh, root:wheel 755.
# Run it after an rc-deploy that brings or changes images/pdftext, then restart the server:
#
#   sudo /opt/recursicachat/bin/build-pdftext.sh
#   sudo launchctl kickstart -k system/io.recursica.recursicachat
#
# The image is the app's images/pdftext: poppler-utils from Alpine's own packages, on the official
# Alpine image pinned by digest. The script refuses a Dockerfile whose base isn't pinned by digest. It
# builds on the server's own Colima VM, never the default VM, and writes the image ID to
# /opt/recursicachat/pdftext.image-id, root:wheel 644. run.sh then checks the image against the ID
# at each start, and hands the server that exact image ID (CIRCLECHAT_PDF_IMAGE).
set -euo pipefail
umask 022

BASE=/opt/recursicachat
APP="$BASE/app"
TAG=circlechat/pdftext:latest
ID_FILE="$BASE/pdftext.image-id"
HOME_DIR="$BASE/home"
SOCK="$HOME_DIR/.colima/recursicachat/docker.sock"
PATH_SAFE=/opt/homebrew/bin:/usr/bin:/bin:/usr/sbin:/sbin
DIR="$APP/images/pdftext"

fail() { echo "build-pdftext: $1" >&2; exit 1; }
[ "$(id -u)" = 0 ] || fail "run it with sudo"
[ -f "$DIR/Dockerfile" ] || fail "no $DIR/Dockerfile: deploy a server with people's uploads first (sudo rc-deploy)"
# every FROM pinned by digest
grep -E '^FROM ' "$DIR/Dockerfile" | grep -vqE '^FROM [^ ]+@sha256:[0-9a-f]{64}( |$)' && fail "$DIR/Dockerfile has a base image not pinned by digest"
grep -qE '^FROM ' "$DIR/Dockerfile" || fail "$DIR/Dockerfile has no FROM"

export HOME="$HOME_DIR" PATH="$PATH_SAFE" DOCKER_HOST="unix://$SOCK"
docker info >/dev/null 2>&1 || fail "the server VM's Docker at $SOCK does not answer"
docker build --pull=false -q -t "$TAG" "$DIR" >/dev/null || fail "the image did not build"
id="$(docker image inspect -f '{{.Id}}' "$TAG")"
[[ "$id" =~ ^sha256:[0-9a-f]{64}$ ]] || fail "the built image has no ID"
# the reader's tools answer, with no network
docker run --rm --network none --user 65534:65534 --entrypoint /bin/sh "$id" -c 'pdftotext -v && pdfinfo -v' >/dev/null 2>&1 || fail "pdftotext or pdfinfo did not run in the image"
tmp="$(mktemp "$BASE/.pdftext.image-id.XXXXXX")"
printf '%s\n' "$id" > "$tmp"
chown root:wheel "$tmp" && chmod 644 "$tmp" && mv -f "$tmp" "$ID_FILE"
echo "build-pdftext: $TAG is $id, recorded in $ID_FILE. Restart the server: sudo launchctl kickstart -k system/io.recursica.recursicachat"
