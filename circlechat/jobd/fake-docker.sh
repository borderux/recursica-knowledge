#!/usr/bin/env bash
# Stand-in for the docker CLI in jobd's tests. State lives in $FAKE_DOCKER_STATE/<name>.
S="${FAKE_DOCKER_STATE:?}"; mkdir -p "$S"
case "$1" in
  run) for a in "$@"; do prev_name="$name"; [ "$last" = --name ] && name="$a"; last="$a"; done
       echo "running 0 false" > "$S/$name"; echo "fakeid-$name" ;;
  inspect) n="${@: -1}"; [ -f "$S/$n" ] && cat "$S/$n" || { echo "no such" >&2; exit 1; } ;;
  logs) echo "log line for ${@: -1}" ;;
  rm) rm -f "$S/${@: -1}" ;;
esac
