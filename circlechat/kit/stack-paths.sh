#!/usr/bin/env bash
# The stack's folders on one computer, for the kit's shell scripts. Sourced, never run.
# kit/stack-paths.mjs holds the same rules for the node code.
#
#   - The stack's folder holds site.json, .env, model-keys.env, kit-out/ and gateway-state/:
#     ~/recursica-stack for the cluster's own stack, and ~/tenants/<name>/stack for a client or demo
#     stack.
#   - The agents' workspace holds the app's checkout and the agents' files: ~/recursica-workspace,
#     and ~/tenants/<name>/workspace for a client or demo stack.
#
# CircleChat 1.x named the folders ~/circlechat, ~/tenants/<name>/circlechat and
# ~/circlechat-workspace. A computer keeps the old names until a person runs
# circlechat/migrate-off-1x.sh. So each folder is the new one when the new one exists, else the old
# one when the old one exists, else the new one.

# pick_dir <new folder> <old folder>
pick_dir() { if [ -d "$1" ] || [ ! -d "$2" ]; then printf '%s' "$1"; else printf '%s' "$2"; fi; }
# stack_dir <home folder> [<tenant>]
stack_dir() {
  if [ -n "${2:-}" ]; then pick_dir "$1/tenants/$2/stack" "$1/tenants/$2/circlechat"
  else pick_dir "$1/recursica-stack" "$1/circlechat"; fi
}
# workspace_dir <home folder> [<tenant>]
workspace_dir() {
  if [ -n "${2:-}" ]; then printf '%s' "$1/tenants/$2/workspace"
  else pick_dir "$1/recursica-workspace" "$1/circlechat-workspace"; fi
}
