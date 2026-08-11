---
name: recursica-skill-forms
description: House rules for designing and building forms in enterprise web applications — layout, label alignment, grouping, required/optional marking, validation timing, error presentation, microcopy, pre-fill, progressive disclosure, autosave, confirmation, accessibility, password fields, and CAPTCHA. Use this skill whenever generating, laying out, reviewing, or refactoring any form, form section, multi-step flow, wizard, settings page, or data-entry screen — including single-field edit patterns. Trigger on mentions of "form", "input", "field", "validation", "error state", "submit", "wizard", "multi-step", "help text", "label", or any request to build a screen where a user enters or edits data. Do NOT use this skill to choose between control types (dropdown vs. radio vs. checkbox) — that is covered by a separate skill. Do NOT use for submission logging or data-retention policy, which are backend concerns.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Forms

House rules for form design. These are opinions, not neutral best practices — apply them as constraints, not suggestions.

Context these rules assume: **complex enterprise web applications, desktop-first**, built on a design system whose components are already accessible and correctly styled. Component-level visual design is not your decision. Your job is composition, sequence, states, and copy.

**Spacing is not your decision either.** Field and section spacing is built into the form field components themselves. Do not add custom margins, padding, or spacer elements between fields to tune vertical rhythm — compose the components and let them handle it.

**NEVER place a form, a form section, or any individual form control inside a card.** There is no exception. A card is for a set of repeating peer objects; a form is one object's properties, so the boundary separates nothing. Group fields with headings and the components' own spacing. See `recursica-skill-card`.

## The two governing principles

1. **Eliminate ambiguity.** Every layout decision should have exactly one correct reading order, one correct tab order, and one obvious next action. If a design forces the user to guess — what to fill in, where to go next, whether their work was saved — it is wrong.
2. **Prevent errors before catching them.** Good labels, help text, placeholders, and small chunks do more than any validation system. Validation is the backstop, not the plan.

## Layout

**MUST: single column, top to bottom.** One field per row, stacked vertically. This is non-negotiable and **does not respond to container width.** A wide container never earns side-by-side fields. Extra horizontal space goes unused, or the form's max width is constrained — it is never spent on a second column.

**NEVER use a multi-column form layout.** Not for addresses (`Address 1` / `Address 2` / `City` / `State` / `Zip` in two columns), not to "save vertical space," not ever. Multi-column layouts are banned because tab order becomes ambiguous: does focus move down the left column and then down the right, or left-to-right across each row? Both readings are defensible, which is why the layout is broken. A form's reading order must never move both left-to-right _and_ top-to-bottom.

**Exception — the compound control.** Small, tightly associated inputs that represent one logical value may sit on one row: a date picker + time entry + AM/PM select. Treat this as **one control** with **one label**. This is the only case where inputs share a row.

## Labels

**MUST: label to the left of the field, on the same row, right-aligned.** Label on the left, field on the right, label text right-justified so it sits close to its field.

Rationale, in priority order:

- Short scan distance from label to field. A left-justified label in a wide column can leave a gap large enough that the user tracks horizontally to the wrong field and fills it in.
- Checking your work is a single vertical scan down the column of _values_. No jumping label → value → label → value.
- Keeps the form short.

**Container width affects the label/field relationship only — never the field sequence.** Fields stay one per row, top to bottom, always. The single thing that flexes is whether a label sits beside its field or above it.

**Stack the label above its field only when the container is too narrow to fit label and field side by side.** The trigger is **the width of the form container, not the viewport breakpoint.** A narrow panel, drawer, or side rail on a large desktop display stacks; a wide form on a tablet does not.

Stacking is a fallback, never a preference. It makes forms long and forces the user to alternate between label and field while scanning — worse still because field heights vary (a textarea is tall, a radio group has n options), so the rhythm is irregular.

**MUST: one label placement per form. Side-by-side or stacked, never both at the same breakpoint.** The container-width test is applied once, to the form, and the answer governs every field in it. If the form's container cannot fit label and field side by side, **every** field in that form stacks — including the short ones that would have fit.

This is not a cosmetic preference. Mixing the two placements inside one form:

- **Destroys the single vertical scan.** The side-by-side rule exists so that checking your work is one pass down a column of values. A stacked field in the middle of that column breaks the column.
- **Produces two competing left edges**, so the user cannot tell whether the next thing they read is a label or a value.
- **Makes the exception look like meaning.** A field laid out differently from its neighbours reads as a different kind of field, and the user looks for a reason that does not exist.

**Across breakpoints, one form may switch placement as a whole** — side-by-side on a wide container, stacked in a narrow drawer. That is still one placement per form, evaluated per breakpoint. What is prohibited is a mix within a single breakpoint.

**Sections do not get their own placement either.** A form's sections are parts of one form; a section that stacks while the section above it sits side by side is the same defect.

**In code, side-by-side is the value you have to pass.** The prop is `formLayout` on every field component, and it **defaults to `stacked`** — so a field with no `formLayout` renders the fallback on a container of any width, which is this rule inverted. Passing nothing is not "take the default"; it is the defect. Two ways this fails silently and neither raises an error:

- **The prop is `formLayout`, not `layouts`.** `layouts` is the token axis name. React drops an unknown prop without complaint, so `layouts="side-by-side"` leaves the field stacked and looks like the rule was applied.
- **A form is only compliant if every field carries it.** Grep the form for the field components and count — the prop is per field, so one missed field is the mixed-placement defect from the rule above.

**Label copy:** always name the object explicitly. Labels must never infer intent or context from surrounding content — a screen reader user hears the label alone. If a verb is involved, make the verb explicit and active. No passive verbs, no linking verbs.

## Single page vs. multi-step

Decide from the user's mental model, not from field count alone. Go multi-step when **any** of these hold:

1. **Discrete stages.** The task naturally decomposes into steps the user already thinks of as separate, and chunking makes it more digestible.
2. **Volume.** Sheer quantity of fields creates visual noise that needs reducing.
3. **Downstream branching.** An answer causes a _later_ step to be significantly different.

**The counter-case: cross-referential information favors one long form.** Where completing one section depends on checking or remembering another, a stepper becomes actively worse than length — moving forward and back to re-read costs more than scrolling. Usability testing on a long credit-card application found the single form outperformed the stepper for exactly this reason: the user wanted to confirm the whole thing was correct and complete at once. **The question is how much has to stay in context, not how many fields there are.** See `recursica-skill-screen-priority`.

**The disclosure/step boundary:** if an answer causes a _minor, local_ change — a field or section immediately below — use progressive disclosure and stay on one page. If it causes a _materially different downstream step_, use multi-step. Do not reach for multi-step to handle small conditional fields.

## Grouping

Group fields in this order of preference:

1. **By parent object.** If ten fields are properties of one object, group them under a single object heading. This is the best structure available.
2. **By step or logical sequence** in which the information gets populated.

**Repeating objects** — many instances of the same object with the same properties — are a table, not a stack of form groups and not a set of cards. Rows are objects, columns are fields. See `recursica-skill-tables`.

## Required vs. optional

**A field is only required in the states where it is actually required.** Where a field becomes mandatory at a later stage of a workflow, it is not required before that stage — and it must not display a required error while the record is still in a state that does not need it. An error demanding a value the current state does not call for is a validation bug the user cannot act on, and it teaches them to ignore errors.

**Say the condition, not just the requirement.** Where a field will be required later, the assistive text carries the condition — the message explains at which point the value is needed rather than asserting it is missing now.

**MUST mark only the exception, never both.**

- Mostly required fields → mark the few **optional** ones.
- Mostly optional fields → mark the few **required** ones.

**Avoid asterisk clutter.** When the vast majority of fields are required, do not sprinkle asterisks. Use a systemic signal instead — e.g. **bold label = required, regular weight = optional** — and state the convention once. Less visual noise, same clarity.

**Declare optionality at the group level** wherever a whole section may not apply to a user. A user who lacks the knowledge for an entire section means the _section_ is optional; say so at the group heading rather than on every field.

## Buttons and submit

**MUST: primary submit button in the bottom right, secondary cancel immediately to its left.** Same row, bottom of the form.

**MUST: on submit, convert the button itself into a loading, disabled state.** The button is the progress indicator. Disabling it also prevents double submission.

How that is built: the button's disabled treatment with icon-only or icon-with-label content, where the icon animates. There is no separate loading variant and none is needed — see `recursica-skill-button`. Keep the button the same size and in the same place, keep it focusable so the person who just pressed Enter does not lose their place, and expose the busy state to assistive technology rather than relying on the animation.

**NEVER show a blocking spinner or overlay on submit.** Do not gray out the form, do not throw a modal spinner, do not lock the viewport. The in-button state is sufficient and keeps the user's entries visible.

## Validation

**Order of operations:**

1. Prevent. Clear labels, help text, placeholder text, and small enough sections. Placeholder text guides what goes in a text field or textarea; help text below a field carries rules (e.g. password character requirements).
2. Validate **inline, on blur.** When a field is focused, then blurred, then found invalid, mark it immediately with a **non-blocking** field-level indication. Do not throw a modal, do not throw an alert, do not block the user from moving on to another field.
3. **MUST keep the submit button disabled until every required field is complete and valid.**

**NEVER ship an enabled submit button that dumps all validation errors on click.** This is the single worst validation pattern. It tells the user nothing about what the form needs until they've already failed at it, so they're left guessing what to complete. If the button is enabled, the form is submittable.

**Only exception to inline-first:** errors the user could not have known about in advance — server-side conflicts, business-rule violations, cross-record uniqueness. Those surface after submit because there is no earlier moment to catch them.

## Error presentation

**NEVER communicate error state by color alone.** Every error needs a redundant, non-color cue.

Combine:

- A visual state change on the field — background color, border color, or stroke weight.
- **Plus** a discrete indicator: an icon, flag, or message.

**Convert help text into the error message** where it makes sense. The error message should still carry the rule the user violated, not just "Invalid input." Keeping the rule in view is how they fix it.

Errors live at field level. For dense forms, flag overlays anchored to the offending fields are a good way to make error location unmistakable.

## Microcopy

**Do not write sentences.** Microcopy is not prose. The most effective microcopy is the shortest string that carries all necessary information.

- **Multi-rule constraints get broken apart.** A password rule with a length minimum and special-character requirement becomes comma-separated fragments or bullets — scannable as discrete rules, not a paragraph to parse.
- **Assume it will not be read.** Most users skip microcopy. That is an argument for brevity, not for adding more words to compensate.
- **Plain language.** Lowest reasonable reading level. No jargon, no elaborate phrasing, no hedging.

## Field states

**MUST make enabled and disabled unmistakably distinct.** This matters far more than border weight or fill density.

**Pet peeve — never style an unfocused field so it reads as disabled.** The classic failure is a light-gray background applied to fields at rest, which makes an editable form look read-only. A field that is enabled must look enabled whether or not it has focus.

Beyond this, do not agonize over heavy vs. minimal field styling. The design system settles it.

**Read-only is a distinct component, not a styled-down input.** When a value is displayed but not editable, use the system's read-only field component. Never approximate read-only by disabling an input or stripping its borders.

## Pre-fill and defaults

Pre-fill is not all-or-nothing. Gate it on **comprehension risk**.

**Pre-fill when the value is low-risk and obviously inferable:**

- Today's date, when today's date is what's being recorded.
- The current user's name, when the system already knows who they are.

**NEVER pre-fill high-comprehension data** — values the user would have to reason about, look up, or verify against another source to know whether the default is right. An unverifiable default is worse than an empty field, because it gets submitted unchecked.

**A form that edits an existing object is the separate case, and it always arrives populated** with that object's current values. You are editing the object, not starting over. This never stops applying. Owned by `recursica-skill-defaults`, which also carries the 90 percent threshold for pre-selecting an option and the veto on pre-selecting anything with downstream consequences.

## Progressive disclosure

**Couple the revealed content as tightly as possible to the control that triggered it** — immediately adjacent, immediately after, appearing in real time. The user must be able to see the causal link between their selection and the change, so they feel they are controlling the form rather than the form controlling them.

If the consequence appears on a later step instead, **that is not progressive disclosure** — that is multi-step branching. Do not conflate them.

**Avoid hiding sections based on user type.** In enterprise application design it is rare that fields should be invisible to some users. Prefer marking the whole group optional at the group heading. If you find yourself hiding large chunks, question the requirement first.

## Confirmation

**Default: submit executes immediately.** No "Are you sure?" Most forms in web applications are expected to submit straight away, and results are visible and editable afterward.

**Confirm only when both are true:** the action cannot be undone, **and** there is no other recovery mechanism. Legally binding submissions with no recourse are the clearest legitimate case.

**Deleting a repeated item within a form** follows the same test: confirm only if the item is hard to recreate and there's no undo. Otherwise delete on click.

## Persistence and autosave

**A form is in exactly one save mode.** Everything else in this section follows from which mode it is in.

| Mode                      | When the change commits                         | Status message                                                                  |
| ------------------------- | ----------------------------------------------- | ------------------------------------------------------------------------------- |
| **Field-level / instant** | On each field change, immediately to the server | **Required.** Show a persistent status on the page — saved as a draft, and when |
| **Batch save**            | On submit, all at once                          | **None.** No status message, and no dirty-state indicator                       |

**MUST NOT intermingle the two modes.** Within a system, either everything commits per field or everything commits on submit. Mixing them is a significant failure — the user can no longer form a reliable model of when their work is safe.

**Batch save is the default.** See `recursica-skill-selection-controls` for the full reasoning: the user must be able to change their mind, and one commit produces one clean log entry instead of a stream of field writes.

**In batch mode, do not display a dirty or uncommitted state.** The signal the user needs is the submit button becoming enabled once every editable control is valid. Nothing else.

**If the technology supports draft persistence, always persist.** Data should survive refresh and return visits automatically, with no user action. Draft persistence is a field-level behavior, so it carries the status message requirement.

**Always keep a submit button**, even under autosave. A form with no submit button is confusing even when autosave makes it technically redundant.

## Accessibility

Compliant components are the foundation, and the design system provides them. That leaves composition-level responsibilities, which are yours:

- **Tab order MUST follow visual top-to-bottom order.** Single-column layout makes this trivial, which is part of why it's mandatory.
- **Correct `aria-label`s**, mostly inherited from components — verify they aren't overridden into something vague.
- **Labels must stand alone.** Never rely on adjacent content to supply meaning. Name the object. Make verbs explicit and active.
- **Plain language** at the lowest reasonable reading level.

## Password fields

**MUST NOT include a password visibility toggle.** There's nothing inherently wrong with the pattern as a user benefit, but it is not used in these systems. No exceptions.

## CAPTCHA

**Invisible and embedded is the target.** Modern CAPTCHA should run in the background with zero user interaction.

- Acceptable: fully invisible/automated checks; a single checkbox that runs a background test.
- **NEVER use challenge CAPTCHAs** that require image selection, puzzles, or other human judgment tasks. Humans fail them regularly, which is infuriating and does not justify the marginal security gain.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the human rather than choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not pattern-match them to a rule above.

- **Validation across steps in a multi-step flow.** Whether a step validates on leaving it, and what backward navigation does to entered data.
- **Whether search and filter inputs follow form rules** or are a different surface.
- **Form-level error summaries.** Field-level validation is specified; a summary at the top is not.

## Out of scope

- **Control-type selection** — dropdown vs. radio vs. checkbox vs. toggle. Covered by a separate skill.
- **Retention, archival, and logging of submitted entries.** That is data logging, not form design. Submission logging is a separate backend requirement.

## Pre-flight checklist

Before considering a form done, verify:

- [ ] One field per row, single column, top to bottom — at every container width. Compound controls are the only shared rows.
- [ ] Labels left of fields, right-aligned — stacked above only when the container is too narrow for both.
- [ ] `formLayout="side-by-side"` is passed on every field, counted against a grep of the form's field components rather than assumed. An omitted prop renders `stacked`, and `layouts` is not the prop name.
- [ ] One label placement across the whole form at any given breakpoint: every field side-by-side, or every field stacked. No mixing, including between sections.
- [ ] No custom spacing between fields; component spacing only.
- [ ] No form, form section, or form control is inside a card.
- [ ] Fields grouped by parent object, or by logical sequence. Repeating objects are tables.
- [ ] Non-editable values use the read-only component, not a disabled input.
- [ ] Only the exception is marked (required _or_ optional, never both). No asterisk clutter.
- [ ] No field shows a required error in a state that does not require it; conditional requirements state their condition.
- [ ] Help text and placeholders carry the rules up front.
- [ ] Validation fires inline on blur, non-blocking.
- [ ] Submit is disabled until the form is valid and complete.
- [ ] Primary submit bottom right, secondary cancel to its left.
- [ ] Submit shows in-button loading/disabled state — no blocking spinner or overlay.
- [ ] Error states use a visual change **plus** a non-color indicator, and restate the rule.
- [ ] Microcopy has no sentences; multi-part rules are bulleted or comma-separated.
- [ ] Enabled fields read as enabled; disabled is clearly different.
- [ ] Pre-filled values are low-comprehension only.
- [ ] Disclosed content sits directly below and adjacent to its trigger.
- [ ] The form is in exactly one save mode — field-level everywhere or batch everywhere.
- [ ] Field-level mode shows a persistent save status; batch mode shows no status and no dirty indicator.
- [ ] A submit button is present either way.
- [ ] Tab order matches visual order.
- [ ] No password visibility toggle. No challenge CAPTCHA.
- [ ] No confirmation dialog unless the action is irreversible with no recovery path.
- [ ] Nothing in the uncovered list — cross-step validation, filter and search inputs, error summaries — was decided without asking.
