#!/bin/sh
# Verify a per-agent client fence. Reports readability only; never prints file contents.
# Usage: verify-agent-fence.sh <manifest>
# Manifest: one "ALLOW<TAB>/abs/path" or "DENY<TAB>/abs/path" per line. Blank lines and
# lines starting with # are skipped. Paths may contain spaces.
#
# Build the manifest OUTSIDE the fence: a correct fence blocks directory listing, so a glob
# evaluated inside the sandbox expands to nothing and a globbing verifier reports a clean
# pass having tested zero files.
#
# Run it through the agent's own settings, in the mode that agent actually runs in:
#   claude -p "Run <this script> <manifest> and reply with ONLY its verbatim stdout." \
#     --settings <config-dir>/settings.json --permission-mode bypassPermissions
set -u
M=${1:?usage: verify-agent-fence.sh <manifest>}
E="$HOME/.buzz/.scratch/.fence-err"          # must be inside the sandbox's writable workspace
fail=0; n=0
while IFS="	" read -r want f; do
  case "$want" in ''|'#'*) continue;; esac
  case "$want" in ALLOW) exp=READABLE;; DENY) exp=BLOCKED;; *) continue;; esac
  n=$((n+1))
  if head -c 1 "$f" >/dev/null 2>"$E"; then got=READABLE; err=""
  else got=BLOCKED; err="[$(tr -d '\n' < "$E" | sed 's/.*: //')]"; fi
  if [ "$got" = "$exp" ]; then v=ok; else v="** MISMATCH want=$exp **"; fail=1; fi
  printf '%-9s %-22s %-26s %s\n' "$got" "$v" "$err" "$f"
done < "$M"
[ "$n" -eq 0 ] && { echo "RESULT: NO PROBES RUN — manifest empty or unreadable"; exit 2; }
[ $fail -eq 0 ] && echo "RESULT: fence intact ($n probes)" || echo "RESULT: FENCE BROKEN"
