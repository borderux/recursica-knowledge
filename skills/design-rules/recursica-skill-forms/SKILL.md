---
name: recursica-skill-forms
description: House rules for forms — layout and label placement, grouping, whether to mark required or optional fields, validation timing, error display, microcopy, pre-fill, progressive disclosure, save modes, multi-step flows, and accessibility. Use for any form, settings page, wizard, or data-entry screen. Not for choosing between controls — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Forms

These are the house rules for designing forms. They are opinions, not neutral best practices — treat them as constraints, not suggestions.

These rules assume **complex enterprise web applications, designed for desktop first**, built on a design system whose components are already accessible and correctly styled. The design system decides the visual design of each component. These rules cover how the form is put together: field order, states and wording.

**Spacing is decided elsewhere too.** The spacing between fields and between sections is built into the form field components themselves. Do not add custom margins, padding, or spacer elements between fields to adjust the vertical rhythm — put the components together and let them set the spacing.

**NEVER place a form, a form section, or any single form control inside a card.** There is no exception. A card is for a set of repeating peer objects (objects of the same kind, such as rows in a list). A form is the properties of one object, so a card boundary separates nothing. Group fields with headings and with the components' own spacing. See `recursica-skill-card`.

## The two governing principles

1. **Remove ambiguity.** Every layout decision should have exactly one correct reading order, one correct tab order (the order the Tab key moves through the fields), and one obvious next action. If a design forces the user to guess — what to fill in, where to go next, whether their work was saved — it is wrong.
2. **Prevent errors before catching them.** Good labels, help text, placeholders, and small sections do more than any validation system can. Validation is the backup for errors the form did not prevent.

## Layout

**MUST: a single column, from top to bottom.** One field per row, stacked vertically. This is not negotiable, and it does not change with the width of the container. A wide container never justifies two fields in one row. Extra horizontal space goes unused, or the form's maximum width is limited — it is never spent on a second column.

**NEVER use a multi-column form layout.** Not for addresses (`Address 1` / `Address 2` / `City` / `State` / `Zip` in two columns), not to "save vertical space," not ever. Multi-column layouts are banned because the tab order becomes unclear: does focus move down the left column and then down the right, or left to right across each row? Both answers are reasonable — which is why the layout is broken. A form's reading order must never move both left to right _and_ top to bottom.

**Exception — the compound control.** Small inputs that are closely tied together and make up one value may sit on one row: a date picker plus a time entry plus an AM/PM select. Treat this as one control with one label. This is the only case where inputs share a row.

## Labels

**MUST: put the label to the left of the field, on the same row, right-aligned.** The label goes on the left and the field on the right, with the label text right-justified so it sits close to its field.

The reasons, most important first:

- The eye travels only a short distance from label to field. A left-justified label in a wide column can leave a gap big enough that the user's eye drifts across to the wrong field and fills that one in.
- Checking the entries is one scan straight down the column of _values_. There is no jumping from label to value to label to value.
- It keeps the form short.

**The container's width affects only how labels and fields relate — never the order of the fields.** Fields stay one per row, top to bottom, always. The one thing that changes is whether a label sits beside its field or above it.

**Stack the label above its field only when the container is too narrow to fit the label and the field side by side.** What decides this is the width of the form's container, not the viewport breakpoint (the screen width at which the whole layout changes). A narrow panel, drawer, or side rail on a large desktop display stacks. A wide form on a tablet does not.

Stacking is a fallback, never a preference. It makes forms long, and it forces the user to switch back and forth between label and field while scanning. It is even worse because fields are different heights — a textarea (a multi-line text field) is tall, and a radio group has as many rows as it has options — so the rhythm is uneven.

**MUST: one label placement per form. Side by side or stacked, never both at the same breakpoint.** Apply the container-width test once, to the form, and let the answer govern every field in it. If the form's container cannot fit label and field side by side, every field in that form stacks — including the short ones that would have fit.

This is not a matter of looks. Mixing the two placements in one form:

- **Destroys the single vertical scan.** The side-by-side rule exists so that checking the entries is one pass down a column of values. A stacked field in the middle of that column breaks the column.
- **Creates two competing left edges**, so the user cannot tell whether the next thing they read is a label or a value.
- **Makes the exception look meaningful.** A field laid out differently from the ones around it looks like a different kind of field, and the user searches for a reason that does not exist.

**Across breakpoints, a form may switch placement as a whole** — side by side in a wide container, stacked in a narrow drawer. That is still one placement per form, decided per breakpoint. What is forbidden is a mix within a single breakpoint.

**Sections do not get their own placement either.** A form's sections are parts of one form. A section that stacks while the section above it sits side by side is the same defect.

**In code, the label's position is the `formLayout` prop on each field. Set `formLayout="side-by-side"` on every field** to put the label beside the input. Field components **default to `stacked`**, which puts the label above the input, so a field without the prop has its label above at any width and breaks this rule. Leaving the prop out is a defect, not a choice of default. Two mistakes cause it, and neither shows an error:

- **The prop is `formLayout`, not `layouts`.** `layouts` is what the UI kit calls this variant. React ignores an unknown prop without an error, so `layouts="side-by-side"` leaves the label above the input while the code looks correct.
- **Every field needs the prop.** It is set per field, so one missed field mixes label placements in the form. Count the form's field components to check.

**Label wording:** always name the object clearly. A label must never rely on surrounding content for its meaning or context — a screen reader user hears the label on its own. If a verb is involved, make the verb clear and active. No passive verbs, and no linking verbs.

## Single page vs. multi-step

Decide based on the user's mental model (what a person expects from the tools and work they already know), not on the number of fields alone. Use multiple steps when **any** of these is true:

1. **Separate stages.** The task naturally breaks into steps that the user already thinks of as separate, and splitting it up makes it easier to take in.
2. **Volume.** There are so many fields that the visual noise needs to be reduced.
3. **Later branching.** An answer makes a _later_ step significantly different.

**The opposite case: information that refers back and forth favors one long form.** When completing one section depends on checking or remembering another, a stepper becomes actively worse than length. Moving forward and back to re-read costs more than scrolling does. Usability testing on a long credit-card application found that the single form did better than the stepper for exactly this reason: the user wanted to confirm that the whole thing was correct and complete at once. The question is how much has to stay in view, not how many fields there are. See `recursica-skill-screen-priority`.

**Where disclosure ends and steps begin:** if an answer causes a _small, local_ change — a field or a section right below it — use progressive disclosure and stay on one page. If it causes a _clearly different later step_, use multiple steps. Do not reach for multiple steps to handle small conditional fields.

## Grouping

Group fields in this order of preference:

1. **By parent object.** If ten fields are properties of one object, group them under a single heading for that object. This is the best structure available.
2. **By step, or by the logical order** in which the information gets filled in.

**Repeating objects** — many copies of the same object with the same properties — belong in a table. Not a stack of form groups, and not a set of cards. Rows are objects, and columns are fields. See `recursica-skill-tables`.

## Required vs. optional

**A field is required only at the workflow stage that needs it.** When a field becomes mandatory at a later stage of a workflow, it is not required before that stage. It must not show a required error while the record is still in a state that does not need it. An error demanding a value the current state does not need is a validation bug the user cannot do anything about — and it teaches them to ignore errors.

**Say the condition, not only the requirement.** Where a field will be required later, the assistive text states the condition: the message explains at what point the value will be needed, instead of claiming it is missing now.

**MUST mark only the exception, never both.**

- Mostly required fields → mark the few **optional** ones.
- Mostly optional fields → mark the few **required** ones.

**Avoid cluttering the form with asterisks.** When nearly all fields are required, do not scatter asterisks everywhere. Use a signal that applies across the form instead — for example, a bold label means required, and regular weight means optional — and state that convention once. There is less visual noise, and it is equally clear.

**Mark a whole group as optional** wherever an entire section may not apply to a user. If a user may not have the knowledge for a whole section, the _section_ is optional. Say so at the group heading, rather than on every field.

## Buttons and submit

**MUST: put the primary submit button at the bottom right, with the secondary cancel button right to its left.** Same row, at the bottom of the form.

**MUST: on submit, turn the button itself into a loading, disabled state.** The button is the progress indicator. Disabling it also stops the form from being submitted twice.

How that is built: use the button's disabled look, with icon-only content or an icon with a label, where the icon animates. There is no separate loading variant, and none is needed — see `recursica-skill-button`. Keep the button the same size and in the same place. Keep it able to receive focus, so the person who just pressed Enter does not lose their place. And make the busy state known to assistive technology, instead of relying on the animation.

**NEVER show a blocking spinner or overlay on submit.** Do not gray out the form, do not put up a spinner in a modal, and do not lock the viewport. The state inside the button is enough, and it keeps the user's entries visible.

## Validation

**The order of operations:**

1. Prevent. Use clear labels, help text, placeholder text, and sections that are small enough. Placeholder text guides what goes in a text field or textarea. Help text below a field carries the rules (for example, the character requirements for a password).
2. Validate **inline, on blur** — that is, when the user leaves the field. When a field is focused, then left, and then found to be invalid, mark it right away with a non-blocking indicator on that field. Do not put up a modal, do not show an alert, and do not stop the user from moving on to another field.
3. **MUST keep the submit button disabled until every required field is complete and valid.**

**NEVER ship an enabled submit button that shows every validation error at once when clicked.** This is the single worst validation pattern. It tells the user nothing about what the form needs until they have already failed at it, so they are left guessing what to complete. An enabled submit button means the form is ready to submit.

**The only exception to validating inline first:** errors the user could not have known about in advance — conflicts on the server, broken business rules, or a clash with another record's unique value. Those appear after submit, because there is no earlier moment to catch them.

## Error presentation

**NEVER show an error state with color alone.** Every error needs a second cue that is not color.

Combine:

- A visual change to the field — its background color, border color, or line weight.
- **Plus** a separate indicator: an icon, a flag, or a message.

**Turn the help text into the error message** where that makes sense. The error message should still state the rule the user broke, not a bare "Invalid input." Keeping the rule in view is how the user fixes the problem.

Errors live at the field level. For dense forms, flags that sit over the page, pinned to the fields with errors, are a good way to make it impossible to miss where the errors are.

## Microcopy

Microcopy is the short text in an interface — labels, hints, and messages.

**Do not write sentences.** Microcopy is not prose. The most effective microcopy is the shortest string that carries all the information needed.

- **Break apart constraints that have several rules.** A password rule with a minimum length and a special-character requirement becomes short fragments separated by commas, or bullets — easy to scan as separate rules, instead of a paragraph to work through.
- **Assume it will not be read.** Most users skip microcopy. That is an argument for keeping it short, not for adding more words to make up for it.
- **Plain language.** Use the lowest reasonable reading level. No jargon, no elaborate phrasing, no hedging.

## Field states

**MUST make enabled and disabled look clearly different.** This matters far more than border weight or how full the fill color is.

**Pet peeve — never style a field without focus so that it looks disabled.** The classic mistake is a light gray background on fields at rest, which makes an editable form look read-only. A field that is enabled must look enabled, whether or not it has focus.

Beyond this, do not worry about heavy versus minimal field styling. The design system settles it.

**Read-only is its own component, not a toned-down input.** When a value is shown but cannot be edited, use the system's read-only field component. Never fake read-only by disabling an input or removing its borders.

## Pre-fill and defaults

Pre-filling is not all or nothing. Decide by the **risk of the user misunderstanding**.

**Pre-fill when the value is low-risk and obvious:**

- Today's date, when today's date is what is being recorded.
- The current user's name, when the system already knows who they are.

**NEVER pre-fill data the user has to understand to check** — values they would have to think about, look up, or compare against another source to know whether the default is right. A default they cannot check is worse than an empty field, because it gets submitted without being checked.

**A form that edits an existing object is a separate case, and it always arrives filled in** with that object's current values. The user is editing the object, not starting over. This always applies. Owned by `recursica-skill-defaults`, which also has the 90 percent threshold for pre-selecting an option, and the rule against pre-selecting anything with later consequences.

## Progressive disclosure

**Put the revealed content as close as possible to the control that triggered it** — right next to it, right after it, and appearing immediately. The user must be able to see the cause and effect between their choice and the change, so they feel that they are controlling the form, rather than the form controlling them.

If the result appears on a later step instead, **that is not progressive disclosure** — that is multi-step branching. Do not mix them up.

**Avoid hiding sections based on the type of user.** In enterprise application design, it is rare that fields should be invisible to some users. Prefer marking the whole group optional at its heading. Before hiding large parts of a form, question the requirement.

## Confirmation

**Default: submitting takes effect immediately.** No "Are you sure?" Most forms in web applications are expected to submit straight away, and the results can be seen and edited afterward.

**Confirm only when both of these are true:** the action cannot be undone, and there is no other way to recover. Legally binding submissions with no way back are the clearest valid case.

**Deleting a repeated item inside a form** follows the same test: confirm only if the item is hard to recreate and there is no undo. Otherwise, delete it on click.

## Persistence and autosave

**A form is in exactly one save mode.** Everything else in this section follows from which mode it is in.

| Mode                      | When the change is saved                         | Status message                                                                  |
| ------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------- |
| **Field-level / instant** | On each field change, immediately, to the server | **Required.** Show a status that stays on the page — saved as a draft, and when |
| **Batch save**            | On submit, all at once                           | **None.** No status message, and no indicator of unsaved changes                |

**MUST NOT mix the two modes.** Within a system, either everything saves field by field, or everything saves on submit. Mixing them is a serious failure — the user can no longer tell when their work is saved.

**Batch save is the default.** See `recursica-skill-selection-controls` for the full reasoning: the user must be able to change their mind, and saving once produces one clean log entry instead of a stream of writes, one per field.

**In batch mode, do not show an unsaved or dirty state** (a sign that there are changes not yet saved). The signal the user needs is the submit button becoming enabled once every editable control is valid. Nothing else.

**If the technology can save drafts automatically, always save them.** Data should survive a refresh and a return visit automatically, with nothing for the user to do. Saving drafts is a field-level behavior, so it carries the status message requirement.

**Always keep a submit button**, even with autosave. A form with no submit button is confusing, even when autosave makes the button technically unnecessary.

## Accessibility

Accessible components are the foundation, and the design system provides them. That leaves the responsibilities that come from how the form is put together:

- **Tab order MUST follow the visual order, from top to bottom.** A single-column layout makes this easy, which is part of why it is mandatory.
- **Correct `aria-label`s**, mostly inherited from the components — check that nobody has overridden them with something vague.
- **Labels must stand on their own.** Never rely on nearby content to supply meaning. Name the object. Make verbs clear and active.
- **Plain language**, at the lowest reasonable reading level.

## Password fields

**MUST NOT include a toggle to show the password.** There is nothing wrong with the pattern itself as a help to users, but it is not used in these systems. No exceptions.

## CAPTCHA

A CAPTCHA is a test that checks the user is a person and not a program.

**The goal is invisible and built in.** A modern CAPTCHA should run in the background, with no action from the user.

- Acceptable: checks that are fully invisible and automatic; a single checkbox that runs a test in the background.
- **NEVER use challenge CAPTCHAs** that make the user pick images, solve puzzles, or make other human judgments. People fail them regularly, which is infuriating, and the small gain in security does not justify it.

## Uncovered — ask, do not invent

No house rule covers these yet. **Ask the person instead of choosing** — see the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule above to fit them.

- **Validation across the steps of a multi-step flow.** Whether a step validates when the user leaves it, and what going back does to the data they entered.
- **Whether search and filter inputs follow the form rules**, or are a different kind of surface.
- **Error summaries for the whole form.** Validation on each field is specified; a summary at the top is not.

## Out of scope

- **Choosing the type of control** — dropdown, radio, checkbox, or toggle. Covered by a separate skill.
- **Keeping, archiving, and logging submitted entries.** That is data logging, not form design. Logging submissions is a separate backend requirement.

## Pre-flight checklist

Before treating a form as done, check:

- [ ] There is one field per row, in a single column, from top to bottom — at every container width. Compound controls are the only rows that hold more than one input.
- [ ] Labels sit to the left of their fields, right-aligned. They are stacked above only when the container is too narrow for both.
- [ ] Every field has `formLayout="side-by-side"`, checked by counting the form's field components. A missing prop shows `stacked`. The prop is `formLayout`, not `layouts`.
- [ ] The whole form uses one label placement at any given breakpoint: every field side by side, or every field stacked. There is no mixing, including between sections.
- [ ] There is no custom spacing between fields; only the components' own spacing.
- [ ] No form, form section, or form control is inside a card.
- [ ] Fields are grouped by parent object, or by logical order. Repeating objects are tables.
- [ ] Values that cannot be edited use the read-only component, not a disabled input.
- [ ] Only the exception is marked (required _or_ optional, never both). There is no clutter of asterisks.
- [ ] No field shows a required error in a state that does not require it, and each conditional requirement states its condition.
- [ ] Help text and placeholders state the rules up front.
- [ ] Validation runs inline, when the user leaves a field, and it does not block them.
- [ ] Submit stays disabled until the form is valid and complete.
- [ ] The primary submit button is at the bottom right, with the secondary cancel button to its left.
- [ ] Submit shows a loading, disabled state inside the button — with no blocking spinner or overlay.
- [ ] Error states use a visual change **plus** an indicator that is not color, and they restate the rule.
- [ ] Microcopy has no sentences, and rules with several parts are bulleted or separated by commas.
- [ ] Enabled fields look enabled, and disabled fields look clearly different.
- [ ] Pre-filled values are only ones the user does not have to understand to check.
- [ ] Revealed content sits directly below, and right next to, the control that triggers it.
- [ ] The form is in exactly one save mode — field-level everywhere, or batch everywhere.
- [ ] Field-level mode shows a save status that stays on the page; batch mode shows no status and no unsaved-changes indicator.
- [ ] A submit button is present either way.
- [ ] Tab order matches the visual order.
- [ ] There is no toggle to show the password, and no challenge CAPTCHA.
- [ ] There is no confirmation dialog, unless the action cannot be undone and there is no way to recover.
- [ ] Uncovered items were asked about, not decided: validation across steps, filter and search inputs, and error summaries.
