---
name: recursica-skill-time-picker
description: Rules for the Recursica time picker — when a time of day needs a time picker, a 12- or 24-hour clock as the user's preference, seconds, time zones, a date and a time on one line, and clock popover accessibility. Use for time fields. Not for a date — see recursica-skill-date-picker. Formatting rules are in recursica-skill-dates-and-currency.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Time picker

A time picker is a form field that records a time of day. Each time picker has a visible label. The user types the time in the field, or picks the time, such as from a clock popover.

## When to use a time picker

- **The user must set a specific time of day**, such as a start time, an end time, a reminder, or an appointment.
- **The user must state the hours and minutes exactly**, instead of choosing a time from a short list.
- **The exact time matters to the task.** If any nearby time would do, the user is not setting a specific time.

## When not to use a time picker

In each situation below, use the alternative in the right column. Never adapt a time picker to fit the situation.

| Situation                                                    | Use instead                                                                                                 |
| ------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| The user picks a rough or relative time                      | No time at all. "In 30 minutes" is an offset. Record the number and the unit.                               |
| The user chooses from a few set times                        | A segmented control or a dropdown. See `recursica-skill-selection-controls`.                                |
| The value is a length of time, not a time of day             | A number input for each unit. Write `3h 20m`, never `3:20`. See `recursica-skill-dates-and-currency`.       |
| The value is a calendar date                                 | A date picker. See `recursica-skill-date-picker`.                                                           |
| The task is a schedule that repeats or depends on conditions | A page, panel, modal, or other view built for scheduling. "Every Monday at 3 PM" does not fit in one field. |
| The value can never be edited in this place                  | A read-only field, which shows the label and the text with no input. See `recursica-skill-read-only-field`. |

**A date and a time together are one control.** Never build a separate component that combines a date and a time. Put a date picker, the time picker, and an AM/PM select on one line of the form, and give the line one label. See `recursica-skill-forms`.

**Never use a disabled time picker to show a time.** A time that nobody can ever edit in this place needs no form control.

## Variants

**Use only the time picker variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool. Before using a variant, look up the variant's name in code with the same tool, and use the name the code uses. The code can use a different name from the name in Figma and the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has). A wrong name in code has no effect and shows no error. Never invent a variant or an option.

The rules below describe each option by role, such as "the error state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

**Label placement is a variant.** A field's label sits beside the field or above the field. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`. The label beside the field is the house default. The label above the field is the fallback when the form's container is too narrow for both side by side. The container's width decides, not the viewport's width. See `recursica-skill-forms`.

**Set label placement explicitly on every field.** The house rule puts the label beside the input. The code library under an adapter may put the label above the input by default, at every container width. Set the label beside the input on every field, using the names the code uses for the variant and the option.

**Never build a focus state or a placeholder state.** Every Recursica field already shows the focus border and the placeholder text.

- **An error state and a disabled state.** In the standard UI kit, the variant is `states`, with the options `error` and `disabled`.
- **Clock format.** The user's preference sets a 12-hour or a 24-hour clock. The clock format is not a variant. See the rules below.
- **Seconds.** If the project has a seconds variant, use the seconds variant. Otherwise, never add a seconds variant.
- **Time range.** A time range is one control that takes a start time and an end time. If the project has a range variant, use the range variant. Otherwise, do not build a range control without asking.
- **Read-only time.** Show a read-only time with the read-only field component, never with a read-only state of the time picker. A value nobody can edit does not belong in a form control. The read-only field has the same label-placement variant and no input.

## Rules

**Always give the time picker a visible label.** Name exactly what the field holds, as in "Start time", not "Time". A screen reader user hears the label alone, without the context around the field. Use sentence case, with no colon at the end of the label.

**Label placement is one decision per form, not per field.** This field uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields like this one that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**The user's preference sets a 12-hour or a 24-hour clock.** The user's locale or an explicit user setting decides the clock format. The clock format is not a design decision, and the clock format stays the same on every screen.

**Use the user's locale and the user's time zone, never the locale or time zone of the tenant** (the organization whose account the application runs under).

**State the time zone clearly** whenever the time is outside the user's time zone, the user's time zone cannot be found, or the user has switched time zones.

**Do not convert a time to the user's time zone when the place where the event happened matters.** Show the time in the time zone where the event happened, with the time zone labeled. Give the user a way to switch the time to the user's own time zone. An event at 11:00 p.m. local time, converted to 8:00 p.m. for the reader, leads the reader to the wrong conclusion. See `recursica-skill-dates-and-currency`.

**Show seconds only when the values being compared are under a minute, across several objects.** Once one value shows seconds, every value in the compared group shows seconds.

**The user must be able to type the time and to pick the time.** Neither way may be the only way. Never force the user to type when picking would be faster. Never make picking the only way to enter a time. A user who knows the time types the time and moves on.

**State the expected format in help text.** Without help text, the user has to guess the format from a mask that appears on focus, or from a field that expects `HH:MM` without saying so.

**On error, replace the help text with the error message. Do not add the error message to the help text.** Replacing the help text keeps the field the same height, so the form below the field does not shift. The error message must restate the rule. "Invalid time" is not an error message. "Enter a time after 9:00 AM" is an error message.

**Pair the error state with a signal that is not color**, either an icon or the error message. `recursica-skill-system-conventions` requires the second signal.

**A disabled time picker and a read-only field are different components, not two styles of one component.**

- **Disabled time picker.** A disabled time picker is still a field, and still looks clearly like an input, but the user cannot use the field yet. Use a disabled time picker when the user can make the field usable by taking a different action first.
- **Read-only field.** A read-only field is a different component. A read-only field shows a label and text, with no input. Use a read-only field when the current user never edits the value in this place.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The time picker component connects the label to the input and provides the focus ring. Time pickers most often fail at the clock trigger (the control that opens the clock popover), at the AM/PM control, and at the popover. The application builds the clock trigger, the AM/PM control, and the popover. Follow the rules below for all three.

### Screen readers

- **Set a real label in the time picker component.** Never let placeholder text be the accessible name (the name a screen reader reads out for a control). A screen reader does not announce placeholder text as a label, and placeholder text disappears when the user types. A field with no label has no accessible name.
- **Name the clock icon when the icon is a control**, as in "Choose time". Hide a decorative clock icon from screen readers. A screen reader announces an unlabeled clickable icon without saying what the icon does.
- **State the expected format in the help text.** The help text must say whether the field expects `9:00 AM` or `09:00`, and whether the field accepts seconds. A screen reader user gets nothing from a visual mask.
- **State the time zone in text**, not by position or color. A user cannot learn a time zone that the screen only implies. A converted time, or a time that is not local, shown with no time zone label, shows the user the wrong time with no sign that the time is wrong.
- **Name the unit in the help text when the unit is not obvious**, such as when the field takes a duration, or a 24-hour time in a 12-hour locale.
- **The error message is the text a screen reader announces.** The error message replaces the help text, and becomes the only text the screen reader reads. The error message must state the rule, including the format.

### Keyboard and non-mouse navigation

- **Never remove the field from the tab order**, and never make reaching the field depend on a pointer.
- **Every control inside the field is a separate tab stop** (a place the Tab key lands), such as the clock trigger and an AM/PM control. Each control works with Enter or Space. Never build a control inside the field that responds only to clicks.
- **Typing must always work.** The popover is never the only way to enter a value. A keyboard user must be able to type the time and move on, without opening the popover.
- **The popover must be fully usable by keyboard.** The popover opens from the keyboard. The arrow keys move between values, and Enter selects a value. Escape closes the popover and returns focus to the field the popover opened from. Never leave focus in a closed popover, and never drop focus to the top of the page.
- **Never move focus ahead automatically between the parts of a time**, such as from hour to minute to AM/PM as the user types. An automatic jump leaves keyboard users and screen reader users in a part of the time the user did not choose. An automatic jump also moves focus away from a user fixing a typo.
- **Do not move focus for the user** when a value looks complete. When the popover closes, do not move focus into a different field.
- **Show every part the user needs to complete the field without hover**, including the format, the time zone, and the clock trigger.

## Styling set by tokens

**Never set or override the time picker's styling.** The theme sets every visual property of the time picker, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the time picker's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

The time picker's width is fixed.

**Do not set or override the time picker's built-in behavior**: the link between the label and the input, and what each key does inside the field. The time picker component sets both.

**Never style a time picker without focus to look disabled.** An editable field must look editable at rest.

## Related skills

- `recursica-skill-dates-and-currency` — 12-hour versus 24-hour clocks, time zones, when not to convert a time to the reader's time zone, seconds, the format of a duration, and the rule that focus decides the format.
- `recursica-skill-forms` — label placement and one placement per form, the exception for a control made of several inputs, which puts a date and a time on one line, validation timing, and save mode.
- `recursica-skill-label` — the label component, the label-placement variant, and the rule of one label for a control made of several inputs.
- `recursica-skill-assistive-element` — the help text and error text below the field, and why the error text replaces the help text.
- `recursica-skill-selection-controls` — when a list of preset times replaces free entry, and a disabled control versus a read-only field.
- `recursica-skill-system-conventions` — showing meaning in more than one way.

### Only if used on the same screen

- `recursica-skill-date-picker` — the date input on a line that holds a date and a time.

## Open questions

- **The AM/PM control.** Only the design-system website shows an AM or PM selector inside the field, hidden when the clock is 24-hour. Whether the AM/PM selector is part of the time picker, or a separate select on the same line, is not stated. Do not rely on the AM/PM selector without asking.
- **What the popover contains.** Only the design-system website shows a "dial or input picker" that a dropdown indicator opens. The step between times in the popover, such as every minute, every five minutes, or every fifteen minutes, is not stated. Do not rely on any popover content without asking.
- **Whether a time has a masked format while the field has focus**, as a date does. The rule in `recursica-skill-dates-and-currency` that focus decides the format gives only a date example.
- **Seconds.** Whether the field can accept seconds at all is unknown. Ask only when the project has no seconds variant.
- **Time ranges.** How a start time and an end time are checked against each other is not stated. Ask only when the project has no range variant.
- **The UI kit defines a disabled state, but the design-system website does not show one.** Treat the list of states that the Recursica MCP server gives for the project as the authority, and flag the gap.

## Pre-flight checklist

- [ ] The value is a time of day, not an offset, a duration, or one of a few set times.
- [ ] Every time picker has a visible label that makes sense without the context around the field. A date and a time on one line are one control with one label.
- [ ] Label placement is side by side, unless the container is too narrow.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections.
- [ ] A 12-hour or 24-hour clock follows the user's preference, and stays the same on every screen.
- [ ] The time is in the user's time zone, or the time zone is stated. A time from an event in a different place is shown in the time zone of that place, labeled, with a way to convert the time.
- [ ] Seconds appear only when values under a minute are compared across several objects, and then on every value in the compared group.
- [ ] Both typing and picking work, and neither one is the only way.
- [ ] The expected format is stated in help text.
- [ ] Help text and error text are set through the time picker component. The error message replaces the help text and restates the rule.
- [ ] The error state has a signal that is not color.
- [ ] Every control inside the field, such as the clock trigger and the AM/PM control, has an accessible name, is a separate tab stop, and works with Enter or Space. Decorative icons are hidden from screen readers.
- [ ] The popover opens from the keyboard, the arrow keys move between values, and Escape closes the popover and returns focus to the field.
- [ ] Focus never jumps ahead automatically between hour, minute, and AM/PM, and is never moved for the user.
- [ ] Every variant and state is one the Recursica MCP server lists for the project. No size variant, seconds variant, range variant, warning state, or inline clock is added unless the Recursica MCP server lists one for the project.
- [ ] No styling is set or overridden on the time picker, and no container or spacer is added to change the time picker's look.
- [ ] Every field without focus looks editable, not disabled.
- [ ] Times that cannot be edited use the read-only field, not a disabled time picker.
- [ ] Open questions were asked about, not decided: the AM/PM control, what the popover contains, a masked format while the field has focus, seconds, time ranges, and the disabled state missing from the design-system website.
