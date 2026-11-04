# prototype-audit

**Status:** rubric version 2.0 (2026-11-04), installed in
`~/.claude/skills/prototype-audit/`.

Scores a finished Recursica prototype as a reference for the real product. What gets
scored is defined in `rubric.md`: dimensions, each split into yes/no checks scored
1 or 0. The list of checks will grow.

## Files

- `SKILL.md`: the steps Claude follows.
- `rubric.md`: what gets scored, and what each score means.
- `scripts/measure.mjs`: the scores for checks that can be counted, plus the
  evidence for the others.
- `scripts/build-info.mjs`: how the prototype was built (tokens, time, models, MCP
  servers, skills, agents, the person's prompts, design reviews), read from the
  Claude Code transcripts on this machine. Measuring stops when the audit starts, so
  an audit run in the build session isn't counted as part of the build. It only
  works while the transcripts still exist (30 days by default).
- `scripts/build-check.mjs`: runs the prototype's type check, build and dev server,
  and records whether each passes and any warnings.
- `scripts/report-html.mjs`: turns the finished Markdown report into a styled HTML
  page next to it, with coloured badges for each check and dimension score, and a
  flag on checks left out of the score. It works offline and in light and dark mode.
- `templates/report.md`: the report layout.

## Try the script on its own

```sh
node scripts/measure.mjs ../../fixpoint-dashboard
```

## Install

Copy this `prototype-audit` folder to `~/.claude/skills/`. Then ask Claude to
"audit this prototype".

## Still to decide

1. Add more states to the states dimension later (missing fields, role variants, very long content)?
2. Add accessibility as a dimension later?

Decided:
- Version 2.0: every check is a yes/no question scored 1 or 0. Version 1.0 scored each
  dimension from 0 to 3, so its reports can't be compared check by check.
- If Claude is unsure about a check, it marks it Unsure instead of guessing. Unsure
  and Not scored checks are flagged and left out of the totals.
- `overStyled` is a check of its own (1.3), separate from inline styles.
- Removed: "Ways to see those states" (Storybook and mock mode) and "Recursica setup"
  (brand theme and workarounds). The design review's counts are recorded under "How
  it was built", not scored.
- Every line of the prototype's own CSS counts as custom CSS, layout and spacing
  included, because Recursica's layout components take spacing props (`gap="rec-md"`).
  Using a Recursica token directly counts too. The only exception is CSS after a
  `DESIGN-SYSTEM GAP` comment.
- Builder independence: every correcting prompt counts, even two about the same thing.
- Design review fixed: no design review fails both checks, and a fix with no review
  after it doesn't count as fixed.
- It builds: every warning counts.
