---
name: recursica-skill-switch
description: Rules for the Recursica switch — the tests a value must pass for a switch, when a switch saves under the application's save mode, avoiding switches in table rows, no switches for high-stakes settings, and disabled versus read-only. Use for on/off settings and toggles. Not for one setting that saves at a different time from the other switches — see recursica-skill-checkbox. To choose between controls, see recursica-skill-selection-controls.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Switch

A switch turns one setting on or off. Each switch has a label, which names what the switch controls. The value of a switch is true or false.

## When to use a switch

- **The binary-inverse test passes.** The opposite of the value must be binary, known, and unique. Pairs such as true and false, yes and no, or on and off pass. The value "Black" fails the test, because _not black_ could be gray, pink, or any other value.
- **The label test passes.** The label alone names what the switch controls, with no competing values. A radio group has one label with several values. A switch has one label, and the label implies the value of the switch.
- **The switch saves at the same point as every other switch in the system.** "Rules" names the two save modes a switch may use. If one control must save at a different point from the system's other switches, use a checkbox for that control.
- **The persona must read the on or off state at a glance**, including on a touch screen. A switch has a larger area to tap and a clearer on and off look. The larger area and the clearer look both help on a touch screen.
- **The field is the one lone binary field in a form.** A single checkbox that stands alone looks odd. A switch usually looks better in place of the lone checkbox. A lone binary field is the one case where appearance may decide. Appearance may decide because a checkbox and a switch behave the same for a lone binary field.

**Use a switch only inside a form.** Outside a form, use a segmented control instead of a switch, for every value. Places outside a form include chrome (the header, navigation and footer around the content), a filter bar, a toolbar, and a header. See `recursica-skill-segmented-control`. `recursica-skill-selection-controls` sets this rule.

## When not to use a switch

| Situation                                                                         | Use instead                                                                                                           |
| --------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| The opposite of the value is not binary, known, and unique                        | A checkbox. See `recursica-skill-checkbox`.                                                                           |
| One control alone must save at a different point from the system's other switches | A checkbox. See `recursica-skill-checkbox`. Mixing save modes across switches is forbidden.                           |
| One label has several possible values                                             | A radio group. See `recursica-skill-radio-button`.                                                                    |
| The persona sets several independent on-or-off options together                   | Checkboxes. See `recursica-skill-checkbox`. Checkboxes work in groups, and switches do not.                           |
| The control is in a table row                                                     | A checkbox. A switch is bulky, and wastes space in a dense table row.                                                 |
| Turning the switch on or off could have serious consequences                      | A checkbox plus a confirmation. See `recursica-skill-buttons-links`.                                                  |
| The persona performs an action rather than setting a state                        | A button. See `recursica-skill-button`.                                                                               |
| The persona viewing the value can never edit the value                            | A read-only field, which shows the label and the value as text, with no input. See `recursica-skill-read-only-field`. |

**The persona must understand a switch instantly.** If the persona has to work out what "off" means, do not use a switch.

## Variants

**Use only the switch variants and options that the Recursica MCP server lists for the project.** Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option. A designer can add variants and options in Theme Forge, so each project can differ.

The rules below describe each option by role, such as "the selected state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A switch field has three components:** a switch group, switch items and switches. A switch group holds the switch items and sets the layout of the field. A switch item holds the label of one switch. A switch has a track (the bar), a thumb (the handle that slides), and a selection state. In the standard UI kit, the three components are `switch-group`, `switch-item`, and `switch`. Set each variant on the component that has the variant, never on another component. Use all three components together. Never place a `switch` alone beside a line of text in place of the three components.
- **A switch is selected or unselected.** In the standard UI kit, the variant is `selection-states`, with the options `selected` and `unselected`.
- **The disabled state is set on each switch item.** The disabled state on a switch item lets one switch be unavailable while neighboring switches stay usable. In the standard UI kit, the variant is `states`, with the option `disabled`. The switch item already shows the disabled look (the style of a control the persona cannot use right now).
- **The four names `Enabled Selected`, `Disabled Selected`, `Enabled Unselected`, and `Disabled Unselected` are not four selection states.** Only the design-system website shows the four names. Each name combines whether the switch item is disabled with the switch's selection state.
- **Label placement is set on the switch group, not on each switch item.** Label placement is one decision for the whole field.
- **The thumb can show an icon.** The icon is a second visual sign of the on or off state. The thumb's position and the track's color also show the state.
- **If the project has a variant for which side of the label the switch sits on, use the project's variant.** Otherwise, see "Open questions".
- **Read-only is a separate component.** The read-only field, `read-only-field` in the standard UI kit, shows text instead of a control.

**Label placement is a variant, the same variant every field has.** A group's label sits beside the switches or above the switches. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`.

## Rules

**Use a switch only when both tests pass.** Run the binary-inverse test and the label test before choosing a switch. If either test fails, use a checkbox. A switch has a deliberately narrow use.

**Write a label that names what the switch controls, not the state the switch would move to.** Write "Email notifications", not "Turn on email notifications", and not "Off". The label must not repeat the state or contradict the state. The label must not change when the switch turns on or off. The switch shows whether the switch is on or off.

**Do not use a switch where turning the switch on or off by accident could have serious consequences.** If a setting is destructive, cannot be undone, or is high-risk, use a checkbox with a confirmation. Another safeguard may replace the checkbox and the confirmation.

**Save each switch under the application's single save mode.** `recursica-skill-selection-controls` allows two save modes for a switch: save immediately, or save on submit with the other fields in the form. Saving immediately feels slightly more natural for a switch. The application chooses one save mode once, for the whole system. A switch in a form that saves every field together on submit is not ideal. Such a switch is allowed as long as every switch in the system also waits for Save. The switch then acts like a checkbox and saves with the other fields. A switch that waits for Save is not, by itself, a reason to use a checkbox.

**If the system's switches save immediately, the page must show a save status that stays on the page.** Saving each field as the field changes requires the save status. When every field saves together on submit, the page must show no save status and no sign of unsaved changes. See the save-mode table in `recursica-skill-forms`.

**Never mix instant saving with saving every field together on submit.** Either every change saves when the change happens, or every change saves on submit. The rule covers the whole system, not only one form. An application must never have both kinds of switch. One kind saves the instant the persona turns the switch on or off. The other kind waits for Save.

**Put assistive text below the switch.** State the rule that governs the switch, or the consequence of turning the switch on or off. Build the assistive text with the assistive element. The assistive element is the component that shows help text and error text below a form field. See `recursica-skill-assistive-element`. If toggling the switch has an effect not visible on the screen, describe the effect in the assistive text.

**A switch may reveal more fields.** Show the revealed fields immediately, directly below the switch.

**Stack switches vertically in a switch group, one switch per line**, like every other form field.

**Label placement is one decision per form, not per field.** This group uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form. Short fields that would fit side by side follow the result too. A form may change placement at a breakpoint. A form never mixes placements at one breakpoint. A form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**A disabled switch item and a read-only field are different components, not two styles of one component.**

- **Use a disabled switch item when the persona could make the switch usable by first taking a different action.** A disabled item is still a switch and still clearly a control. The persona cannot use the disabled switch right now.
- **Use a read-only field when the persona viewing the value never changes the value where the value is shown.** A read-only field has no control at all.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The application must provide every behavior in the two lists below. The switch group, switch item and switch components already connect each switch to the item label. The three components also make the on and off states available in code, and show the focus ring. A switch shows the on or off state only by the thumb's position and the track's color. As a result, applications get a switch wrong more often than most controls.

### Screen readers

- **Every switch needs a real label, set on the switch item (`switch-item`).** The item label is the accessible name (the name a screen reader reads out for a control). Text that only sits beside the track is not a label. A screen reader announces a switch with no accessible name as an unlabeled control.
- **The label must state what the switch controls, and make sense out of context.** The reason is that a screen reader announces the label without the text around the switch. "Notifications" beside a track tells a persona using a screen reader nothing about what turning the switch off does.
- **The on and off state must be available in code.** Never show the state only by the thumb's position or the track's color. The persona must hear "on" or "off". `recursica-skill-system-conventions` requires the state in code.
- **The thumb icon is decorative, and must be hidden from screen readers.** The icon is only a second visual sign. The state in code says whether the switch is on or off.
- **Never put the state in the visible label.** A screen reader announces a label that reads "On" as the name. The persona hears "On, off", and cannot tell the name from the state.
- **A group of switches needs a group label, set on the switch group (`switch-group`).** A screen reader announces the group label when focus enters the group.
- **If turning a switch on or off saves immediately, the application must announce the result of the save.** Make the announcement a status message the persona can perceive, not a silent save. A persona using a screen reader does not hear a confirmation that is only visual.
- **Do not announce a change the persona did not make.** When another control changes a switch's state, make no announcement. The switch shows the new state when the persona reaches the switch.
- **When a switch reveals more fields, say that the switch reveals more fields before the persona toggles the switch.** Put the statement in the label or in the assistive text.

### Keyboard and non-mouse navigation

- **Space toggles a switch.** Personas expect Space to toggle a switch. Do not remap Space, do not require a drag, and do not block Space.
- **A switch must never need a drag or a swipe.** The thumb slides only as a visual cue. The persona operates the switch with a click or a key press.
- **The switch component handles key presses, such as Space.** Do not add custom key handlers, and do not rebuild the toggling.
- **Each switch is a separate tab stop** (a place the Tab key lands). A group of switches is a group of tab stops. A whole radio group, by contrast, is one tab stop. Do not add roving focus (where the arrow keys move between items that share one tab stop) or arrow-key movement between switches. Do not repurpose Home and End.
- **Clicking or tapping the item label toggles the switch.** A real label connected in code to the switch toggles the switch when clicked. The label also gives the persona a bigger area to click or tap.
- **Do not move focus for the persona.** Focus stays on the switch after the persona toggles the switch, including when the switch reveals fields below. The persona can then turn the switch straight back.
- **Never show information the persona needs only on hover.** Neither the consequence of the switch nor a tooltip explaining what off means may appear only on hover.

## Styling set by tokens

**Never set or override the switch's styling.** The theme sets every visual property of the switch, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the switch's look. Do not add margins or spacers between switches or around the switch group. Do not set or override the thumb's movement, any animation, the hover and active looks, or the focus ring. The switch components already set each of those properties. If the design needs a look the theme does not give, report the missing look as a design-system gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-selection-controls` — the binary-inverse test, the label test, switch versus checkbox, and the lone binary field. The skill also covers avoiding switches in table rows, and when a change saves across the whole system.
- `recursica-skill-forms` — the save-mode table and the save status each save mode requires, and single-column layout. The skill also covers label placement, one placement per form, and progressive disclosure.
- `recursica-skill-label` — label text that names the object and makes sense out of context, and the required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the switch, and the wording rules for both.
- `recursica-skill-buttons-links` — confirmation for changes with serious consequences, and undo.
- `recursica-skill-system-conventions` — one mode of behavior per system, and never showing a meaning in only one way.

### Only if used on the same screen

- `recursica-skill-checkbox` — the control to use instead of a switch whenever either test fails.

## Open questions

- **Which side of the label the switch sits on.** The design-system website shows a variant for the side, with the options `On Left` and `On Right`, and no token behind the variant. Do not build the variant, and do not rely on the website's options without confirming with the user. Confirm with the user only when the project has no variant for the side of the label.
- **How a switch shows an error.** The standard UI kit gives `dropdown` and `autocomplete` an `error` state. Confirm with the user only when the project has no error state.
- **What a switch does while the switch's change is still saving**, and what happens if the immediate save fails. Confirm with the user what the switch does during the save and after a failed save in every project. Confirm with the user which state to show only when the project has no pending, loading, or failure state.
- **Whether a switch group may hold more than a few switches**, and whether the 7 ± 2 limit applies to switches at all. The 7 ± 2 limit is stated only for radio groups and checkbox groups.

## Pre-flight checklist

- [ ] Every switch is inside a form. No switch appears in chrome, a toolbar, or a filter bar.
- [ ] The binary-inverse test passes. The opposite state is known, unique, and binary.
- [ ] The label test passes. The label alone names what the switch controls, with no competing values.
- [ ] The label names what the switch controls, never the state. The label does not change when the switch turns on or off.
- [ ] No switch controls a setting where turning the switch on or off by accident could have serious consequences. No switch controls a setting that is destructive, cannot be undone, or is high-risk.
- [ ] No switch exists in a table row, unless the user approved the switch.
- [ ] Every switch saves at the same point as every other switch in the system. When switches save immediately, the page shows a save status that stays on the page.
- [ ] The system never mixes switches that save immediately with switches that wait for Save.
- [ ] `switch`, `switch-item`, and `switch-group` are used together, and the switches in each group are stacked vertically.
- [ ] Label placement matches every other field in the same form. Each form has one placement at each breakpoint, with no mixing between fields or form sections.
- [ ] Each switch has assistive text below the switch, built with the assistive element. The assistive text states the rule that governs the switch, or the consequence of turning the switch on or off.
- [ ] The on and off state is available in code, never shown only by the thumb's position or the track's color. The thumb icon is hidden from screen readers.
- [ ] A group of switches has a group label, announced when focus enters the group.
- [ ] Space toggles the switch, no drag or swipe is needed, and key handling comes from the component library.
- [ ] Each switch is a separate tab stop, with no arrow-key movement or roving focus between switches.
- [ ] Clicking the item label toggles the switch.
- [ ] Focus is never moved for the persona, including when turning the switch on or off reveals fields below.
- [ ] The disabled state is used only for switches that are unavailable for now. A value that can never be edited uses the read-only field.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the project.
- [ ] No styling is set or overridden on the switch. No container or spacer is added to change the switch's look.
- [ ] Open questions were asked about, not decided: which side of the label the switch sits on, the error state, the state while a change is saving, and group size.
