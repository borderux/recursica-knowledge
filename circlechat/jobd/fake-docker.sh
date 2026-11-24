#!/usr/bin/env bash
# Stand-in for the docker CLI in jobd's tests. State lives in $FAKE_DOCKER_STATE/<name>.
S="${FAKE_DOCKER_STATE:?}"; mkdir -p "$S"
case "$1" in
  create) for a in "$@"; do [ "${last:-}" = --name ] && name="$a"; last="$a"; done
       echo "created 0 false" > "$S/$name"; printf '%s\n' "$@" > "$S/$name.args"; echo "fakeid-$name" ;;
  start) [ -f "$S/${!#}" ] || { echo "no such" >&2; exit 1; }; echo "running 0 false" > "$S/${!#}" ;;
  inspect) n="${!#}"; [ -f "$S/$n" ] && cat "$S/$n" || { echo "no such" >&2; exit 1; } ;;
  logs) echo "log line for ${!#}" ;;
  rm) rm -f "$S/${!#}" ;;
esac
