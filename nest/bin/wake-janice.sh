#!/usr/bin/env bash
# Wake Janice when a research-team agent finishes a turn.
#
# THE INSTALLED COPY IS GENERATED. scripts/bootstrap-nest.mjs installs this file into
# ~/.buzz/bin/. Edit it here, in nest/bin/ — an edit made to the installed copy is destroyed
# by the next bootstrap, with no diff and no log line to notice it by. That has happened to
# Janice's scripts twice; dc48597 recorded it in GUIDES/JANICE_REVIEW_CHECKLIST.md and it
# happened again, which is why it is stated here instead.
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

# The research team, plus any agent whose turns make cross-repo claims nobody re-runs.
# Ivan is the second kind: he reports discrepancies across three repositories and the
# report is the deliverable, so an unchecked claim in it is the whole failure. ALAN stays
# unwatched — see GUIDES/JANICE_REVIEW_CHECKLIST.md for the roster and the reasoning.
#
# An agent added here needs a `building-<name>` channel in the checklist's routing table
# too, or its findings fall back to building-janice and read as being about Janice.
WATCHED_AGENTS=(Claire Stu Ivan)

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

# Issued/reviewed ledger. Holding the watermark until delivery (below) covers a wake that
# never arrived. It does not cover a wake that arrived and was never finished: once the
# message is sent the watermark advances, so a review turn that dies mid-scan — session
# limit, crash — destroys its own window. The next Stop hook computes an empty range and
# sends nothing, and an unreviewed turn is indistinguishable from a clean one. Every wake
# appends `issued` here; Janice appends `reviewed` at the end of every review, clean or
# not, and picks up any issued window with no matching reviewed line. Append-only, one
# JSON object per line, matched on (session, from).
LEDGER="$NEST/.scratch/janice-windows.jsonl"

log() { printf '%s %s\n' "$(date -u +%Y-%m-%dT%H:%M:%SZ)" "$*" >>"$LOG" 2>/dev/null || true; }

# The not-watched SKIP below fires on every Stop of every agent in the nest, which is the
# point — an empty queue is only evidence of coverage if something logs the decision not to
# enqueue. The cost is that this file grows without bound. Trim to the newest 2000 lines once
# it passes 1 MB. Best-effort throughout: a log that cannot be rotated must not fail a turn.
rotate_log() {
  local bytes
  mkdir -p "$(dirname "$LOG")" 2>/dev/null || true
  [[ -f "$LOG" ]] || return 0
  bytes=$(wc -c <"$LOG" 2>/dev/null || echo 0)
  (( bytes > 1048576 )) || return 0
  # $$-suffixed: every agent in the nest runs this hook, so two Stops can land together and
  # a shared temp name would interleave two tails into one file before either mv.
  tail -n 2000 "$LOG" >"$LOG.$$.tmp" 2>/dev/null && mv "$LOG.$$.tmp" "$LOG" 2>/dev/null
  rm -f "$LOG.$$.tmp" 2>/dev/null || true
}
rotate_log

AGENT="${BUZZ_ACP_SESSION_TITLE:-}"

# A real session title carries the owner in parentheses — "Stu (<operator>)", not "Stu".
# Matching the bare name against the full title silently watched nobody: every turn took the
# exit below, and because that exit did not log, automatic review was off for 45 minutes
# with no trace anywhere. Strip the suffix before comparing.
AGENT_NAME="${AGENT%% (*}"

# Not a watched agent — the common case (Fizz, Janice, ALAN, Honey, Bumble, humans).
matched=0
for w in "${WATCHED_AGENTS[@]}"; do
  [[ "$AGENT_NAME" == "$w" ]] && matched=1 && break
done
# Log the non-match. This is the ordinary path and it is noisy, but a review rig that goes
# quiet is indistinguishable from a review rig with nothing to say — which is exactly how
# this regression, and the commit-msg hook before it, stayed invisible. An empty queue is
# not evidence of coverage unless something writes a line when it decides not to enqueue.
if [[ $matched -eq 0 ]]; then
  log "SKIP ${AGENT:-<no title>} not watched"
  exit 0
fi

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
  log "SKIP $AGENT_NAME session=$SESSION_ID no transcript found"
  exit 0
fi

WATERMARK="$WATERMARK_DIR/${SESSION_ID}.json"
# No --update here. The watermark is committed further down, only once the wake has
# actually been delivered — advancing it at this point would move it past a window that
# a compose error or a relay outage stopped anyone from ever reading.
WINDOW="$(python3 "$WINDOW_TOOL" --transcript "$TRANSCRIPT" --watermark "$WATERMARK" 2>>"$LOG")"
STATUS=$?

# Exit 3 means there is nothing new since the last review — Stop also fires on clear,
# resume, and compact, and those must not spend a Janice run.
if [[ $STATUS -eq 3 ]]; then
  # Log the tool's own reason rather than one sentence for every case. "Nothing appended"
  # and "appended, but no tool calls" are different facts about coverage, and a single
  # message makes the second look like the first.
  NOOP_REASON="$(printf '%s' "$WINDOW" | python3 -c 'import json,sys; print(json.load(sys.stdin).get("reason",""))' 2>/dev/null)"
  log "NOOP $AGENT_NAME session=$SESSION_ID ${NOOP_REASON:-nothing new to review}"
  exit 0
fi
if [[ $STATUS -ne 0 || -z "$WINDOW" ]]; then
  log "SKIP $AGENT_NAME session=$SESSION_ID window tool failed (exit $STATUS)"
  exit 0
fi

# AGENT_NAME, not AGENT, in the two blocks below. This composes a message that gets published
# to the relay, and a session title carries the owner in a parenthesised suffix — so the full
# title put a person's name into every wake message. The bare name is also the key Janice
# matches against the routing table in GUIDES/JANICE_REVIEW_CHECKLIST.md.
CONTENT="$(
  printf '%s' "$WINDOW" | AGENT="$AGENT_NAME" SESSION_ID="$SESSION_ID" TRANSCRIPT="$TRANSCRIPT" python3 -c '
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
calls = w.get("agent_calls_in_window", 0)
if subs:
    lines += ["", "Subagent transcripts for this session (review these too — the"
              " fence-sensitive Drive and BigQuery writes happen here). %d Agent call(s)"
              " in this window, %d transcript(s) matched by spawning tool_use id:"
              % (calls, len(subs))]
    lines += ["- %s" % s for s in subs]
elif calls:
    lines += ["", "Note: %d Agent call(s) in this window and no transcript matched."
              " Treat the subagent evidence as missing, not absent." % calls]

# A shortfall must be stated. A list that looks complete is the failure mode here.
gap = w.get("subagents_missing_transcript") or []
if gap:
    lines += ["", "Note: %d Agent call(s) in this window have no transcript on disk, so"
              " that evidence is unavailable rather than clean." % len(gap)]
if w.get("subagents_matched_by_mtime"):
    lines += ["", "Note: %d subagent transcript(s) had no readable .meta.json and were"
              " matched by modification time instead, which can include work from an"
              " adjacent turn." % len(w["subagents_matched_by_mtime"])]
if w.get("subagents_unmatchable"):
    lines += ["", "Note: %d subagent transcript(s) could be matched neither by id nor by"
              " time and were excluded. If a finding here looks like it has a missing"
              " step, that is where to look." % len(w["subagents_unmatchable"])]

if w.get("skipped_bytes"):
    lines += ["", "Note: %d bytes between the last review and this turn were skipped so"
              " this stays scoped to the current turn. Mention it if a finding here looks"
              " like it started earlier." % w["skipped_bytes"]]

lines += [
    "",
    "@Janice review this window against your checklist. Post findings in that agent'"'"'s"
    " building- channel only, and stay silent if the turn is clean.",
    "",
    "Before starting, check `.scratch/janice-windows.jsonl` for an issued window with no"
    " reviewed line and take that first. When this review ends — finding or clean — append"
    " your own reviewed line. Checklist section 7.",
]
print("\n".join(lines))
' 2>/dev/null
)"

if [[ -z "$CONTENT" ]]; then
  log "SKIP $AGENT_NAME session=$SESSION_ID could not compose wake message"
  exit 0
fi

# Record the window as issued before sending. A send that fails now holds the watermark
# for retry, so that row will be closed by the retry's review — but a row written only on
# success would miss nothing and a row written before it costs nothing, and this is the
# file that has to be trustworthy when the review never comes back.
printf '%s' "$WINDOW" | AGENT="$AGENT_NAME" SESSION_ID="$SESSION_ID" TRANSCRIPT="$TRANSCRIPT" \
  LEDGER="$LEDGER" NOW="$(date -u +%Y-%m-%dT%H:%M:%SZ)" python3 -c '
import json, os, sys

w = json.load(sys.stdin)
row = {
    "ts": os.environ["NOW"],
    "state": "issued",
    "agent": os.environ["AGENT"],
    "session": os.environ["SESSION_ID"],
    "transcript": os.environ["TRANSCRIPT"],
    "from": w["from_offset"],
    "to": w["to_offset"],
}
with open(os.environ["LEDGER"], "a") as fh:
    fh.write(json.dumps(row) + "\n")
' 2>>"$LOG" || {
  # Do not send. A wake that goes out with no ledger row is the original hole again for
  # that one window — nothing would ever know it existed. An un-issued window costs one
  # delayed review and is re-issued on the next wake, because the watermark only commits
  # after a send, and the send is what we are skipping.
  log "FAIL $AGENT_NAME session=$SESSION_ID ledger write failed, wake not sent"
  exit 0
}

if printf '%s\n' "$CONTENT" | "$BUZZ_BIN" messages send \
      --channel "$JANICE_CHANNEL" \
      --content - \
      --mention "$JANICE_PUBKEY" >>"$LOG" 2>&1; then
  log "WAKE $AGENT_NAME session=$SESSION_ID from=$(printf '%s' "$WINDOW" | python3 -c 'import json,sys; print(json.load(sys.stdin)["from_offset"])' 2>/dev/null)"
  # Delivered, so this window is spent. Commit from the payload that was sent, not from
  # a rescan — the transcript has kept growing and a rescan would skip the difference.
  if ! printf '%s' "$WINDOW" | python3 "$WINDOW_TOOL" \
        --watermark "$WATERMARK" --commit-watermark 2>>"$LOG"; then
    log "WARN $AGENT_NAME session=$SESSION_ID watermark not advanced — next wake re-reviews"
  fi
else
  # Deliberately leave the watermark where it is. A duplicate review costs one run; a
  # window advanced past evidence nobody read cannot be recovered.
  log "FAIL $AGENT_NAME session=$SESSION_ID send failed, watermark held for retry"
fi

exit 0
