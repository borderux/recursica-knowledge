# Audit: <prototype name>

Commit `<short sha>` · Rubric <version> · <YYYY-MM-DD>

## Scores

Every check is scored 1 (yes) or 0 (no). A dimension's score is the checks it passed,
out of the checks scored.

| # | Dimension | Score |
|---|---|---|
| <n> | <dimension name from rubric.md> | <passed>/<scored> |
| | **Total** | **<passed>/<scored>** |

<One row for every dimension in rubric.md, in order.>

**Left out of the score:** <n> Unsure, <n> Not scored: <their check numbers>. <Or
"None: every check was scored.">

## What Recursica is missing

| What was needed | Where | What the prototype did instead |
|---|---|---|
| | | |

## How it was built (not scored)

<From the build-info result. If nothing was found, write "Not available" and the
reason given in its `note`.>

> **Measuring stops when the audit starts.** Every number in this section covers the
> build only, up to the moment the prototype-audit skill was started. If the audit
> was started in the same session that built the prototype, the time, tokens,
> prompts, MCP calls, agents and design reviews from that moment on are left out.
>
> **Measured until:** <`measuredUntil` for each session, as a date and time, or "the
> end of the session: the audit was run in a separate session, so nothing was left
> out">

<If anything was left out, add this table, from `leftOutAfterAudit`:>

| Left out after the audit started | |
|---|---|
| Time | <active minutes> minutes |
| Tokens | <output> output · <input> input · <cache write> cache write · <cache read> cache read |
| Prompts | <n> |
| Subagents | <n> |

| | |
|---|---|
| Sessions | <n>: <title> for each |
| Models | <model: number of responses> |
| MCP servers | <server: calls (tool: calls, …)>, or none |
| Skills | <skill: uses>, or none |
| Agents | <agent type: count, …> · <n> subagents, nested up to <depth> levels |
| Design review | <n> rounds · <violations in all> violations in all |

**Design review rounds**

Each round is one Barb run. Violations are the findings that survived Feisty's
challenge. Violations per screen uses the number of screens from dimension 5.

| Round | Date | Violations | Violations per screen |
|---|---|---|---|
| <n> | <date and time> | <n> | <violations ÷ screens, to one decimal> |

<Or "No design review was run.">

**Time: <active minutes> minutes active**

A work period is a stretch of work with no break longer than 30 minutes. Active time
is the length of all work periods added up.

| Work period | Start | End | Minutes |
|---|---|---|---|
| <n> | <date and time> | <date and time> | <minutes> |

**Tokens**

Each type is listed on its own because they cost very different amounts.

| Type | What it is | Tokens |
|---|---|---|
| Output | Text the model wrote, including its thinking and the code it wrote | <n> |
| Input | New input the model read, not from the cache | <n> |
| Cache write | Input stored in the cache so later requests can reuse it | <n> |
| Cache read | Input reused from the cache. Usually most of the volume, and much cheaper than new input | <n> |

**Tokens by agent**

| Agent | Output | Input | Cache write | Cache read |
|---|---|---|---|---|
| <agent type, or "main session"> | <n> | <n> | <n> | <n> |

<One sentence on the split, for example how much of the output was the build and how
much was the design review.>

<If a session also wrote files outside the prototype, say so here. Its totals include
that other work.>

## Score details

<Repeat this section for every dimension in rubric.md, in order.>

### <n>. <dimension name>: <passed>/<scored>

| # | Check | Score | Evidence |
|---|---|---|---|
| <n.n> | <the check, from rubric.md> | <1, 0, Unsure or Not scored> | <file:line or steps to repeat. For Unsure: why, and what would decide it. For Not scored: the reason.> |

<One row for every check in the dimension, in order.>

<Any table the dimension's "In the report" asks for.>

**To pass the checks that failed:** <for each check scored 0: its number and what to
change. Leave this out if every check passed.>

## Compared with the last audit

<"First audit." or a table: check · before → after · why. If the earlier audit used a
different rubric version, say so, and compare only the checks both versions have.>

## Questions about the rubric

<Every check marked Unsure: its number, why, and what would decide it. Then anything
else the rubric didn't make clear, or a count that looked wrong. Write "None" if
there were none.>
