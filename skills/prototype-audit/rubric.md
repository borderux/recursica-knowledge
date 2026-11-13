# Prototype rubric

Version **2.0**

This rubric scores a prototype as a **reference for the real product**: how easily
a developer can copy its screens into the product using only Recursica.

It does **not** score production readiness. A prototype has no backend, sign-in or
real data, and that's fine.

## How scoring works

- **The script** means `scripts/measure.mjs` in this skill's folder. It reads the
  prototype's code, counts things and writes the results to a JSON file. It never
  changes the prototype. Run it with
  `node scripts/measure.mjs <prototype folder> --out <file>.json`.
- **The build-info script** means `scripts/build-info.mjs`. It reads the Claude Code
  transcripts of the sessions that built the prototype.
- **The build check** means `scripts/build-check.mjs`. It runs the prototype's own
  build.
- The rubric is split into **dimensions**, and each dimension into **checks**. The
  list of dimensions and checks grows over time.
- Every check is one yes/no question, scored **1** (yes) or **0** (no). There is
  nothing in between.
- A check that says "or there are none" passes when there's nothing to check, for
  example "every gap has a comment" when there are no gaps.
- Every score needs evidence: a file and line, or steps someone else can repeat.
- **Who checks it:** a check marked **script** or **build check** names the field in
  the output that holds its score. Copy that score and don't change it. A check
  marked **you** is scored by Claude, from the evidence the rubric names.
- **Two ways a check is left out of the score.** Both are flagged in the report, and
  both are left out of the totals, so they never pull a score up or down:
  - **Unsure:** the information is there, but you can't tell whether the check
    passes, for example because the rubric doesn't say what to do in this case.
    Write "Unsure", why, and what would decide it. Never guess a 1 or a 0. Each one
    also goes under "Questions about the rubric", because it means the rubric needs
    to be clearer.
  - **Not scored:** the information a check needs doesn't exist, for example because
    the build transcripts were deleted. Write "Not scored" and the reason.
- A check scored by a script is never Unsure or Not scored, unless the script itself
  couldn't run.
- **Dimension score** = the checks it passed, out of the checks scored, for example
  `4/6`.
- **Total** = all the checks passed, out of all the checks scored. Compare totals only
  between audits that scored the same checks.

## Adding a check or a dimension

- **A check:** add a row to the dimension's table with the next number (for example
  `3.4`), the yes/no question, and who checks it. Add a line under **How to check**
  if it needs one.
- **A dimension:** add a section at the end with the same parts as the others:
  **Question**, **Checks**, **How to check** and, if needed, **In the report**. Give
  it the next number.
- Change the version at the top. If a script scores the new check, change
  `RUBRIC_VERSION` in `scripts/measure.mjs` to match.

---

## 1. Only Recursica: no HTML tags, no custom CSS

**Question:** Is every screen built only from Recursica components, with no HTML tags
and no CSS of its own?

**Checks:**

| # | Check | Who checks it |
|---|---|---|
| 1.1 | No HTML tags in the screens. | script: `recursicaOnly.checks.noHtmlTags` |
| 1.2 | No inline styles (`style=`, `sx=`, `styles=`, `classNames=`). | script: `recursicaOnly.checks.noInlineStyles` |
| 1.3 | No `overStyled`. | script: `recursicaOnly.checks.noOverStyled` |
| 1.4 | No custom CSS. | script: `recursicaOnly.checks.noCustomCss` |
| 1.5 | No Recursica tokens used directly in the code. | script: `recursicaOnly.checks.noTokensInCode` |
| 1.6 | No hardcoded values. | script: `recursicaOnly.checks.noHardcodedValues` |

**How to check:**
- **HTML tags (1.1):** any HTML element written directly in a `.tsx` file, such as
  `<div>`, `<section>`, `<span>` or `<form>`. Use a Recursica component instead, and
  set the element with its `component` prop: for example `<Stack component="form">`,
  `<Group component="nav">` or `<Text component="span">`. HTML tags count even in a
  gap, because the element can always come from a Recursica component. The script
  lists them under `htmlTags`.
- **Inline styles (1.2):** listed under `inlineStyles`.
- **`overStyled` (1.3):** Recursica's escape hatch for styling a component directly.
  It's a check of its own so it's easy to see how often it's used. Listed under
  `overStyled`.
- **Custom CSS (1.4):** every `property: value` line in the prototype's own CSS files,
  **including layout and spacing**. Recursica's layout components (Stack, Group,
  Flex, LayoutGrid) take spacing props with Recursica values, such as
  `gap="rec-md"`, so a screen shouldn't need any CSS of its own. Listed under
  `customCss`.
- **Tokens used directly (1.5):** any `--recursica_…` written in a `.tsx` file.
  Recursica components apply the tokens themselves. Listed under `tokenUseInCode`.
- **Hardcoded values (1.6):** a colour like `#ffffff`, a size like `12px`, or a font
  name, in CSS or in a `.tsx` file. Listed under `hardcoded`.

Files in `src/theme/` (the Recursica theme export) aren't counted.

**The one exception: gaps.** When Recursica has no component for something, the
prototype has to build and style it itself. Put a `DESIGN-SYSTEM GAP` comment above
that CSS (or at the top of the file) saying what's missing. Nothing after that
comment counts for 1.4, 1.5 or 1.6. It goes on the gap list (dimension 4) instead.
The exception doesn't apply to HTML tags (1.1).

**In the report:** for each check that fails, the first five places, with file and
line, and how many there are in all.

---

## 2. UI kept separate from logic

**Question:** Can you copy a screen without copying calculations and fake data along
with it?

**Checks:**

| # | Check | Who checks it |
|---|---|---|
| 2.1 | No calculations in the screens. | script: `uiVsLogic.checks.noCalculationsInScreens` |
| 2.2 | No screen reads the store itself. | script: `uiVsLogic.checks.noScreensReadStore` |
| 2.3 | No screen imports the fake data. | script: `uiVsLogic.checks.noFakeDataImports` |
| 2.4 | The logic has files of its own. | script: `uiVsLogic.checks.hasLogicFiles` |

**How to check:**
- **Calculations (2.1):** each `.filter(`, `.reduce(`, `.sort(`, `new Date(`, `Math.`
  or `.getTime()` in a `.tsx` file outside `src/data/`. Listed per file under
  `perFile`.
- **Screens that read the store (2.2):** `.tsx` files that use a `use…` hook from the
  prototype's own code (for example `useStore`). Hooks from React, the router or
  Recursica don't count. Listed under `stateReaders`.
- **Fake-data imports (2.3):** `.tsx` files that import from the fake-data file (a
  file named like generate, seed, mock, fixture or fake). Listed under
  `fakeDataImports`.
- **Logic files (2.4):** `.ts` files in `src/data/` that aren't the fake data. Listed
  under `logicFiles`.

**In the report:** for each check that fails, the files, with how many places in
each.

---

## 3. Own components only where Recursica has none

**Question:** When the prototype built its own component, was that because Recursica
doesn't have one?

**Checks:**

| # | Check | Who checks it |
|---|---|---|
| 3.1 | No other UI library (such as Mantine or MUI) is used to draw UI. | script: `ownComponents.checks.noOtherUiLibrary` |
| 3.2 | Nothing reinvented: no component it built does what a Recursica component already does. | you |
| 3.3 | Every component it built is a wrapper, or it built none. | you |

**How to check:**
1. **3.1:** the script lists imports from other UI libraries under `libraryImports`.
   Setting up the provider in `src/main.tsx` doesn't count.
2. List every component the prototype built itself. These are usually the files in
   `src/components/`. The script lists them under `localComponents`.
3. For each one, ask: **does Recursica have a component that does this?** Check the
   list of components the Recursica adapter exports (`adapter.components` in the
   script output).
   - **It only puts Recursica components together, with no HTML tags and no CSS of
     its own:** that's a **wrapper**, and it's fine.
   - **Recursica has nothing for this:** that's a **gap**. Write it down for
     dimension 4.
   - **Recursica has a component for this:** that's **reinvented**. Name the
     Recursica component it should have used.
4. **3.2** fails if anything is reinvented. **3.3** fails if anything is a gap or
   reinvented.

**In the report:** a table with each component, its file, whether it's a wrapper,
gap or reinvented, and why.

---

## 4. List of what Recursica is missing

**Question:** Is every gap from dimension 3 written down, so the Recursica team can
see it?

**Checks:**

| # | Check | Who checks it |
|---|---|---|
| 4.1 | Every gap has a `DESIGN-SYSTEM GAP` comment in the code, or there are none. | you |
| 4.2 | `GAPS.md` lists every gap, or there are none. | you |
| 4.3 | Every gap in `GAPS.md` says what was needed and what the prototype did instead, or there are none. | you |
| 4.4 | Every gap in `GAPS.md` links to where it was reported to the Recursica team, or there are none. | you |

**How to check:** start from the gaps you found in dimension 3, and the gaps that the
comments and `GAPS.md` name themselves. The script lists the comments under
`gapsList.gapTagsInCode` and finds `GAPS.md` under `gapsList.registerFile`. 4.3 and
4.4 fail if there are gaps but no `GAPS.md`.

---

## 5. More than the happy path

**Question:** Can you see what each screen looks like when things aren't perfect?

**Checks:**

| # | Check | Who checks it |
|---|---|---|
| 5.1 | Every screen with a list or table shows its empty state, or there are none. | you |
| 5.2 | Every screen that shows data shows its loading state. | you |
| 5.3 | Every screen that shows data shows its error state. | you |

**The states:**
- **Normal:** the screen with data. Always there, so it isn't a check.
- **Empty:** no data yet. Applies to screens with a list or table.
- **Loading:** waiting for data. A prototype's fake data loads instantly, but the
  real product's data won't, so it applies to every screen that shows data.
- **Error:** the data failed to load. Applies to every screen that shows data.

**How to check:** for each screen (each route, listed by the script under
`states.routes`), try to reach each state **without editing code**: by clicking,
changing the URL, switching account, or opening a story. Write down how you reached
it, or ✗ if you couldn't. If a state doesn't apply to a screen, write N/A and why.
The script lists story files under `states.stories` and ways to switch the data in
the running app (such as `?scenario=empty`) under `states.mockSignals`, which can
help you find the states.
A check passes only if every screen it applies to has the state.

**In the report:** a table with one row per screen and one column per state, each
cell saying how to see that state, ✗, or N/A and why.

---

## 6. Builder independence

**Question:** Did a person have to correct the builder?

**Checks:**

| # | Check | Who checks it |
|---|---|---|
| 6.1 | No correction about Recursica: components, props, theme or CSS. | you |
| 6.2 | No correction about what to build: the PRD misread, or a screen, feature or detail wrong or missing. | you |
| 6.3 | No correction about how the builder worked: the wrong folder or repository, the wrong tool, stopping too early, or anything else. | you |

**How to check:** use `laterPrompts` in the build-info result. If the build
transcripts weren't found, these checks are not scored. The first prompt is the
request itself and doesn't count. Give each later prompt one label, and quote it in
the report:
- **Correction:** it says the builder did something wrong, or was about to.
  Example: "Why are you looking at eyepop-test-recursica?" Then say which of 6.1, 6.2
  or 6.3 it's about. If it's about more than one, it fails each of them.
- **Answer:** it replies to a question the builder asked. Answers never count,
  because asking is the right thing to do when the PRD isn't clear.
- **Other:** anything else, such as "how many tokens did you use?"

Every correcting prompt counts, even when two prompts correct the same thing.

**In the report:** a table of the later prompts, each with its label, the check it
fails (for corrections), and the quote. Also the number of corrections in all.

---

## 7. Design review fixed

**Question:** Was everything the design review found fixed?

**Checks:**

| # | Check | Who checks it |
|---|---|---|
| 7.1 | A design review was run. | you |
| 7.2 | The last review round found nothing. | you |

**How to check:** use `totals.designReviews` in the build-info result. Each review
round is one Barb run. `violations` is the number of findings that survived Feisty's
challenge. If the build transcripts weren't found, these checks are not scored.
- **7.2:** a fix with no review after it doesn't count as fixed, because nothing
  checked it. Only a later review round that finds nothing shows the findings are
  gone. If no review was run, it fails.

How much the review found, and how many rounds it took, isn't scored here. It's
recorded under "How it was built" in the report, with the tokens and time.

---

## 8. It builds

**Question:** Does the prototype pass its type check and build, with no warnings?

**Checks:**

| # | Check | Who checks it |
|---|---|---|
| 8.1 | The type check passes. | build check: `checks.typecheckPasses` |
| 8.2 | The production build passes. | build check: `checks.buildPasses` |
| 8.3 | No warnings. | build check: `checks.noWarnings` |
| 8.4 | The dev server starts. | build check: `checks.devServerStarts` |

**How to check:** the build check runs `npm run typecheck`, `npm run build` and
`npm run dev`. If it says `node_modules` is missing, run `npm install` in the
prototype and run it again.
- **8.1:** fails if `package.json` has no `typecheck` script.
- **8.3:** every warning from the type check or the build counts.
- **8.4:** the dev server must start within 30 seconds.

If 8.2 and 8.4 both fail, nothing runs. Say so at the top of the report, before
the scores.

**In the report:** each warning or error, quoted.

---
