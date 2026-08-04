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

    records: (offset, timestamp, is_turn_start, tool_name, is_error) per parsed line.
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
            for b in blocks:
                if isinstance(b, dict) and b.get("type") == "tool_use":
                    tool_name = b.get("name")
                    break

            is_error = any(
                isinstance(b, dict) and b.get("is_error") for b in blocks
            )

            records.append((start, ts, is_turn_start, tool_name, is_error))
    return records, offset


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--transcript", required=True)
    ap.add_argument("--watermark", required=True)
    ap.add_argument("--update", action="store_true",
                    help="persist the new watermark (skip for dry runs)")
    args = ap.parse_args()

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

    tool_calls = sum(1 for r in window if r[3])
    errors = sum(1 for r in window if r[4])

    # Subagent transcripts hold the fence-sensitive writes (Drive, BigQuery), so they
    # are part of the same turn's evidence.
    session_dir = os.path.splitext(args.transcript)[0]
    subagents = []
    sub_dir = os.path.join(session_dir, "subagents")
    if os.path.isdir(sub_dir):
        for name in sorted(os.listdir(sub_dir)):
            if not name.endswith(".jsonl"):
                continue
            full = os.path.join(sub_dir, name)
            try:
                if os.path.getmtime(full) >= os.path.getmtime(args.transcript) - 3600:
                    subagents.append(full)
            except OSError:
                continue

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
    }
    print(json.dumps(out))

    if args.update:
        try:
            os.makedirs(os.path.dirname(args.watermark), exist_ok=True)
            tmp = args.watermark + ".tmp"
            with open(tmp, "w") as fh:
                json.dump({"offset": size, "ts": last_ts}, fh)
            os.replace(tmp, args.watermark)
        except OSError as exc:
            print("watermark write failed: %s" % exc, file=sys.stderr)

    return 0


if __name__ == "__main__":
    sys.exit(main())
