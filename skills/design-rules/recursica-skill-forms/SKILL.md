---
name: recursica-skill-forms
description: House rules for forms — layout and label placement, grouping, whether to mark required or optional fields, validation timing, error display, microcopy, pre-fill, progressive disclosure, save modes, multi-step flows, and accessibility. Use for any form, settings page, wizard, or data-entry screen. Not for choosing between controls — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Forms

This skill holds the house rules for designing forms. The rules are the team's opinions, not neutral best practices. Treat each rule as a constraint, not a suggestion.

The rules assume **complex enterprise web applications, designed for desktop first**. The rules also assume a design system whose components are accessible and correctly styled. The design system decides the visual design of each component. The rules in this skill cover how a form is put together: field order, states and wording.

**Form field components set the spacing.** The spacing between fields and between form sections is built into the form field components. Do not add custom margins, padding or spacer elements between fields to adjust the vertical rhythm. Place the components one after another, and let the components set the spacing.

**NEVER place a form, a form section, or any single form control inside a card.** There is no exception. A card is for a set of repeating peer objects (objects of the same kind, such as rows in a list). A form holds the properties of one object. A card border around any part of a form separates nothing. Group fields with headings and with the spacing the components set. See `recursica-skill-card`.

## The two governing principles

1. **Remove ambiguity.** Every layout decision should have exactly one correct reading order, one correct tab order (the order the Tab key moves through the fields), and one obvious next action. A design is wrong if the design forces the user to guess, such as what to fill in, where to go next, or whether the user's work was saved.
2. **Prevent errors before catching errors.** Good labels, help text, placeholders and small form sections do more than any validation system can. Validation is the backup for errors the form did not prevent.

## Layout

**MUST: use a single column, from top to bottom.** Put one field on each row of a form, stacked vertically. The single column is not negotiable. The single column does not change with the width of the form's container. A wide container never justifies two fields in one row. Leave extra horizontal space unused, or limit the form's maximum width. Never spend extra horizontal space on a second column.

**NEVER use a multi-column form layout.** Never use two columns for an address, as in `Address 1`, `Address 2`, `City`, `State` and `Zip` in two columns. Never use two columns to "save vertical space." Never use two columns for any other reason. Multi-column layouts are banned because the tab order becomes unclear. Focus could move down the left column and then down the right column. Focus could also move left to right across each row. Both orders are reasonable, and a layout with two reasonable orders is broken. A form's reading order must never move both left to right _and_ top to bottom.

**A compound control is the one exception.** Small inputs that are closely tied together and make up one value may sit on one row, such as a date picker, a time entry and an AM/PM select. Treat a compound control as one control with one label. A compound control is the only case where inputs share a row.

## Labels

**MUST: put the label to the left of the field, on the same row, right-aligned.** The label goes on the left and the field on the right. Right-justify the label text, so that the label text ends close to the field.

The rule has three reasons, most important first:

- The eye travels only a short distance from label to field. A left-justified label in a wide column can leave a wide gap. The user's eye can drift across the gap to the wrong field, and the user fills in the wrong field.
- The user checks the entries in one scan straight down the column of _values_. The user does not jump from label to value to label to value.
- Labels beside the fields keep the form short.

**The width of the form's container affects only how labels and fields relate, never the order of the fields.** Fields always stay one per row, top to bottom. The width of the form's container decides only whether a label sits beside the field or above the field.

**Stack the label above the field only when the form's container is too narrow to fit the label and the field side by side.** The width of the form's container decides, not the viewport breakpoint (the screen width at which the whole layout changes). A form in a narrow panel, drawer or side rail on a large desktop display stacks the labels. A wide form on a tablet does not stack the labels.

**Stacking is a fallback, never a preference.** Stacked labels make forms long. Stacked labels also force the user to switch back and forth between label and field while scanning. Stacking is even worse because fields are different heights. A textarea (a multi-line text field) is tall, and a radio group has one row for each option. A stacked form therefore has an uneven vertical rhythm.

**MUST: use one label placement per form. Use side by side or stacked, never both at the same breakpoint.** Apply the container-width test once, to the whole form. The result sets the label placement of every field in the form. If the form's container cannot fit a label and a field side by side, every field in the form stacks. The short fields that would have fit side by side stack too.

Mixing the two placements in one form is not a matter of looks. Mixing the placements causes three problems:

- **Mixing breaks the single vertical scan.** The side-by-side rule exists so that checking the entries is one pass down a column of values. A stacked field in the middle of the column of values breaks the column.
- **Mixing creates two competing left edges.** The user cannot tell whether the next text to read is a label or a value.
- **Mixing makes the exception look meaningful.** A field laid out differently from the nearby fields looks like a different kind of field. The user searches for a reason that does not exist.

**Across breakpoints, a whole form may switch label placement**, such as side by side in a wide container and stacked in a narrow drawer. A switch between breakpoints still keeps one placement per form, decided per breakpoint. A mix within a single breakpoint is forbidden.

**Form sections do not get a separate label placement either.** A form's sections are parts of one form. A form section that stacks while the form section above sits side by side is the same defect.

**Set label placement to side by side on every field.** In the standard UI kit (the unchanged UI kit in the official Recursica release), the variant is `layouts` and the option is `side-by-side`. An adapter (the Recursica component library for one framework, such as Mantine or Angular Material) may **set the fields to `stacked` by default**. The `stacked` option puts the label above the input at any width and breaks the side-by-side rule. Leaving label placement unset is a defect, not a choice of default. The defect has two causes, and neither cause shows an error:

- **The code may use a name other than `layouts`.** `layouts` is the name in Figma and the UI kit. Each adapter names the setting in a different way. An adapter may ignore a name the adapter does not know. Look up the name the code uses with the Recursica MCP server's `recursica_get_component_doc` tool before setting label placement.
- **Every field needs the setting.** Label placement is set per field. One missed field mixes label placements in the form. Count the form's field components to check.

**Always name the object clearly in a label.** A label must never rely on the content around the label for meaning or context. A screen reader user hears the label alone. When a label uses a verb, make the verb clear and active. Never use a passive verb or a linking verb in a label.

## Single page vs. multi-step

**Choose between one page and multiple steps by the user's mental model (what a person expects, based on the tools and work the person already knows), not by the number of fields alone.** Use multiple steps when **any** of the following three conditions is true:

1. **Separate stages.** The task naturally breaks into steps that the user already thinks of as separate, and splitting the task into steps makes the task easier to take in.
2. **Volume.** The form has so many fields that the visual noise needs to be reduced.
3. **Later branching.** An answer makes a _later_ step significantly different.

**Information that refers back and forth favors one long form.** When completing one form section depends on checking or remembering another form section, a stepper is actively worse than a long form. Moving forward and back to re-read costs more than scrolling does. Usability testing on a long credit-card application found that the single form did better than the stepper for exactly this reason: the user wanted to confirm that the whole application was correct and complete at once. The deciding question is how much of the form has to stay in view, not how many fields the form has. See `recursica-skill-screen-priority`.

**Use progressive disclosure for a small, local change.** If an answer causes a _small, local_ change, such as a field or a form section right below the answer, use progressive disclosure and stay on one page. If an answer causes a _clearly different later step_, use multiple steps. Do not use multiple steps to handle small conditional fields.

## Grouping

Group fields in the following order of preference:

1. **By parent object.** If ten fields are properties of one object, group the ten fields under a single heading for that object. Grouping by parent object is the best structure available.
2. **By step, or by the logical order** in which the user fills in the information.

**Put repeating objects in a table.** Repeating objects are many copies of the same object with the same properties. Do not use a stack of form groups or a set of cards for repeating objects. In the table, table rows are objects, and table columns are fields. See `recursica-skill-tables`.

## Required vs. optional

**A field is required only at the workflow stage that needs the field.** When a field becomes mandatory at a later stage of a workflow, the field is not required before that stage. The field must not show a required error while the record the form edits is still in a state that does not need the field. An error that demands a value the current state does not need is a validation bug. The user can do nothing about the error, and the error teaches the user to ignore errors.

**Say the condition, not only the requirement.** Where a field will be required later, the field's assistive text states the condition. The assistive text explains at what point the value will be needed, instead of claiming the value is missing now.

**MUST mark only the exception, never both.**

- When most fields are required, mark the few **optional** fields.
- When most fields are optional, mark the few **required** fields.

**Avoid cluttering the form with asterisks.** When nearly all fields are required, do not scatter asterisks everywhere. Use one signal that applies across the whole form instead, and state the convention once. For example, a bold label means required, and a label in regular weight means optional. The form-wide signal adds less visual noise and is equally clear.

**Mark a whole group as optional** wherever an entire form section may not apply to a user. If a user may not have the knowledge for a whole form section, the _form section_ is optional. Mark the form section optional at the heading of the form section, rather than on every field.

## Buttons and submit

**MUST: put the primary submit button at the bottom right, with the secondary cancel button directly to the left of the submit button.** Put both buttons on the same row, at the bottom of the form.

**MUST: on submit, turn the submit button itself into a loading, disabled state.** The submit button is the progress indicator. Disabling the submit button also stops the form from being submitted twice.

**If the project has a loading variant for a button in Theme Forge, use the loading variant.** Otherwise, build the loading state from the button's disabled look. Use the disabled look with an icon alone or an icon with a label, and animate the icon. See `recursica-skill-button`.

Keep the submit button the same size and in the same place. Keep the submit button able to receive focus, so that focus stays where the user pressed Enter. Tell assistive technology that the submit button is busy. Do not rely on the animation to show the busy state.

**NEVER show a blocking spinner or overlay on submit.** Do not gray out the form, do not show a spinner in a modal, and do not lock the viewport. The loading state inside the submit button is enough. Without an overlay, the user's entries stay visible.

## Validation

**Handle errors in the following order.**

1. **Prevent errors.** Use clear labels, help text, placeholder text, and form sections that are small enough. Placeholder text guides what goes in a text field or textarea. Help text below a field states the field's rules, such as the character requirements for a password.
2. **Validate inline, on blur**, which means when the user leaves a field. When the user focuses a field, then leaves the field, and the field's value is invalid, mark the field right away with a non-blocking indicator on that field. Do not show a modal, do not show an alert, and do not stop the user from moving on to another field.
3. **MUST keep the submit button disabled until every required field is complete and valid.**

**NEVER ship an enabled submit button that shows every validation error at once when clicked.** An enabled submit button that shows every error at once is the single worst validation pattern. The user learns nothing about what the form needs until the user has already failed to submit. The user is left guessing what to complete. An enabled submit button means the form is ready to submit.

**Errors the user could not have known about in advance are the only exception to validating inline first.** Examples are a conflict on the server, a broken business rule, or a clash with another record's unique value. The form shows such an error after submit, because no earlier moment exists to catch the error.

## Error presentation

**NEVER show an error state with color alone.** Every error needs a second cue that is not color.

Show every error with both of the following cues:

- A visual change to the field: the field's background color, border color, or line weight.
- **Plus** a separate indicator: an icon, a flag, or a message.

**Turn a field's help text into the field's error message where the change makes sense.** The error message should still state the rule the user broke, not a bare "Invalid input." The user needs the rule in view to fix the problem.

**Show errors at the field level.** In a dense form, flags that sit over the page, pinned to the fields with errors, are a good way to make the location of every error impossible to miss.

## Microcopy

Microcopy is the short text in an interface: labels, hints and messages.

**Do not write sentences.** Microcopy is not prose. The most effective microcopy is the shortest string of text that gives all the information the user needs.

- **Break apart a constraint that has several rules.** For example, a password constraint with a minimum length and a special-character requirement becomes short fragments separated by commas, or bullets. The user scans each rule separately, instead of working through a paragraph.
- **Assume the user will not read the microcopy.** Most users skip microcopy. Skipped microcopy is a reason to keep microcopy short, not a reason to add more words to make up for the skipping.
- **Use plain language.** Use the lowest reasonable reading level. Use no jargon, no elaborate phrasing, and no hedging.

## Field states

**MUST make enabled and disabled fields look clearly different.** The difference between enabled and disabled matters far more than border weight or how full the fill color is.

**Never style a field without focus so that the field looks disabled.** The classic mistake is a light gray background on fields at rest. A light gray background makes an editable form look read-only. A field that is enabled must look enabled, whether or not the field has focus.

Beyond the difference between enabled and disabled, do not worry about heavy versus minimal field styling. The design system settles heavy versus minimal styling.

**Read-only is a separate component, not a toned-down input.** When a value is shown but cannot be edited, use the design system's read-only field component. Never fake read-only by disabling an input or removing the input's borders.

## Pre-fill and defaults

**Pre-filling is not all or nothing.** Decide each pre-filled value by the **risk of the user misunderstanding** the value.

**Pre-fill when the value is low-risk and obvious:**

- Today's date, when today's date is what the form records.
- The current user's name, when the system knows who the user is.

**NEVER pre-fill data the user has to understand to check.** Such data includes values the user would have to think about, look up, or compare against another source to know whether the default is right. A default the user cannot check is worse than an empty field, because the default gets submitted without being checked.

**A form that edits an existing object is a separate case, and the form always arrives filled in** with the object's current values. The user is editing the object, not starting over. The rule for edit forms always applies. `recursica-skill-defaults` owns the rule for edit forms. `recursica-skill-defaults` also holds the 90 percent threshold for pre-selecting an option, and the rule against pre-selecting any choice with later consequences.

## Progressive disclosure

**Put revealed content as close as possible to the control that triggered the content.** Put the revealed content right next to the control and right after the control, and show the content immediately. The user must be able to see the cause and effect between the user's choice and the revealed content. The user then feels in control of the form, rather than controlled by the form.

If the result of a choice appears on a later step instead, **the result is not progressive disclosure**. A result on a later step is multi-step branching. Do not confuse progressive disclosure with multi-step branching.

**Avoid hiding form sections based on the type of user.** In enterprise application design, fields should rarely be invisible to some users. Prefer marking the whole group optional at the group heading. Before hiding large parts of a form, question the requirement.

## Confirmation

**By default, submitting takes effect immediately.** Do not ask "Are you sure?" Users expect most forms in web applications to submit right away. The user can see and edit the results afterward.

**Confirm only when both of the following are true:** the action cannot be undone, and no other way to recover exists. A legally binding submission with no way back is the clearest valid case.

**Deleting a repeated item inside a form follows the same test.** Confirm only if the item is hard to recreate and no undo exists. Otherwise, delete the item on click.

## Persistence and autosave

**A form is in exactly one save mode.** Every other rule in this section follows from the form's save mode.

| Mode                      | When the change is saved                         | Status message                                                                                        |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Field-level / instant** | On each field change, immediately, to the server | **Required.** Show a status that stays on the page and says the change was saved as a draft, and when |
| **Batch save**            | On submit, all at once                           | **None.** Show no status message and no indicator of unsaved changes                                  |

**MUST NOT mix the two modes.** Within a system, either every change saves field by field, or every change saves on submit. Mixing the two modes is a serious failure. The user can no longer tell when the user's work is saved.

**Batch save is the default.** `recursica-skill-selection-controls` gives the full reasoning. The user must be able to change a decision. Saving once also produces one clean log entry instead of a stream of writes, one per field.

**In batch mode, do not show an unsaved or dirty state** (a sign that changes are not yet saved). The only signal the user needs is the submit button becoming enabled once every editable control is valid.

**If the technology can save drafts automatically, always save drafts.** Entered data should survive a refresh and a return visit automatically, with no action from the user. Saving drafts is a field-level behavior. Draft saving therefore needs the status message that field-level mode requires.

**Always keep a submit button**, even with autosave. A form with no submit button is confusing, even when autosave makes the submit button technically unnecessary.

## Accessibility

The design system provides accessible components. The following rules cover the accessibility that comes from how a form is put together:

- **Tab order MUST follow the visual order, from top to bottom.** A single-column layout makes a top-to-bottom tab order easy, which is part of why the single column is mandatory.
- **Keep every `aria-label` correct.** Most `aria-label` values come from the components. Check that nobody has overridden a component's `aria-label` with a vague label.
- **Labels must stand alone.** Never rely on nearby content to give a label meaning. Name exactly what the field holds. Make verbs clear and active.
- **Use plain language**, at the lowest reasonable reading level.

## Password fields

**A password field may include a toggle that shows the password.** The toggle cuts typing errors. The password shows only while the user has the toggle on. Give the toggle an accessible name (the name a screen reader reads out for a control) that says what the toggle does, such as "Show password".

## CAPTCHA

A CAPTCHA is a test that checks the user is a person and not a program.

**Aim for a CAPTCHA that is invisible and built in.** A modern CAPTCHA should run in the background, with no action from the user.

- A check that is fully invisible and automatic is acceptable. A single checkbox that runs a test in the background is also acceptable.
- **NEVER use challenge CAPTCHAs** that make the user pick images, solve puzzles, or make other human judgments. People fail challenge CAPTCHAs regularly, which is infuriating. The small gain in security does not justify a challenge CAPTCHA.

## Open questions

No house rule covers the following questions yet. **Ask the person instead of choosing.** See the never-guess rule in `recursica-skill-design-router`. Do not stretch a rule in this skill to fit an open question.

- **Validation across the steps of a multi-step flow.** No rule says whether a step validates when the user leaves the step. No rule says what going back to an earlier step does to the data the user entered.
- **Search and filter inputs.** No rule says whether search and filter inputs follow the form rules, or are a different kind of surface (a region that holds content, such as a page, panel, or modal).
- **Error summaries for the whole form.** Validation on each field is specified. A summary of errors at the top of the form is not specified.

## Out of scope

- **Choosing the type of control**: a dropdown, radio, checkbox, or toggle. A separate skill covers the choice.
- **Keeping, archiving, and logging submitted entries.** Keeping submitted entries is data logging, not form design. Logging submissions is a separate backend requirement.

## Pre-flight checklist

Check every item before treating a form as done:

- [ ] Every row of the form holds one field, in a single column, from top to bottom, at every container width. Compound controls are the only rows that hold more than one input.
- [ ] Labels sit to the left of the fields, right-aligned. Labels are stacked above the fields only when the container is too narrow for a label and a field side by side.
- [ ] Every field sets label placement to side by side, using the names the code uses (`layouts` set to `side-by-side` in the standard UI kit). A count of the form's field components confirms that every field has the setting.
- [ ] The whole form uses one label placement at each breakpoint: every field side by side, or every field stacked. Labels never mix placements, including between form sections.
- [ ] No custom spacing appears between fields. Only the spacing the components set appears.
- [ ] No form, form section, or form control is inside a card.
- [ ] Fields are grouped by parent object, or by logical order. Repeating objects are in tables.
- [ ] Values that cannot be edited use the read-only component, not a disabled input.
- [ ] Only the exception is marked: required _or_ optional, never both. The form has no clutter of asterisks.
- [ ] No field shows a required error in a state that does not require the field. Each conditional requirement states the condition.
- [ ] Help text and placeholders state the rules up front.
- [ ] Validation runs inline, when the user leaves a field, and validation does not block the user.
- [ ] The submit button stays disabled until the form is valid and complete.
- [ ] The primary submit button is at the bottom right, with the secondary cancel button to the left of the submit button.
- [ ] On submit, the submit button shows a loading, disabled state inside the button, with no blocking spinner or overlay.
- [ ] Error states use a visual change **plus** an indicator that is not color, and error messages restate the rule.
- [ ] Microcopy has no sentences. Rules with several parts are bulleted or separated by commas.
- [ ] Enabled fields look enabled, and disabled fields look clearly different.
- [ ] Pre-filled values are only values the user does not have to understand to check.
- [ ] Revealed content sits directly below, and right next to, the control that triggers the content.
- [ ] The form is in exactly one save mode: field-level everywhere, or batch everywhere.
- [ ] Field-level mode shows a save status that stays on the page. Batch mode shows no status and no unsaved-changes indicator.
- [ ] A submit button is present in either save mode.
- [ ] Tab order matches the visual order.
- [ ] Any toggle that shows the password has an accessible name, and the form has no challenge CAPTCHA.
- [ ] The form has no confirmation dialog, unless the action cannot be undone and no way to recover exists.
- [ ] Open questions were asked about, not decided: validation across steps, filter and search inputs, and error summaries.
