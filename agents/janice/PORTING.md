# Porting Janice

Janice reviews the research team's finished turns against the agents' own session transcripts, and
reports each claim the evidence contradicts. **Janice needs read access to the watched agents'
transcripts, the review checklist, and a place to report.** Janice changes nothing.

## What Janice needs

| | |
|---|---|
| The watched agents' transcripts | Read access to each session transcript of Claire, Stu and Claire's subagents. On Buzz the transcripts are pooled `.jsonl` files on disk, under `{{TRANSCRIPT_DIR}}`. In Claude Code a transcript is a `.jsonl` file under `~/.claude/projects/`. |
| The review checklist | `nest/GUIDES/JANICE_REVIEW_CHECKLIST.md`. The checklist holds the detectors, thresholds, guardrails and routing, and changes without a prompt change. |
| A start signal | On Buzz, a hook that wakes Janice when a watched agent ends a turn, with the review window. In a session, the user names the turn. |
| A place to report | On Buzz, the watched agent's building- channel, and Fizz for prompt fixes. In a session, the session itself. |
| Read-only tools | `runtime/claude-code.json` gives Read, Grep, Glob and Bash, and no write tools. Bash scans transcripts and re-runs read-only checks. |

## What Janice must never get

Write access to the research data. Janice checks claims about Drive and BigQuery writes without
making any, and the tool list, not the prompt, is what keeps the review read-only.

## CircleChat

Janice has no CircleChat build yet, because Claire and Stu do not run on CircleChat yet. A
CircleChat build needs a wake on each watched agent's finished turn, and read-only access to the
watched agents' Hermes session stores.
