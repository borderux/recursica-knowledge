---
name: recursica-skill-form
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

**Label copy:** always name the object explicitly. Labels must never infer intent or context from surrounding content — a screen reader user hears the label alone. If a verb is involved, make the verb explicit and active. No passive verbs, no linking verbs.

## Single page vs. multi-step

Decide from the user's mental model, not from field count alone. Go multi-step when **any** of these hold:

1. **Discrete stages.** The task naturally decomposes into steps the user already thinks of as separate, and chunking makes it more digestible.
2. **Volume.** Sheer quantity of fields creates visual noise that needs reducing.
3. **Downstream branching.** An answer causes a _later_ step to be significantly different.

**The disclosure/step boundary:** if an answer causes a _minor, local_ change — a field or section immediately below — use progressive disclosure and stay on one page. If it causes a _materially different downstream step_, use multi-step. Do not reach for multi-step to handle small conditional fields.

## Grouping

Group fields in this order of preference:

1. **By parent object.** If ten fields are properties of one object, group them under a single object heading. This is the best structure available.
2. **By step or logical sequence** in which the information gets populated.

**Repeating objects** — many instances of the same object with the same properties — are a table, not a stack of form groups. Rows are objects, columns are fields.

## Required vs. optional

**MUST mark only the exception, never both.**

- Mostly required fields → mark the few **optional** ones.
- Mostly optional fields → mark the few **required** ones.

**Avoid asterisk clutter.** When the vast majority of fields are required, do not sprinkle asterisks. Use a systemic signal instead — e.g. **bold label = required, regular weight = optional** — and state the convention once. Less visual noise, same clarity.

**Declare optionality at the group level** wherever a whole section may not apply to a user. A user who lacks the knowledge for an entire section means the _section_ is optional; say so at the group heading rather than on every field.

## Buttons and submit

**MUST: primary submit button in the bottom right, secondary cancel immediately to its left.** Same row, bottom of the form.

**MUST: on submit, convert the button itself into a loading, disabled state.** The button is the progress indicator. Disabling it also prevents double submission.

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

## Progressive disclosure

**Couple the revealed content as tightly as possible to the control that triggered it** — immediately adjacent, immediately after, appearing in real time. The user must be able to see the causal link between their selection and the change, so they feel they are controlling the form rather than the form controlling them.

If the consequence appears on a later step instead, **that is not progressive disclosure** — that is multi-step branching. Do not conflate them.

**Avoid hiding sections based on user type.** In enterprise application design it is rare that fields should be invisible to some users. Prefer marking the whole group optional at the group heading. If you find yourself hiding large chunks, question the requirement first.

## Confirmation

**Default: submit executes immediately.** No "Are you sure?" Most forms in web applications are expected to submit straight away, and results are visible and editable afterward.

**Confirm only when both are true:** the action cannot be undone, **and** there is no other recovery mechanism. Legally binding submissions with no recourse are the clearest legitimate case.

**Deleting a repeated item within a form** follows the same test: confirm only if the item is hard to recreate and there's no undo. Otherwise delete on click.

## Persistence and autosave

**If the technology supports draft persistence, always persist.** Data should survive refresh and return visits automatically, with no user action.

**Show a persistent save status** on the page — that it was saved as a draft, and when. The user should never have to wonder.

**Always keep a submit button**, even under autosave. A form with no submit button is confusing even when autosave makes it technically redundant.

**MUST NOT intermingle autosave and manual save.** Within a system, either everything autosaves or everything requires an explicit save action. Mixing the two is a significant failure — the user can no longer form a reliable model of when their work is safe.

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

## Out of scope

- **Control-type selection** — dropdown vs. radio vs. checkbox vs. toggle. Covered by a separate skill.
- **Retention, archival, and logging of submitted entries.** That is data logging, not form design. Submission logging is a separate backend requirement.

## Pre-flight checklist

Before considering a form done, verify:

- [ ] One field per row, single column, top to bottom — at every container width. Compound controls are the only shared rows.
- [ ] Labels left of fields, right-aligned — stacked above only when the container is too narrow for both.
- [ ] No custom spacing between fields; component spacing only.
- [ ] Fields grouped by parent object, or by logical sequence. Repeating objects are tables.
- [ ] Non-editable values use the read-only component, not a disabled input.
- [ ] Only the exception is marked (required _or_ optional, never both). No asterisk clutter.
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
- [ ] Save behavior is uniformly autosave or uniformly manual, with visible save status and a submit button.
- [ ] Tab order matches visual order.
- [ ] No password visibility toggle. No challenge CAPTCHA.
- [ ] No confirmation dialog unless the action is irreversible with no recovery path.
