#!/usr/bin/env bash
# Wake Janice when a research-team agent finishes a turn.
#
# Wired as a Stop hook in ~/.buzz/.claude/settings.json. Every agent in this nest shares
# that project directory, so the hook fires for ALL of them — WATCHED_AGENTS below is the
# only thing that decides whose turns get reviewed.
#
# Why Stop and not SessionStart: agent sessions are pooled (BUZZ_ACP_AGENTS=10,
# LAZY_POOL=false), so a session starts once and then serves many turns. Stop is the only
# event that reliably means "a turn just ended," and it is also the moment the transcript
# is complete.
#
# Every wake carries an explicit start point (byte offset + timestamp) from
# janice-turn-window.py, so Janice reviews the current turn instead of re-reading hours of
# history. When nothing has been appended since the last review, no wake is sent at all.
#
# Loop safety: Janice and Fizz are deliberately NOT watched. Janice reviewing a turn would
# otherwise wake Janice, and Fizz applying her fix would wake her again.
#
# Never fails the agent's turn: every path exits 0.

set -uo pipefail

# Research team only. ALAN is the recursica/design loop, not research — see
# GUIDES/JANICE_REVIEW_CHECKLIST.md for the roster and the reasoning.
WATCHED_AGENTS=(Claire Stu)

JANICE_CHANNEL="${JANICE_CHANNEL:-}"   # building-janice, in THIS community

[[ -n "$JANICE_CHANNEL" ]] || JANICE_CHANNEL="{{JANICE_CHANNEL}}"
JANICE_PUBKEY="${JANICE_PUBKEY:-}"
[[ -n "$JANICE_PUBKEY" ]] || JANICE_PUBKEY="{{JANICE_PUBKEY}}"

# Derived, never hardcoded — this script has to run on whoever's Mac it was installed on.
NEST="${BUZZ_HOME:-$HOME/.buzz}"
BUZZ_BIN="${BUZZ_BIN:-$HOME/.local/bin/buzz}"
WINDOW_TOOL="$NEST/bin/janice-turn-window.py"
WATERMARK_DIR="$NEST/.scratch/janice-watermarks"
LOG="$NEST/.scratch/wake-janice.log"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >>"$LOG" 2>/dev/null || true; }

AGENT="${BUZZ_ACP_SESSION_TITLE:-}"

# Not a watched agent — the common case (Fizz, Janice, ALAN, Honey, Bumble, humans).
matched=0
for w in "${WATCHED_AGENTS[@]}"; do
  [[ "$AGENT" == "$w" ]] && matched=1 && break
done
[[ $matched -eq 0 ]] && exit 0

# Hook payload arrives on stdin.
INPUT="$(cat 2>/dev/null || true)"
read -r SESSION_ID TRANSCRIPT <<<"$(
  printf '%s' "$INPUT" | python3 -c '
import json, sys
try:
    d = json.load(sys.stdin)
except Exception:
    d = {}
print(d.get("session_id", "unknown"), d.get("transcript_path", ""))
' 2>/dev/null || echo "unknown "
)"

if [[ -z "${TRANSCRIPT:-}" || ! -f "${TRANSCRIPT:-}" ]]; then
  # Fall back to the conventional location so a payload change does not silently
  # disable review. Claude Code encodes the nest path by replacing every '/' and
  # '.' with '-', so /Users/you/.buzz becomes -Users-you--buzz. Derive it rather
  # than hardcoding one machine's path.
  ENCODED_NEST="$(printf '%s' "$NEST" | tr '/.' '--')"
  TRANSCRIPT="${TRANSCRIPT_DIR:-$HOME/.claude/projects/$ENCODED_NEST}/${SESSION_ID}.jsonl"
fi

if [[ ! -f "$TRANSCRIPT" ]]; then
  log "SKIP $AGENT session=$SESSION_ID no transcript found"
  exit 0
fi

WATERMARK="$WATERMARK_DIR/${SESSION_ID}.json"
WINDOW="$(python3 "$WINDOW_TOOL" --transcript "$TRANSCRIPT" --watermark "$WATERMARK" --update 2>>"$LOG")"
STATUS=$?

# Exit 3 means there is nothing new since the last review — Stop also fires on clear,
# resume, and compact, and those must not spend a Janice run.
if [[ $STATUS -eq 3 ]]; then
  log "NOOP $AGENT session=$SESSION_ID nothing new to review"
  exit 0
fi
if [[ $STATUS -ne 0 || -z "$WINDOW" ]]; then
  log "SKIP $AGENT session=$SESSION_ID window tool failed (exit $STATUS)"
  exit 0
fi

CONTENT="$(
  printf '%s' "$WINDOW" | AGENT="$AGENT" SESSION_ID="$SESSION_ID" TRANSCRIPT="$TRANSCRIPT" python3 -c '
import json, os, sys

w = json.load(sys.stdin)
agent = os.environ["AGENT"]
lines = [
    "Review turn: %s" % agent,
    "",
    "Agent: %s" % agent,
    "Session: %s" % os.environ["SESSION_ID"],
    "Transcript: %s" % os.environ["TRANSCRIPT"],
    "",
    "## Review window — do not read outside it",
    "",
    "Start at byte offset: %d" % w["from_offset"],
    "Stop at byte offset: %d" % w["to_offset"],
    "Records at or after: %s" % (w.get("since_ts") or "unknown"),
    "Turn ended: %s" % (w.get("last_ts") or "unknown"),
    "Bytes to review: %d (of %d total in the file)" % (
        w["bytes_to_review"], w["total_bytes"]),
    "Window start came from: %s" % w.get("watermark_source", "unknown"),
    "",
    "In this window: %d tool calls, %d tool errors, %d turn start(s)." % (
        w.get("tool_calls", 0), w.get("tool_errors", 0),
        w.get("turn_starts_in_window", 0)),
]

subs = w.get("subagent_transcripts") or []
if subs:
    lines += ["", "Subagent transcripts for this session (review these too — the"
              " fence-sensitive Drive and BigQuery writes happen here):"]
    lines += ["- %s" % s for s in subs]

if w.get("skipped_bytes"):
    lines += ["", "Note: %d bytes between the last review and this turn were skipped so"
              " this stays scoped to the current turn. Mention it if a finding here looks"
              " like it started earlier." % w["skipped_bytes"]]

lines += [
    "",
    "@Janice review this window against your checklist. Post findings in that agent'"'"'s"
    " building- channel only, and stay silent if the turn is clean.",
]
print("\n".join(lines))
' 2>/dev/null
)"

if [[ -z "$CONTENT" ]]; then
  log "SKIP $AGENT session=$SESSION_ID could not compose wake message"
  exit 0
fi

if printf '%s\n' "$CONTENT" | "$BUZZ_BIN" messages send \
      --channel "$JANICE_CHANNEL" \
      --content - \
      --mention "$JANICE_PUBKEY" >>"$LOG" 2>&1; then
  log "WAKE $AGENT session=$SESSION_ID from=$(printf '%s' "$WINDOW" | python3 -c 'import json,sys; print(json.load(sys.stdin)["from_offset"])' 2>/dev/null)"
else
  log "FAIL $AGENT session=$SESSION_ID send failed"
fi

exit 0
