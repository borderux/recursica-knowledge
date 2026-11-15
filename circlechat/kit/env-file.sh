# shellcheck shell=bash
# Reads app.env, porter.env or tenant.env (kit/render.mjs) without running a line. Sourced, never run.
#
#   load_env_file <file>
#
# Each KEY=value line sets the shell variable KEY to the value as plain text. A $, a ;, a backtick,
# a quote or a space in the value stays text, and nothing in the value runs. A line that is not
# KEY=value is skipped. The variables are not exported, as with the files' earlier ". <file>".
# A missing file returns 1.
load_env_file() {
  local file="$1" line key
  [ -f "$file" ] || return 1
  while IFS= read -r line || [ -n "$line" ]; do
    key="${line%%=*}"
    [ "$key" != "$line" ] || continue
    [[ "$key" =~ ^[A-Z][A-Z0-9_]*$ ]] || continue
    printf -v "$key" '%s' "${line#*=}"
  done < "$file"
}
