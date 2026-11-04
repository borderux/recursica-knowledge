---
name: prototype-audit
description: Score a finished Recursica prototype as a reference for the real product, using the yes/no checks in rubric.md, each scored 1 or 0. Use after a prototype built from a PRD is finished, or when asked to audit or score a prototype, list what Recursica is missing, or compare a prototype with an earlier audit.
---

# Prototype audit

Scores a prototype as a reference for the real product: how easily a developer can
copy its screens using only Recursica, and how well it was built. What gets scored is
defined in `rubric.md`: dimensions, each split into checks. Every check is a yes/no
question scored 1 or 0. The list grows over time.

## Rules

- **Don't change the prototype's source.** Only write files in its `audits/`
  folder. The build check writes the build output to `dist/`, which git ignores.
- **Some checks are scored by a script.** `rubric.md` says which ("Who checks it")
  and the field that holds the score. Copy those scores exactly.
- **You score the rest.** Follow `rubric.md` and give evidence for every score.
- **Only 1 or 0.** Nothing in between.
- **If you're unsure, don't score it.** Write "Unsure", why, and what would decide
  it, and add it to "Questions about the rubric". Never guess a 1 or a 0.
- **If the information doesn't exist,** for example because the build transcripts
  were deleted, write "Not scored" and the reason.
- **Unsure and Not scored checks are left out of the totals.**

## Steps

1. **Measure the code** and save the result:
   ```sh
   mkdir -p <prototype>/audits
   node <this skill's folder>/scripts/measure.mjs <prototype> --out <prototype>/audits/<YYYY-MM-DD>-<commit>.measure.json
   ```

2. **Collect the build info.** This reads the Claude Code transcripts on this
   machine to find the sessions that built the prototype: tokens, time, models, MCP
   servers, skills, agents, the person's prompts and the design reviews.
   ```sh
   node <this skill's folder>/scripts/build-info.mjs <prototype> --out <prototype>/audits/<YYYY-MM-DD>-<commit>.build.json
   ```
   Measuring stops when the audit starts: if this skill is running in the same
   session that built the prototype, everything from the prompt that started it is
   left out, so the audit's own time and tokens aren't counted as the build. The
   report must say so (see the template).
   Claude Code deletes old transcripts after a while (30 days by default), so this
   only works soon after the build. If it finds nothing, the checks that need it are
   Not scored.

3. **Check that it builds:**
   ```sh
   node <this skill's folder>/scripts/build-check.mjs <prototype> --out <prototype>/audits/<YYYY-MM-DD>-<commit>.build-check.json
   ```
   If it says `node_modules` is missing, run `npm install` in the prototype first.

4. **Read `rubric.md`.**

5. **Checks a script scores:** copy each score from the field `rubric.md` names.

6. **The other checks:** answer each one with 1 or 0, following `rubric.md`, or
   mark it Unsure. Write down the evidence as you go.

7. **Write the report** using `templates/report.md`, in the template's order: the
   score table, what Recursica is missing, the build info, then under "Score
   details" one section for every dimension in `rubric.md`, in order, with a row
   for every check. Save it as `<prototype>/audits/<YYYY-MM-DD>-<commit>.md`.

8. **Compare.** If `audits/` has an earlier report, put its scores next to the new
   ones and explain each change. Compare totals only when both audits scored the
   same checks. An earlier report from a different rubric version (the version is at
   the top of each report) can't be compared check by check: say so, and only
   compare what's clearly the same. If the earlier report is for the **same commit**
   and the **same rubric version** and a score is different, tell the user: the
   rubric isn't clear enough there.

9. **Make the HTML version** once the Markdown report is finished. It's written next
   to the report, as `<prototype>/audits/<YYYY-MM-DD>-<commit>.html`:
   ```sh
   node <this skill's folder>/scripts/report-html.mjs <prototype>/audits/<YYYY-MM-DD>-<commit>.md
   ```
   Don't edit the HTML by hand. If the report changes, change the Markdown and run
   this again.

10. **Tell the user** each dimension's score, the total, the checks that failed, the
    checks left out (Unsure or Not scored), the list of what Recursica is missing,
    and the build time and tokens. Link both the Markdown and the HTML report.
