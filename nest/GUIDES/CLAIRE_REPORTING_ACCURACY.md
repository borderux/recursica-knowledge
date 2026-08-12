# Reporting accuracy — read before you publish any count

Four rules, each written after a real bug where skipping it produced a wrong number, or a
misattributed claim, that looked right.

## Re-read the state immediately before you publish a count

A number is a claim about the dataset when someone reads it, not when you first queried it. Run
the status query again immediately before you send any completion or blocker message:

```sql
SELECT status, COUNT(*) AS n FROM `<dataset>.conversations` GROUP BY status
```

**Report the breakdown, never a single total.** "1 of 48 ingested" cannot distinguish 47 failed
from 47 untouched. Give `ingested` / `failed` / `ingesting` / `superseded` with the count of
each. Rows stuck at `ingesting` are exactly what the next run needs and the one thing a total
cannot carry — a re-run keyed to "the other 47" will not know they are there.

Hold every other figure to the same standard: quote it from tool output, or do not publish it. If
it is an estimate you formed rather than a value something returned, go get the real one or leave
it out. An unsupported number next to a correct one makes the correct one harder to trust.

## "I verified" is scoped to the query you ran

Split a sentence that mixes a fact you queried with one a subagent reported — name the query for
yours, the subagent for theirs. Never write "not taken on report" over a number you did not
re-run yourself; write "Lexicon reports" instead. That phrase is what tells a reader which claims
survive a wrong subagent; spending it on a reported one blunts it everywhere it does real work.

## `ingest_runs` is a lower bound, never proof of coverage

Every stage writes its rows **before** it logs the batch, so a run killed mid-flight leaves rows
the log knows nothing about. Never state coverage, a resume point, or a line-range boundary as
verified from `ingest_runs` alone — for a killed run that claim is structurally incapable of being
true, however clean the log looks. Reconcile against the rows themselves first:

```sql
SELECT MAX(l.line_sequence_number) AS high_water
FROM `<dataset>.tags` t JOIN `<dataset>.transcript_lines` l USING (line_id)
WHERE t.conversation_id = '<id>'
```

For a Scribe resume, `MAX(line_sequence_number)` on `transcript_lines` for that conversation. If
the log is genuinely all you have, publish the number **as a lower bound, in those words** — never
as "clean", "exact", or "not a guess".

## Every count of `tags` you publish is a live count

`removed_at` is soft-retraction: a withdrawn row has to stop counting or the mechanism is
pointless. A bare `COUNT(*)` counts retracted rows too, so **never alias one `live_rows`** — the
alias is what does the lying, and it survives into every rollup downstream.

```sql
SELECT COUNT(*) AS live_rows FROM `<dataset>.tags` WHERE removed_at IS NULL
```

Filter, or give both numbers and label which is which. When a figure you published before has
changed, name which of the two moved and why — an unexplained 255 → 256 under "confirmed
unchanged" is indistinguishable from a bug, and at 45 transcripts nobody can reconcile it later.
