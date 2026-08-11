#!/usr/bin/env python3
"""Compute the slice of a session transcript that Janice should review.

The problem this solves: a pooled agent session appends every turn to one .jsonl file
for hours. The largest in this nest is 4.4 MB, and the newest turn in it is 244 KB.
Reviewing the whole file re-analyses work that was already reviewed and drowns Janice's
context, so every wake needs an explicit start point.

Two mechanisms, and the later of the two wins:

  watermark   byte offset recorded at the end of the previous wake for this session.
              Exact and format-independent — everything after it is genuinely new.
  turn start  the last `user` record that is not a tool result. Verified against a real
              transcript: 224 user records, 221 of them tool results, and the 3 remaining
              sit exactly at the three turn boundaries.

Taking max() of the two bounds a review to the current turn and guarantees nothing is
read twice. When that skips material (Janice was down for a turn), it is reported in
`skipped_bytes` rather than dropped silently.

Exit 0 with JSON on stdout. Exit 3 when there is nothing new to review.
"""

import argparse
import json
import os
import sys


def scan(path):
    """Walk the transcript once, returning (records, size).

    Per parsed line: (offset, timestamp, is_turn_start, tool_name, is_error, agent_ids,
    tool_uses). agent_ids holds the tool_use id of every `Agent` block in the record — a
    plural, because launching subagents concurrently puts several in one record, which is
    also why tool_uses counts blocks rather than records.
    """
    records = []
    offset = 0
    with open(path, "rb") as fh:
        for raw in fh:
            start = offset
            offset += len(raw)
            try:
                d = json.loads(raw)
            except ValueError:
                continue

            ts = d.get("timestamp")
            msg = d.get("message") or {}
            content = msg.get("content")
            blocks = content if isinstance(content, list) else []

            is_tool_result = any(
                isinstance(b, dict) and b.get("type") == "tool_result" for b in blocks
            )
            # A turn starts when a prompt arrives — a user record carrying no tool result.
            is_turn_start = d.get("type") == "user" and not is_tool_result

            tool_name = None
            tool_uses = 0
            agent_ids = []
            for b in blocks:
                if not (isinstance(b, dict) and b.get("type") == "tool_use"):
                    continue
                tool_uses += 1
                if tool_name is None:
                    tool_name = b.get("name")
                if b.get("name") == "Agent" and b.get("id"):
                    agent_ids.append(b["id"])

            is_error = any(
                isinstance(b, dict) and b.get("is_error") for b in blocks
            )

            records.append((start, ts, is_turn_start, tool_name, is_error,
                            agent_ids, tool_uses))
    return records, offset


def write_watermark(path, offset, ts):
    """Persist the watermark atomically. Returns True on success."""
    try:
        parent = os.path.dirname(path)
        if parent:
            os.makedirs(parent, exist_ok=True)
        tmp = path + ".tmp"
        with open(tmp, "w") as fh:
            json.dump({"offset": offset, "ts": ts}, fh)
        os.replace(tmp, path)
        return True
    except OSError as exc:
        print("watermark write failed: %s" % exc, file=sys.stderr)
        return False


def commit_watermark(path):
    """Advance the watermark to a window that has been delivered.

    Split out from the review pass on purpose. Advancing at the moment the window is
    computed means a later failure — a compose error, a relay outage on the send —
    moves the watermark past evidence no one ever read, and nothing afterwards can
    recover it. The offset comes from the same payload the caller delivered, so it can
    never run ahead of what was reviewed even though the transcript keeps growing.
    """
    try:
        w = json.load(sys.stdin) or {}
        offset = int(w["to_offset"])
    except (ValueError, TypeError, KeyError, OSError):
        print("commit-watermark: unreadable window payload on stdin", file=sys.stderr)
        return 3
    return 0 if write_watermark(path, offset, w.get("last_ts")) else 3


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript")
    ap.add_argument("--watermark", required=True)
    ap.add_argument("--update", action="store_true",
                    help="persist the new watermark immediately — only safe when the "
                         "caller cannot fail after this point. Prefer --commit-watermark.")
    ap.add_argument("--commit-watermark", action="store_true",
                    help="persist the watermark from a window payload on stdin, after "
                         "the caller has confirmed the review was actually delivered")
    args = ap.parse_args()

    if args.commit_watermark:
        return commit_watermark(args.watermark)

    if not args.transcript:
        print(json.dumps({"error": "--transcript is required"}))
        return 3

    if not os.path.isfile(args.transcript):
        print(json.dumps({"error": "transcript not found",
                          "transcript": args.transcript}))
        return 3

    records, size = scan(args.transcript)
    if not records:
        print(json.dumps({"error": "no parsable records",
                          "transcript": args.transcript}))
        return 3

    prev_offset, prev_ts = 0, None
    if os.path.isfile(args.watermark):
        try:
            with open(args.watermark) as fh:
                wm = json.load(fh)
            prev_offset = int(wm.get("offset", 0))
            prev_ts = wm.get("ts")
        except (ValueError, TypeError, OSError):
            prev_offset, prev_ts = 0, None

    # A watermark past the end means the file was rotated or truncated; ignore it.
    if prev_offset > size:
        prev_offset, prev_ts = 0, None

    turn_starts = [r for r in records if r[2]]
    last_turn_offset = turn_starts[-1][0] if turn_starts else 0

    # Later bound wins: never re-read, never exceed the current turn.
    from_offset = max(prev_offset, last_turn_offset)
    skipped = max(0, last_turn_offset - prev_offset) if prev_offset else 0

    if size <= from_offset:
        out = {
            "nothing_new": True,
            "from_offset": from_offset,
            "to_offset": size,
            "reason": "no records appended since the last review",
        }
        print(json.dumps(out))
        return 3

    window = [r for r in records if r[0] >= from_offset]
    since_ts = next((r[1] for r in window if r[1]), None)
    last_ts = next((r[1] for r in reversed(window) if r[1]), since_ts)

    # Sum the tool_use blocks rather than the records holding them: concurrent
    # calls share one record, so counting records undercounts the turn's work.
    tool_calls = sum(r[6] for r in window)
    errors = sum(1 for r in window if r[4])

    # Subagent transcripts hold the fence-sensitive writes (Drive, BigQuery), so they
    # are part of the same turn's evidence.
    #
    # Match them to the window by the id that is already on disk, not by clock: each
    # `agent-*.jsonl` has a sibling `agent-*.meta.json` carrying the `toolUseId` of the
    # `Agent` call that spawned it. An mtime lookback cannot do this job — a fixed window
    # measured back from the *end* of the turn drops any subagent that finished earlier
    # than the lookback, and a long ingest turn is routinely 87 minutes. Widening the
    # lookback trades a silent drop for a silent over-include from the previous turn.
    # An exact id match has neither failure mode and no clock skew.
    wanted_ids = {i for r in window for i in r[5]}
    session_dir = os.path.splitext(args.transcript)[0]
    subagents = []
    fallback = []
    unmatchable = []
    matched_ids = set()
    sub_dir = os.path.join(session_dir, "subagents")
    if os.path.isdir(sub_dir):
        for name in sorted(os.listdir(sub_dir)):
            if not name.endswith(".jsonl"):
                continue
            full = os.path.join(sub_dir, name)
            meta_path = os.path.splitext(full)[0] + ".meta.json"
            try:
                with open(meta_path) as fh:
                    tool_use_id = (json.load(fh) or {}).get("toolUseId")
            except (ValueError, TypeError, OSError):
                tool_use_id = None

            if tool_use_id:
                # The id is authoritative: present in the window means in this turn,
                # absent means someone else's turn. Do not second-guess it with mtime.
                if tool_use_id in wanted_ids:
                    subagents.append(full)
                    matched_ids.add(tool_use_id)
                continue

            # No readable meta file, so fall back to the old time bound rather than
            # dropping the transcript — but say so either way, because a silent drop
            # here reads as "no subagents ran".
            try:
                recent = os.path.getmtime(full) >= os.path.getmtime(args.transcript) - 3600
            except OSError:
                continue
            if recent:
                subagents.append(full)
                fallback.append(name)
            else:
                # Unmatchable in both directions: no id to test, and outside the time
                # bound. Excluding it is the only option; doing so quietly is not.
                unmatchable.append(name)

    out = {
        "nothing_new": False,
        "from_offset": from_offset,
        "to_offset": size,
        "bytes_to_review": size - from_offset,
        "total_bytes": size,
        "since_ts": since_ts,
        "last_ts": last_ts,
        "turn_starts_in_window": sum(1 for r in window if r[2]),
        "tool_calls": tool_calls,
        "tool_errors": errors,
        "watermark_source": "watermark" if prev_offset >= last_turn_offset and prev_offset
                            else "turn-start",
        "previous_review_ts": prev_ts,
        "skipped_bytes": skipped,
        "subagent_transcripts": subagents,
        # The invariant a reviewer can check: one Agent call in the window should have
        # one transcript on disk. A shortfall names the transcripts that are missing
        # instead of leaving the reviewer to believe the list is complete.
        "agent_calls_in_window": len(wanted_ids),
        "subagents_missing_transcript": sorted(wanted_ids - matched_ids),
        "subagents_matched_by_mtime": fallback,
        "subagents_unmatchable": unmatchable,
    }
    print(json.dumps(out))

    if args.update:
        write_watermark(args.watermark, size, last_ts)

    return 0


if __name__ == "__main__":
    sys.exit(main())
