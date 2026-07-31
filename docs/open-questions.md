# Open questions from the component skill rewrite

Everything below came out of writing the 39 component skills against three sources: the token inventory in `recursica_ui-kit.json`, the published `DOCS.md` frontmatter, and the recorded design-rules skills. Where those disagreed, nothing was resolved by guessing — each item sits in an `## Uncovered — ask, do not invent` section in the relevant skill, and an agent hitting it will stop and ask.

Ordered by what costs the most to leave unanswered. **Items that have since been decided have moved to [the bottom of this file](#now-resolved)** rather than being deleted, so the reasoning stays on the record.

Two things changed about how this list is used:

- **`DOCS.md` is no longer agent knowledge.** The skills are the knowledge base; the website pages are for people. Skill packages ship the `SKILL.md` alone, and no skill mentions the website as a source. So a conflict in section 1 below is now a _website copy_ problem rather than something that can mislead a build agent.
- **When the layers disagree, the design rules win.** The design-rules and psychology skills were recorded from the team; the component skills were assembled around them. The router states this precedence, and the component skills have been corrected against it. A component skill still wins on one thing only: which variants and states actually exist.

## 1. Published pages that steer people to the wrong component

Each page's **body copy has been rewritten** to follow the skill, and the original is retained verbatim in a `LEGACY` comment at the end of the file. What is listed here is what the old copy claimed — kept as a record of which pages were wrong, because **the frontmatter and its spec imagery still reflect the old model** and only you can regenerate those. Copy and asset fixes, not design decisions.

| Page              | What it says                                                                                  | The house rule                                                                                       |
| ----------------- | --------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Button            | "Use buttons for guiding users through navigation"; links only for leaving the app            | A button acts and never navigates. Anything that changes the URL is a link                           |
| Segmented control | Above five options, "use Tabs or a Select component"                                          | Tabs are never the fallback. A vertical radio group, or a dropdown past 7 ± 2                        |
| Stepper           | "Don't use a stepper if the steps can be completed in any order (use tabs instead)"           | A form is never split across tabs — the stepper exists to replace that structure                     |
| Card              | Recommends cards for "modular, responsive, grid-based layouts"                                | A screen is never built out of cards; a region does not need a box                                   |
| Accordion         | "Maximize space ... only show what's necessary"                                               | Progressive disclosure defers a long tail of demand; it is not a fix for a crowded screen            |
| Menu              | Submenus open "on hover or click"; right-click context menus                                  | A menu never opens on hover                                                                          |
| Timeline          | "Comparative streams: parallel tracks side-by-side", plus completed/current/upcoming statuses | Nothing supports two tracks, and the only states are active and inactive                             |
| Checkbox          | "Use **radio groups** to show users all the options"                                          | Copy-paste defect on the checkbox page                                                               |
| Breadcrumb        | Breadcrumbs show "the path they've taken"                                                     | A trail reflects hierarchy, not history — two users arriving differently see the same crumbs         |
| Read-only field   | "Use a disabled field if you want to retain the input styling but block interaction"          | Read-only is a separate component; a disabled field is one that could become operable                |
| Pagination        | Search results, catalogs, blog archives; first and last page shortcuts                        | A table footer control for interior tables; first/last are not part of the component                 |
| Time picker       | Reach for "a combined DateTime picker"; "don't force manual typing"                           | No such component exists — compose three controls under one label, and typing always stays available |
| File upload       | "Provide drag-and-drop support and clear progress indicators"                                 | Drag is never the only path, and no progress state exists                                            |
| Loader            | For a determinate process "use a progress bar instead"                                        | No determinate variant exists anywhere in the kit                                                    |
| Toast             | Send critical alerts to "banners"                                                             | No banner component exists in this system                                                            |
| Text area         | "Allow the text area to dynamically resize based on its content"                              | `rows` is fixed and token-owned                                                                      |
| Transfer list     | "Provide 'move all' buttons"                                                                  | Select-all is treated as a signal to reconsider the structure                                        |
| Tooltip           | For "form fields where a permanent label is not necessary"                                    | A tooltip is never a field's label, hint, or error                                                   |

## 2. The kit and the website document different axes

Same component, two incompatible models. Each needs one of them named authoritative.

- **Avatar** — kit: `text` / `icon` / `image`. Website: Image / Primary / Background / Ghost, **plus a Border true/false axis** the kit has no property for. The two taxonomies are not reconcilable. The website also documents separating overlapping avatars in a group; there is no group or stack variant.
- **Badge** — kit styles are `primary-color` / `warning` / `success` / `alert`; the website's are Primary / Background / Alert / Success. The website also ships a Size axis (Default, Large) and a Content axis (Message, Counter) that the kit does not define.
- **Loader** — the website documents three types (Oval, Bars, Dots) and sizes xs/sm/md; the kit has `small` / `default` / `large` and no types. The website's anatomy describes a track showing "percentage of completion" — a determinate component that does not exist.
- **Tooltip** — the website documents a Position axis (top/left/right/bottom) and Beak alignment (start/middle/end). The kit has no placement axis at all, only a fixed `beak-size` and `beak-inset`. Same gap on menu and hover card.
- **Number input** — the website documents increment/decrement Controls, plus collapsed/expanded states and an unvalued/valued content axis. The kit has none of it — **and `recursica-skill-text-field` routes "a number that needs increment controls" to this component.** A three-way contradiction.
- **Switch** — the website documents an Orientation axis (label On Left / On Right); no such axis exists on `switch`, `switch-item`, or `switch-group`.
- **Slider** — the website documents Single vs. Range selection and Continuous vs. Discrete; the kit has one thumb, no range axis, and no types axis. It also documents a Hover state the kit lacks.
- **File upload / file input** — the website documents Button vs. Drop zone styles, Single vs. Multi-file types, a dismissible file chip and a clear-all icon. The kit has a single `border-style` property and none of the rest.
- **Panel** — the website documents Standard and Scrollable types; the kit has no types axis, and no side, edge, or width axis either, so which edge a panel comes from is unanswerable.
- **Stepper** — the website documents Done / Current / Upcoming states and a step number and checkmark in the indicator; the kit defines no state axis and no token for either mark. Progress rides only on the connector size.
- **Timeline** — the website documents Left/Right alignment and a highlighted connecting line for completed events; the kit has neither.
- **Breadcrumb** — the website documents a content axis including **Icon only**, which cannot name a destination. The kit defines only `padding` and `item-gap` — no separator token at all.
- **Date picker** — the website ships a Read only state; read-only is a separate component.
- **Chip** — the website ships Error and Error-selected states. A chip must not carry an error condition, but a required chip group with nothing selected is a genuine form error. Confirm whether the states exist for that case.
- **Hover card / popover** — one kit spec, one page titled "Hover card", and two components with different accessibility contracts. Whether these are one thing or two decides the whole contract.
- **Menu** — the website documents Single select / Multi select / Custom content; the kit has only `selected` / `unselected` on `menu-item`.
- **Textarea** — the website documents a Vertical resize axis (Auto, Custom) against the kit's fixed `rows`.

## 3. Capabilities the rules require that the kit has no tokens for

These are gaps rather than conflicts. Each one is something an agent will be asked to build and cannot.

- **The multi-select dropdown.** `recursica-skill-selection-controls` mandates it in two places — a checkbox group inside a dropdown — and there is nothing to compose it from.
- **No error state on checkbox, radio, or switch**, individually or as a group, while dropdown and autocomplete both have one. A group-level selection rule that fails validation has no treatment.
- **No selected-row or hover-row state on the table**, while `recursica-skill-tables` requires row selection and clickable rows.
- **No expanded or collapsed state on the tree.** The largest single gap — the component's central behavior has no token.
- **No disabled state on `accordion-header` or `menu-item`**, while `recursica-skill-navigation` says to disable what the user can unlock themselves.
- **No progress, success, or per-file error state on either file component.**
- **No determinate loader and no skeleton**, so a long wait cannot communicate how long.
- **No token for a toast's action button or close icon**, only `icon` and `text` — and no duration token, which leaves the dismissal question below unanswerable.
- **The open menu and the filtered option list are entirely outside the inventory** for dropdown, autocomplete, and menu: option rows, grouping, max height before scroll, empty-result treatment.
- **The date picker's calendar popover and the time picker's period selector** have no tokens, so whether selection commits on click or needs a Confirm is unknown, as are min/max and disabled dates.

## 4. Decisions only you can make

- **Live regions remain unowned.** Announcing dynamic updates to assistive technology was deferred out of the typography session and never picked up in the feedback session. Every component skill states its own announcement requirements — polite versus assertive, debounced counts, focus never moving — and those are consistent with each other, but there is no recorded cross-surface policy behind them.
- **The banner component is pending, not undecided.** The channel rule is settled — not-yet-happened is a banner, just-happened is a toast — and the component is planned. Until it ships, two skills instruct the agent to raise the need rather than improvise a substitute. Worth tracking as a build item rather than an open question.

- **Toast dismissal timing.** The old guidance was 4–6 seconds with a manual close. That collides directly with keeping an undo reachable by keyboard — an auto-dismissing toast pulls the action away from someone who is still tabbing toward it. This is the sharpest live contradiction in the set.
- **Radio pre-selection.** The Radio page says "always have the top radio button in a group selected." `recursica-skill-selection-controls` says be very cautious about pre-selecting anything, because a radio cannot be deselected. The same page then says a progressive-disclosure radio group should render with nothing selected.
- **Whether a table's page is a real route with a history entry.** This decides whether a page number can legitimately be a link, which decides whether previous and next may ever be disabled — and `recursica-skill-link` forbids disabling a link.
- **Switch commit timing in a batch-save form.** One skill says a change needing Save is a checkbox; the design rules allow a switch to commit on submit if every switch does.
- **When `small` applies** on button, stepper, and elsewhere. No rule assigns the small size to any surface.
- **When Elevation applies and when Outline does** on the card. Both exist, neither is assigned.
- **The label's edit affordance.** The kit reserves an `edit-icon-gap` on `label`; the read-only field page describes an edit icon that appears on hover, which the no-hover-only rule forbids.
- **The autocomplete-versus-dropdown threshold**, recorded as explicitly unset.
- **Which icon set is the Recursica default.** The set is chosen by the designer and configured into the dev tooling, and there is always a default — but the default is not named anywhere an agent can read. Until it is, an agent cannot verify that an icon it reaches for is in the configured set.
- **Whether a status may be icon-only outside a table.** `recursica-skill-icon-semantics` requires a status icon in a table cell to be paired with text, and separately allows a status icon instead of text for scannability. The boundary between those two was not drawn.
- **Whether a system may ever hold more than one icon set.** Stated as "typically" one, with no case given where two would be correct.
- **Which remembered states should persist across sessions.** Asked directly in the defaults session; the answer was "I don't know." Every skill that touches persistence now defers here.
- **How to weigh a minority's inconvenience against a majority's benefit** when choosing a default. Stated outright as having no rule, so every instance escalates.

## 5. From the site audit — assets and copy only you can supply

Every page under `recursica.com/docs/components` was compared against its `DOCS.md`. **No `When to use` or `When to avoid` item from any page was missing from the repo.** What was missing was structural, and is now recovered: **99 per-item spec descriptions** the frontmatter had no field for, **7 spec items**, **4 whole spec sections**, and **8 anatomy labels**.

Three things need you:

- **Regenerated assets for 21 items.** The frontmatter convention is `raw.githubusercontent.com/borderux/recursica.com/.../assets/<slug>-<section>-<label>.svg`. For newly recovered items no such asset exists, so they point at the live `framerusercontent.com` URL instead. Affected: Dropdown (Disabled), Link (Inline), Loader (Lg, Xl), TextField (Read only), TimePicker (Disabled — served as PNG), ReadOnlyField (Is editable), HoverCardPopover (Dismissal, plus all 12 popover items), SegmentedControl (Wide states → Vertical), Tooltip (Custom), and all 14 Table assets.
- **Four asset filenames derived from a wrong label.** On Link → Variations, Modal → Sample, and SegmentedControl → Wide states, a _description_ had been stored in the `label` field, so the real labels — Standalone, Focused action, Horizontal — were lost and the generated filenames encode the description instead. The labels are restored; the filenames still need regenerating.
- **Inline emphasis is dropped everywhere.** Several pages italicise or bold words inside anatomy text and spec descriptions — _required_, _optional_, **visually groups**. The frontmatter has no shape for inline markup, so those are stored plain. That needs a schema decision, not a per-file fix.

Two site-side copy notes: **File input** reuses Date picker's label-placement wording verbatim, including "the stacked version", under its own labels Top and Left. **Tabs → Outline** reads "looses its bottom border" and **Table → anatomy 5** reads "Fo UIs that utilize borders" — captured verbatim.

## 6. Assets only you can supply

- **Tree has no page at all.** `recursica-skill-tree` is the only component skill whose sole source is the token inventory, which is why its uncovered list is the longest.
- **Label and assistive element have no pages** either. Both are real components in the token inventory and both are load-bearing — between them they own the field label, the required and optional markers, and the help-and-error text every field uses.
- **Table is fixed.** It had no `specs` and no `anatomy` at all, and a title reading "Tabs". All four spec sections, thirteen items, and six anatomy items are now in from the site, along with a `skill:` block and the site's verbatim intro sentence.
- **Autocomplete now has a page** — recovered from the site's `search` page, since Search was renamed Autocomplete.

## What is settled

The shared form-field substrate turned out to be real and consistent, which resolves the question of whether the field skills need a common text block. They do not — three components own it and every field skill points at them:

- `globals.form.field` supplies colors and sizes to every field, and `globals.form.properties` supplies the label-field gaps.
- `label` owns the field's name, its side-by-side or stacked placement, the required indicator, and the optional text.
- `assistive-element` has exactly two types, `help` and `error` — which is the mechanism behind the rule that an error **replaces** the help text rather than joining it, keeping the field height stable.

## Found by building — package and adapter defects

From Test 4, an IT equipment provisioning tool. These are **engineering defects, not design questions** — the design rules are right and the shipped code disagrees with them. Listed worst first.

| Defect                                                                                                                                                          | Impact                                                                                                                                                                       | Where it bites                                                                                                                                                                  |
| --------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **`Panel` defaults to modal behavior.** It wraps Mantine `Drawer`, which draws an overlay, closes on click-outside, traps focus, and locks scroll               | **The adapter ships the opposite of the house rule.** A panel built from the documented API alone is silently modal, and the page behind it goes dead                        | Requires four raw `Drawer` props to undo — now documented in `recursica-skill-panel` as a temporary workaround with a note to delete it once fixed                              |
| **`AssistiveElement` is documented but not exported** from `@recursica/mantine-adapter` — every other component is re-exported, that one is not                 | A documented component cannot be imported. Cost a build cycle to discover                                                                                                    | The workaround is arguably better anyway: `TextField`'s own `error` prop, which is the component-owned mechanism the skills already prefer                                      |
| **`<Layer layer={0..3}>` is referenced in the Panel, Badge, and Dropdown docs and exported nowhere**                                                            | There is no sanctioned way to paint a themed background surface. It is very likely the un-shipped fix for the page-canvas gap below                                          | Forces either raw CSS variables (forbidden by project rules) or reaching into Mantine's own tokens                                                                              |
| **`RecursicaThemeProvider theme="dark"` does not sync Mantine's color scheme.** It flips `data-recursica-theme` but leaves `data-mantine-color-scheme` on light | **A first-time integrator following only the documented API ships a half-dark page and may not notice**, because most individual components do re-theme correctly            | Needs a manual `useMantineColorScheme().setColorScheme()` in lockstep, plus a page-canvas rule against a Mantine variable, since nothing in the Recursica layer paints the body |
| **No chart or graph component of any kind**                                                                                                                     | `recursica-skill-data-visualization` is nineteen sections of rules with nothing to apply them to. The test hand-built a bar chart from layout primitives with badges as bars | Now stated at the top of that skill, which previously read as though charts existed                                                                                             |
| **`Dropdown` maps to `Select`, not `MultiSelect`** — no multi-select anywhere                                                                                   | `recursica-skill-selection-controls` requires a multi-select dropdown in two places                                                                                          | Confirmed in the shipped adapter, not just absent from the tokens. Independent single-value filters that AND together were an acceptable substitute                             |

Two smaller notes worth keeping:

- **`TextField`'s events are ordinary React synthetic events.** Reading `e.currentTarget.value` lazily inside a `setState` updater callback threw and blanked the whole panel. Capture eagerly.
- **There is no error boundary**, so that throw unmounted the tree to a blank screen with nothing obvious in the console. That is a real input for the empty/loading/error-states session — a blank page is the worst possible error state and the system currently has no answer for it.

## From the design review of Test 4's screens

A round of feedback on generated screens, treated as rules rather than fixes for that app. Most of it became new rules; three things are recorded here because they still need you.

**Needs your decision:**

- **The status-to-intent map for badges.** Settled: the intent must agree with the sentiment, and `alert` never carries a positive value like _approved_. Not settled: which of the four intents each domain status takes. With four intents against a typical seven-or-more statuses, the mapping needs stating once rather than being improvised per screen.
- **What each layer level means.** The component docs refer to `Layer` 0 through 3 and the component is not exported. The rule that a blurred-together region needs a surface is recorded; which level, and what distinguishes them, is not.
- **A parent status alongside per-item statuses.** A request carrying one overall status while each line item carries its own from the same vocabulary raises questions nothing answers: what derives the parent, what happens when items disagree, and whether both are editable. This is a data-model question surfacing as a UI one, and it will recur in any order-like domain.

**Recorded as rules elsewhere:** switch is form-only with segmented controls for every toggle outside a form; bulk actions revealed on selection when there is one and persistent-but-disabled when there are several, with a prior question about whether bulk belongs at all; action labels naming what actually happens; a sorted column always indicated even when sort is fixed; no tables inside panels; secondary panel content in a second tab; nothing completed rendered as pending; conditional requirements stating their condition; every label a noun with no filler and no gloss beside it.

## Now resolved

These were open when this file was first written. Each was settled by reading the design rules rather than by adding new opinion, and the corresponding `## Uncovered` entries have been removed from the component skills.

| Was open                                                  | Resolution                                                                                                                                                                                            | Authority                                                           |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| When a vertical tab set is correct                        | It is a sanctioned house pattern — one of the two answers, with shorter labels, when a horizontal set does not fit                                                                                    | `recursica-skill-navigation`                                        |
| When the vertical segmented control applies               | It does not. Use `horizontal`; a vertical single-select is a radio group                                                                                                                              | `recursica-skill-selection-controls`                                |
| Radio pre-selection                                       | The "always select the top option" guidance was website copy and is wrong. Be cautious about pre-selecting, because a radio cannot be deselected                                                      | `recursica-skill-selection-controls`                                |
| The radio option ceiling                                  | 7 ± 2. The competing "never above eight" is gone                                                                                                                                                      | `recursica-skill-working-memory`                                    |
| Switch commit timing in a batch-save form                 | Follows the application's single save mode. A switch waiting for Save is correct if every switch does; mixing the two is the actual prohibition                                                       | `recursica-skill-selection-controls`                                |
| Chip error states                                         | A chip never carries an error as its content; a required group with nothing selected is a form error reported by the group's assistive element                                                        | `recursica-skill-badges-chips` + `recursica-skill-forms`            |
| Pagination: disabled or absent at the ends                | Never a disabled link. Absent or non-interactive. Only which of those two remains open                                                                                                                | `recursica-skill-buttons-links`, `recursica-skill-link`             |
| Slider commit timing                                      | A visible-effect slider is a live control and writes on change; a slider storing a form value follows the form's save mode. Two situations, not two modes                                             | `recursica-skill-system-conventions` convention 1                   |
| File selection versus upload start                        | Choosing a file saves nothing, so it does not engage the form's save mode. The upload begins on explicit intent, never as a side effect                                                               | `recursica-skill-forms`                                             |
| Transfer list move-all                                    | Do not build it. The filter stays. Wanting move-all is the structural signal to raise                                                                                                                 | `recursica-skill-selection-controls`                                |
| Accordion versus tree                                     | Real hierarchy is a tree; single-level disclosure is an accordion. Accordions are never nested                                                                                                        | `recursica-skill-navigation`                                        |
| The text field's routing to number input                  | Routed by the shape of the data — a quantity you can do arithmetic on — instead of by increment controls the component does not have                                                                  | the token inventory                                                 |
| Whether the field skills need a shared text block         | No. Three components own the substrate and every field skill points at them                                                                                                                           | `globals.form`, `label`, `assistive-element`                        |
| Which icon marks which meaning                            | X is close, a trash can is delete, a chip's dismiss is always an X, more is a horizontal ellipsis and never a vertical kebab, a hamburger is horizontal lines, a pencil is edit anywhere edit happens | `recursica-skill-icon-semantics`                                    |
| Whether an icon-only button may ever go without a tooltip | No. Asked where the rule stops applying, the answer was "never"                                                                                                                                       | `recursica-skill-icon-semantics`, `recursica-skill-buttons-links`   |
| Whether a decorative icon is allowed                      | Yes — beside a heading, for landmarking on pages whose layouts are near-identical. It is the one stated exception to the removal test                                                                 | `recursica-skill-icon-semantics`, `recursica-skill-screen-priority` |
| Whether a bare icon may sit in a table cell               | Only as an icon-only button. A non-interactive icon never sits alone with no other information                                                                                                        | `recursica-skill-icon-semantics`, `recursica-skill-tables`          |
| Which tab opens by default                                | The first in reading order — leftmost in a left-to-right locale, because that is where the eye starts                                                                                                 | `recursica-skill-defaults`, `recursica-skill-navigation`            |
| Whether a filter may arrive pre-applied                   | Avoid it — the user may read a narrowed collection as missing data. Where one obvious filter must be on, set a visible default filter and never filter the data itself                                | `recursica-skill-defaults`, `recursica-skill-filters`               |
| When an option may be pre-selected                        | Roughly 90 percent likelihood of being chosen, and never where the choice has downstream workflow consequences. A form editing an existing object always arrives populated                            | `recursica-skill-defaults`, `recursica-skill-selection-controls`    |
| Whether a default may be unchangeable                     | No. A value the user cannot move off is a fixed value, not a default, and is presented as one. What the user cannot change is the system default itself                                               | `recursica-skill-defaults`                                          |

Three instructions that pointed at components which do not exist were also removed: a **banner** for critical alerts (toast), a **progress bar** for a known-duration wait (loader), and a **checklist** for any-order steps (stepper). Pointing an agent at a component that is not in the system is worse than saying nothing, so each now states the real constraint and records the missing component as a gap.
