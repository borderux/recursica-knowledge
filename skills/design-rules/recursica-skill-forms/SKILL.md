---
name: recursica-skill-forms
description: House rules for forms — layout and label placement, grouping, whether to mark required or optional fields, validation timing, error display, microcopy, pre-fill, progressive disclosure, save modes, multi-step flows, and accessibility. Use for any form, settings page, wizard, or data-entry screen. Not for choosing between controls — see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Forms

Treat each house rule for forms as a constraint, not a suggestion. The rules are the team's opinions, not neutral best practices.

The rules assume **complex enterprise web applications, designed for desktop first**. The rules also assume that every component is accessible and correctly styled. The design system decides how each component looks. The house rules cover how a form is put together: field order, states and wording.

**Let the form field components set the spacing.** The form field components already hold the space between fields and between form sections. Place the fields one after another. Never add custom margins, padding or spacer elements to change the space between fields.

**NEVER put a form, a form section or a single form control inside a card.** No exception exists. Group fields with headings and with the spacing the components set. A card is for repeating peer objects (objects of the same kind, such as rows in a list). A form holds the properties of one object. A card border around part of a form marks a boundary that means nothing. See `recursica-skill-card`.

## The two governing principles

1. **Remove ambiguity.** A design is wrong when the design makes the persona guess. For example, the persona should never guess what to fill in or where to go next. The persona should also never guess whether the work was saved. Every layout decision should leave exactly one correct reading order. Every layout decision should also leave one correct tab order (the order the Tab key moves through the fields). Every layout decision should also leave one obvious next action.
2. **Prevent errors before catching errors.** Good labels, help text, placeholders and small form sections do more than any validation can. Validation is the backup for errors the form did not prevent.

## Layout

**MUST: put one field on each row, in a single column, from top to bottom.** Keep the single column at every width of the form's container. Never put two fields on one row, even in a wide container. For example, `City` and `State` sit on separate rows on a full-width page. When the container is wide, leave the extra space empty or limit the form's maximum width. Never fill the extra space with a second column.

**NEVER use a multi-column form layout**, for an address, to save vertical space, or for any other reason. For example, never split `Address 1`, `Address 2`, `City`, `State` and `Zip` into two columns. Multi-column layouts are banned because the tab order becomes unclear:

- Focus could move down the left column, then down the right column.
- Focus could also move left to right across each row.

Both orders are reasonable, and a layout with two reasonable orders is broken. A form's reading order must never move both left to right _and_ top to bottom.

**A compound control is the one exception.** Small, closely tied inputs that make up one value may sit on one row, as one compound control. For example, a date picker, a time entry and an AM/PM select may share a row. Treat a compound control as one control with one label. A compound control is the only case where inputs share a row.

## Labels

**MUST: put the label to the left of the field, on the same row, right-aligned.** Right-align the label text, so the label text ends next to the field.

The label beside the field has three reasons, most important first:

- The eye moves only a short distance from label to field. A left-aligned label in a wide column can leave a wide gap before the field. Across a wide gap, the eye can drift to the wrong field, and the persona fills in the wrong field.
- The persona checks every entry in one scan straight down the column of _values_. The persona does not jump from label to value to label to value.
- Labels beside the fields keep the form short.

**Use the width of the form's container only to decide whether a label sits beside or above the field.** Never let the container's width change the order of the fields. Fields always stay one per row, top to bottom.

**Stack the label above the field only when the form's container cannot fit the label beside the field.** The width of the form's container decides, not the viewport breakpoint (the screen width at which the whole layout changes). A form in a narrow panel, drawer or side rail on a large desktop display stacks the labels. A wide form on a tablet does not stack the labels.

**Stacked labels are a fallback, never a preference.** Stacked labels have three costs:

- The form gets longer.
- The persona's eye switches back and forth between label and field while scanning.
- Worse still, fields have different heights, so a stacked form has an uneven vertical rhythm. For example, a textarea (a multi-line text field) is tall, and a radio group has one row for each option.

**MUST: use one label placement for the whole form. Use side by side or stacked, never both at the same breakpoint.** Apply the container-width test once, to the whole form. The result sets the label placement of every field in the form. If the form's container cannot fit a label and a field side by side, every field in the form stacks. For example, when a drawer is too narrow for labels beside the fields, every field in the drawer's form stacks. A short field such as `Zip` stacks too, even though `Zip` alone would fit side by side.

Mixing the two placements in one form causes three problems, and none of the three is about looks:

- **Mixing breaks the single scan down the values.** With labels beside the fields, the persona checks every entry in one pass down the column of values. A stacked field in the middle breaks the column of values.
- **Mixing creates two competing left edges.** The persona cannot tell whether the next text to read is a label or a value.
- **Mixing makes one field look like a different kind of field.** The persona looks for a reason for the difference, and no reason exists.

**A whole form may switch label placement between breakpoints.** For example, a form may be side by side in a wide container and stacked in a narrow drawer. A form that switches still uses one placement for every field at each breakpoint. Mixing placements within a single breakpoint is forbidden.

**Use the form's one label placement in every form section.** A form section is part of one form. For example, a stacked `Shipping` section below a side-by-side `Contact` section mixes placements in one form. Mixing placements between form sections is the same defect as mixing placements between fields.

**Set label placement to side by side on every field.** In the standard UI kit (the unchanged UI kit in the official Recursica release), the variant is `layouts` and the option is `side-by-side`. An adapter (the Recursica component library for one framework, such as Mantine or Angular Material) may **set the fields to `stacked` by default**. The `stacked` option puts the label above the field at every width and breaks the side-by-side rule. A field with label placement left unset has a defect, not a default. Two mistakes leave label placement unset, and neither mistake shows an error:

- **The code may use a name other than `layouts`.** `layouts` is the name in Figma and the UI kit. Each adapter names the setting in a different way. An adapter may ignore a name the adapter does not know. Look up the name the code uses with the Recursica MCP server's `recursica_get_component_doc` tool before setting label placement.
- **Every field needs the setting.** Label placement is set per field. One missed field mixes label placements in the form. Count the form's field components to check that every field has the setting.

**Always name the object clearly in a label.** The label names exactly what the field holds. For example, write `Phone number`, not `Number`. A label must never rely on the content around the label for meaning or context. A persona using a screen reader hears the label alone. When a label uses a verb, make the verb clear and active. Never use a passive verb or a linking verb in a label.

## Single page vs. multi-step

**Choose between one page and multiple steps by the persona's mental model (what a person expects, based on the tools and work the person already knows), not by the number of fields alone.** Use multiple steps when **any** of the following three conditions is true:

1. **Separate stages.** The task naturally breaks into steps that the persona already thinks of as separate. Splitting the task into those steps also makes the task easier to take in.
2. **Volume.** The form has so many fields that the visual noise needs to be reduced.
3. **Later branching.** An answer makes a _later_ step significantly different.

**Prefer one long form when information refers back and forth across the form.** In some forms, completing one form section depends on checking or remembering another form section. In such a form, a stepper is actively worse than one long form. Moving forward and back to re-read costs more than scrolling does. Decide by how much of the form has to stay in view, not by how many fields the form has. In usability testing of a long credit-card application, the single form did better than the stepper. The single form won because the persona wanted to confirm at once that the application was correct and complete. See `recursica-skill-screen-priority`.

**Use progressive disclosure for a small, local change, and stay on one page.** Examples of a small, local change are a field or a form section that appears right below the answer. Choosing `Other`, for instance, shows an `Other reason` field right below the choice. When an answer leads to a _clearly different later step_, use multiple steps. Do not use multiple steps to handle small conditional fields.

## Grouping

Group fields in the following order of preference:

1. **By parent object.** If ten fields are properties of one object, group the ten fields under a single heading for that object. For example, put `Name`, `Email` and `Phone` under one `Contact` heading. Grouping by parent object is the best structure available.
2. **By step, or by the logical order** in which the persona fills in the information.

**Put repeating objects in a table.** Repeating objects are many objects of the same kind, with the same properties. For example, the line items on an order are repeating objects. Never use a stack of form groups or a group of cards for repeating objects. In the table, each table row is one object and each table column is one field. See `recursica-skill-tables`.

## Required vs. optional

**Make a field required only at the workflow stage that needs the field.** When a field becomes required at a later stage of a workflow, the field is not required before that stage. For example, a `Tracking number` is needed when an order ships, not when the order is drafted. The field must not show a required error while the record the form edits does not need the field yet. A required error for a value the record's current state does not need is a validation bug. The persona can do nothing about the error, and the error teaches the persona to ignore errors.

**State the condition, not only the requirement.** If a field will be required later, the field's assistive text says when the value will be needed. For example, "Needed before the order ships". The assistive text never claims the value is missing now.

**MUST mark only the exception: the required fields or the optional fields, never both.**

- When most fields are required, mark the few **optional** fields.
- When most fields are optional, mark the few **required** fields.

**Avoid filling the form with asterisks.** When nearly all fields are required, do not put asterisks across the form. Use one signal for the whole form instead, and state what the signal means once. For example, a bold label means required, and a label in regular weight means optional. One form-wide signal adds less visual noise and is just as clear.

**Mark a whole form section as optional wherever the whole form section may not apply to a persona.** For example, a persona may not have the knowledge to fill in a whole form section. That _form section_ is optional. Put the optional mark on the form section's heading, not on every field.

## Buttons and submit

**MUST: put the primary submit button at the bottom right. MUST: put the secondary cancel button directly to the left of the submit button.** Put both buttons on the same row, at the bottom of the form.

**MUST: on submit, turn the submit button itself into a loading, disabled state.** The submit button is the progress indicator. A disabled submit button also stops the form from being submitted twice.

**If the theme (the design a designer sets in Theme Forge: the token values, and each component's variants, states and sizes) has a loading variant for a button, use the loading variant.** Otherwise, build the loading state from the button's disabled look. Use the disabled look with an icon alone or an icon with a label, and animate the icon. See `recursica-skill-button`.

Three more rules apply to the submit button:

- Keep the submit button the same size and in the same place.
- Keep the submit button able to receive focus, so that focus stays where the persona pressed Enter.
- Tell assistive technology that the submit button is busy. Do not rely on the animation to show the busy state.

**NEVER show a blocking spinner or overlay on submit.**

- Do not gray out the form.
- Do not show a spinner in a modal.
- Do not lock the viewport.

The loading state inside the submit button is enough. With no overlay, the persona's entries stay visible.

## Validation

**Handle errors in the following order.**

1. **Prevent errors.** Use clear labels, help text, placeholder text, and form sections that are small enough. Placeholder text shows what goes in a text field or textarea. Help text below a field states the field's rules, such as the character requirements for a password.
2. **Validate inline, when the persona leaves a field.** If the persona leaves a field with an invalid value, mark the field right away. For example, a persona types `name@` in `Email` and tabs away, and the `Email` field shows the error. Mark the field with an indicator that does not block the persona. Do not show a modal or an alert. Do not stop the persona from moving on to another field.
3. **MUST keep the submit button disabled until every required field is complete and valid.**

**NEVER ship an enabled submit button that shows every validation error at once when clicked.** That button is the single worst validation pattern. The persona learns what the form needs only after a failed submit. The persona is then left guessing what to complete. An enabled submit button tells the persona the form is ready to submit.

**Errors the persona could not have known about in advance are the only exception to validating inline first.** Show such an error after submit, because no earlier moment exists to catch the error. Examples are a conflict on the server, a broken business rule, or a clash with another record's unique value.

## Error presentation

**NEVER show an error state with color alone.** Show every error with both of the following cues:

- A visual change to the field: the field's background color, border color, or line weight.
- **Plus** a separate indicator that is not color: an icon, a flag, or a message.

**Turn a field's help text into the field's error message where the change makes sense.** For example, the help text "8 or more characters" stays in view as the error. The error message should still state the rule the persona broke, not a bare "Invalid input". The persona needs the rule in view to fix the error.

**Show each error on the field that has the error.** In a dense form, flags are a good way to show errors. A flag sits over the page and is pinned to a field with an error. Flags make the place of every error impossible to miss.

## Microcopy

Microcopy is the short text in an interface: labels, hints and messages.

**Do not write sentences in microcopy.** For example, write "8 or more characters", not "The password must have at least 8 characters". The best microcopy is the shortest text that gives the persona all the information the persona needs.

- **Split a constraint that has several rules.** For example, a password may need a minimum length and a special character. Write the two rules as short phrases separated by commas, or as bullets. The persona scans each rule separately, instead of reading a paragraph.
- **Assume the persona will not read the microcopy.** Most personas skip microcopy. Skipping is a reason to keep microcopy short. Skipping is never a reason to add more words.
- **Use plain language.** Use the lowest reasonable reading level. Use no jargon, no elaborate phrasing, and no hedging.

## Field states

**MUST make enabled and disabled fields look clearly different.** The difference between enabled and disabled matters far more than border weight or how full the fill color is.

**Never make a field without focus look disabled.** For example, a light gray background on every field at rest makes an editable form look read-only. A light gray background at rest is the classic mistake. An enabled field must look enabled, with or without focus.

Beyond the difference between enabled and disabled, leave the choice of heavy or minimal field styling to the design system.

**Show a value the persona cannot edit with the design system's read-only field component.** Read-only is a separate component, not an input with reduced styling. Never fake read-only by disabling an input or by removing the input's borders.

## Pre-fill and defaults

**Decide each pre-filled value separately, by the risk that the persona misunderstands the value.**

**Pre-fill when the value is low-risk and obvious:**

- Today's date, when today's date is what the form records.
- The name of the persona filling in the form, when the system knows who the persona is.

**NEVER pre-fill a value the persona has to understand before the persona can check the value.** Such values include a value that needs one of the following before the persona knows the default is right:

- thought
- a lookup
- a comparison against another source

A default the persona cannot check is worse than an empty field, because the default gets submitted without being checked.

**Always open a form that edits an existing object filled in with the object's current values.** For example, the form that edits an order opens with the order's current address. A form that edits an object is a separate case from the pre-fill rules above. The persona is editing the object, not starting over. The rule for a form that edits an object always applies.

`recursica-skill-defaults` sets the rule for a form that edits an object. `recursica-skill-defaults` also sets two more rules:

- the 90 percent threshold for pre-selecting an option
- the rule against pre-selecting any choice with later consequences

## Progressive disclosure

**Put content that a control reveals as close as possible to the control.** Put the revealed content right next to the control and right after the control, and show the content immediately. For example, checking `Ship to a different address` shows the address fields directly below the checkbox. The persona must be able to see that the choice caused the revealed content. The persona then feels in control of the form, rather than controlled by the form.

**A result that appears on a later step is multi-step branching, not progressive disclosure.** Do not confuse progressive disclosure with multi-step branching.

**Avoid hiding form sections based on the type of persona.** In enterprise application design, fields should rarely be invisible to some personas. Prefer marking the whole form section optional at the form section's heading. Before hiding a large part of a form, question the requirement.

## Confirmation

**By default, submitting takes effect immediately.** Do not ask "Are you sure?" Personas expect most forms in web applications to submit right away. The persona can see and edit the results afterward.

**Confirm only when both of the following are true:**

- The action cannot be undone.
- No other way to recover exists.

A legally binding submission with no way back is the clearest valid case.

**Deleting a repeated item inside a form follows the same confirmation test.** For example, removing one line item from an order follows the test. Confirm only if the item is hard to recreate and no undo exists. Otherwise, delete the item on click.

## Persistence and autosave

**Put each form in exactly one save mode.** Every other rule in this section follows from the form's save mode.

| Mode                      | When the change is saved                         | Status message                                                                                        |
| ------------------------- | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------- |
| **Field-level / instant** | On each field change, immediately, to the server | **Required.** Show a status that stays on the page and says the change was saved as a draft, and when |
| **Batch save**            | On submit, all at once                           | **None.** Show no status message and no indicator of unsaved changes                                  |

**MUST NOT mix the two modes.** Within a system, either every change saves field by field, or every change saves on submit. For example, one settings page never saves on each change while the next settings page waits for submit. Mixing the two modes is a serious failure. The persona can no longer tell when the persona's work is saved.

**Use batch save by default.** The persona must be able to change a decision. Saving once also writes one clean log entry, instead of one write for each field. `recursica-skill-selection-controls` gives the full reasoning.

**In batch mode, do not show an unsaved state** (a sign that changes are not yet saved). For example, show no "Unsaved changes" label. The only signal the persona needs is the submit button becoming enabled once every editable control is valid.

**If the product's technology can save drafts automatically, always save drafts.** Entered data should survive a page refresh and a return visit, with no action from the persona. Saving drafts is a field-level behavior. Draft saving therefore needs the status message that field-level mode requires.

**Always keep a submit button**, even with autosave. A form with no submit button is confusing, even when autosave makes the submit button technically unnecessary.

## Accessibility

The design system provides accessible components. The following rules cover the accessibility that depends on how a form is put together:

- **Tab order MUST follow the visual order, from top to bottom.** A single column makes a top-to-bottom tab order easy, which is part of why the single column is mandatory.
- **Keep every `aria-label` correct.** Most `aria-label` values come from the components. Check that nobody has replaced a component's `aria-label` with a vague label.
- **Labels must stand alone.** Follow the label rules under "Labels" above.
- **Use plain language**, at the lowest reasonable reading level, as "Microcopy" above sets out.

## Password fields

**A password field may include a toggle that shows the password.** The toggle cuts typing errors. The password shows only while the persona has the toggle on. Give the toggle an accessible name (the name a screen reader reads out for a control) that says what the toggle does, such as "Show password".

## CAPTCHA

A CAPTCHA is a test that tells a person apart from a program.

**Prefer a CAPTCHA that is invisible and built in.** A modern CAPTCHA should run in the background, with no action from the persona.

- A check that is fully invisible and automatic is acceptable. A single checkbox that runs a test in the background is also acceptable.
- **NEVER use challenge CAPTCHAs** that make the persona pick images, solve puzzles, or make other human judgments. People fail challenge CAPTCHAs often, which is infuriating. The small gain in security does not justify a challenge CAPTCHA.

## Open questions

**Confirm with the user instead of choosing.** No house rule covers the following questions yet. See the never-guess rule in `recursica-skill-design-router`. Do not stretch a house rule for forms to fit an open question.

- **Validation across the steps of a multi-step flow.** No rule says whether a step validates when the persona leaves the step. No rule says what going back to an earlier step does to the data the persona entered.
- **Search and filter inputs.** No rule says whether search and filter inputs follow the form rules. Search and filter inputs might instead be a different kind of region that holds content. Examples of such a region are a page, a panel or a modal.
- **Error summaries for the whole form.** The rules cover validation on each field. No rule covers a summary of errors at the top of the form.

## Out of scope

- **Choosing the type of control**: a dropdown, radio, checkbox, or toggle. `recursica-skill-selection-controls` covers the choice.
- **Keeping, archiving, and logging submitted entries.** Keeping submitted entries is data logging, not form design. Logging submissions is a separate backend requirement.

## Pre-flight checklist

Check every item before treating a form as done:

- [ ] Every row of the form holds one field, in a single column, from top to bottom, at every container width. Compound controls are the only rows that hold more than one input.
- [ ] Labels sit to the left of the fields, right-aligned. Labels are stacked above the fields only when the container cannot fit a label and a field side by side.
- [ ] Every field sets label placement to side by side, using the names the code uses. In the standard UI kit, `layouts` is set to `side-by-side`. A count of the form's field components confirms that every field has the setting.
- [ ] The whole form uses one label placement at each breakpoint: every field side by side, or every field stacked. Labels never mix placements, including between form sections.
- [ ] No custom spacing appears between fields. Only the spacing the components set appears.
- [ ] No form, form section, or form control is inside a card.
- [ ] Fields are grouped by parent object, or by logical order. Repeating objects are in tables.
- [ ] Values that cannot be edited use the read-only component, not a disabled input.
- [ ] Only the exception is marked: required _or_ optional, never both. The form has no clutter of asterisks.
- [ ] No field shows a required error in a state that does not require the field. Each conditional requirement states the condition.
- [ ] Help text and placeholders state the rules up front.
- [ ] Validation runs inline, when the persona leaves a field, and validation does not block the persona.
- [ ] The submit button stays disabled until the form is valid and complete.
- [ ] The primary submit button is at the bottom right. The secondary cancel button sits to the left of the submit button.
- [ ] On submit, the submit button shows a loading, disabled state inside the button, with no blocking spinner or overlay.
- [ ] Error states use a visual change **plus** an indicator that is not color, and error messages restate the rule.
- [ ] Microcopy has no sentences. Rules with several parts are bulleted or separated by commas.
- [ ] Enabled fields look enabled, and disabled fields look clearly different.
- [ ] Pre-filled values are only values the persona does not have to understand to check.
- [ ] Revealed content sits directly below, and right next to, the control that reveals the content.
- [ ] The form is in exactly one save mode: field-level everywhere, or batch everywhere.
- [ ] Field-level mode shows a save status that stays on the page. Batch mode shows no status and no unsaved-changes indicator.
- [ ] A submit button is present in either save mode.
- [ ] Tab order matches the visual order.
- [ ] Any toggle that shows the password has an accessible name, and the form has no challenge CAPTCHA.
- [ ] The form has no confirmation dialog, unless the action cannot be undone and no way to recover exists.
- [ ] Open questions were asked about, not decided: validation across steps, filter and search inputs, and error summaries.
