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

- **The binary-inverse test passes.** The opposite of the value must be binary, known, and unique, as in true and false, yes and no, or on and off. The value "Black" fails the test, because _not black_ could be gray, pink, or any other value.
- **The label test passes.** The label alone names what the switch controls, with no competing values. A radio group has one label with several values. A switch has one label, and the label implies the value of the switch.
- **The switch saves at the same point as every other switch in the system.** "Rules" names the two save modes a switch may use. If one control has to save at a different point from the system's other switches, use a checkbox for that control.
- **The persona must read the on or off state at a glance**, including on a touch screen. A switch has a larger area to tap and a clearer on and off look. The larger area and the clearer look both help on a touch screen.
- **The field is the one lone binary field in a form.** A single checkbox that stands alone looks odd. A switch usually looks better in place of the lone checkbox. A lone binary field is the one case where appearance may decide, because a checkbox and a switch behave the same for a lone binary field.

**A switch appears only inside a form.** Outside a form, use a segmented control instead of a switch, for every value. Places outside a form include chrome (the header, navigation and footer around the content), a filter bar, a toolbar, and a header. See `recursica-skill-segmented-control`. `recursica-skill-selection-controls` sets this rule.

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

**Use only the switch variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the selected state". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A switch field has three components:** a switch group, switch items and switches. A switch group holds the switch items and sets the layout of the field. A switch item holds the label of one switch. A switch has a track (the bar), a thumb (the handle that slides), and a selection state. In the standard UI kit, the three components are `switch-group`, `switch-item`, and `switch`. Set each variant on the component that has the variant, never on another component. Use all three components together. Never place a `switch` alone beside a line of text in place of the three components.
- **A switch is selected or unselected.** In the standard UI kit, the variant is `selection-states`, with the options `selected` and `unselected`.
- **The disabled state is set on each switch item.** A disabled state on the switch item lets one switch be unavailable while the switches beside the disabled switch stay usable. In the standard UI kit, the variant is `states`, with the option `disabled`. The switch item already shows the disabled look (the style of a control the persona cannot use right now).
- **The four names `Enabled Selected`, `Disabled Selected`, `Enabled Unselected`, and `Disabled Unselected` are not four selection states.** Only the design-system website shows the four names. Each name combines whether the switch item is disabled with the switch's selection state.
- **Label placement is set on the switch group, not on each switch item.** Label placement is one decision for the whole field.
- **The thumb can show an icon.** The icon is a second visual sign of the on or off state, together with the thumb's position and the track's color.
- **If the project has a variant for which side of the label the switch sits on, use the project's variant.** Otherwise, see "Open questions".
- **Read-only is a separate component.** The read-only field, `read-only-field` in the standard UI kit, shows text instead of a control.

**Label placement is a variant, the same variant every field has.** A group's label sits beside the switches or above the switches. In the standard UI kit, the variant is `layouts`, with the options `side-by-side` and `stacked`.

## Rules

**Use a switch only when both tests pass.** A switch has a deliberately narrow use. Run the binary-inverse test and the label test before choosing a switch. If either test fails, use a checkbox.

**The label names what the switch controls, not the state the switch would move to.** Write "Email notifications", not "Turn on email notifications", and not "Off". The switch shows whether the switch is on or off. The label must not repeat the state or contradict the state. The label must not change when the switch turns on or off.

**Do not use a switch where turning the switch on or off by accident could have serious consequences.** Where a setting is destructive, cannot be undone, or is high-risk, use a checkbox with a confirmation, or another safeguard, instead.

**The application's single save mode sets when a switch saves.** `recursica-skill-selection-controls` allows two save modes for a switch: save immediately, or save on submit with the other fields in the form. Saving immediately feels slightly more natural for a switch. The application chooses one save mode once, for the whole system. A switch in a form that saves every field together on submit is not ideal, but is allowed, as long as every switch in the system also waits for Save. The switch then acts like a checkbox and saves with the other fields. A switch that waits for Save is not, by itself, a reason to use a checkbox.

**If the system's switches save immediately, the page must show a save status that stays on the page.** Saving each field as the field changes requires the save status. When every field saves together on submit, the page must show no save status and no sign of unsaved changes. See the save-mode table in `recursica-skill-forms`.

**Never mix instant saving with saving every field together on submit.** Either every change saves when the change happens, or every change saves on submit. The rule covers the whole system, not only one form. An application must never have some switches that save the instant the persona turns the switch on or off and other switches that wait for Save.

**Put the rule that governs the switch, or the consequence of turning the switch on or off, in assistive text below the switch.** Build the assistive text with the assistive element, the component that shows help text and error text below a form field. See `recursica-skill-assistive-element`. If turning the switch on or off has an effect the persona cannot see on the screen, describe the effect in the assistive text.

**A switch may reveal more fields.** The revealed fields appear immediately, directly below the switch.

**Stack switches vertically in a switch group, one switch per line**, like every other form field.

**Label placement is one decision per form, not per field.** This group uses the same label placement as every other field in the form. Apply the container-width test once, to the whole form. The result sets the placement of every field in the form, including short fields that would fit side by side. A form may change placement at a breakpoint, but a form never mixes placements at one breakpoint, and a form section never gets a separate placement. `recursica-skill-forms` sets this rule.

**A disabled switch item and a read-only field are different components, not two styles of one component.**

- **Use a disabled switch item when the persona could make the switch usable by first taking a different action.** A disabled item is still a switch and still clearly a control, but the persona cannot use the switch right now.
- **Use a read-only field when the persona viewing the value never changes the value where the value is shown.** A read-only field has no control at all.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, which every Recursica component follows.

The switch group, switch item and switch components already connect each switch to the item label, make the on and off states available in code, and show the focus ring. The application must provide every behavior in the two lists below. Applications get a switch wrong more often than most controls, because a switch shows the on or off state only by the thumb's position and the track's color.

### Screen readers

- **Every switch needs a real label, set on the switch item (`switch-item`).** The item label is the accessible name (the name a screen reader reads out for a control). Text that only sits beside the track is not a label. A screen reader announces a switch with no accessible name as an unlabeled control.
- **The label must state what the switch controls, and make sense out of context**, because a screen reader announces the label without the text around the switch. "Notifications" beside a track tells a persona using a screen reader nothing about what turning the switch off does.
- **The on and off state must be available in code.** Never show the state only by the thumb's position or the track's color. The persona must hear "on" or "off". `recursica-skill-system-conventions` requires the state in code.
- **The thumb icon is decorative, and must be hidden from screen readers.** The icon is only a second visual sign. The state in code says whether the switch is on or off.
- **Never put the state in the visible label.** A screen reader announces a label that reads "On" as the name. The persona hears "On, off", and cannot tell the name from the state.
- **A group of switches needs a group label, set on the switch group (`switch-group`).** A screen reader announces the group label when focus enters the group.
- **If turning a switch on or off saves immediately, the application must announce the result of the save** as a status message the persona can perceive, not a silent save. A persona using a screen reader does not hear a confirmation that is only visual.
- **Do not announce a change the persona did not make.** When another control changes a switch's state, the switch shows the new state when the persona reaches the switch, with no announcement.
- **When a switch reveals more fields, say that the switch reveals more fields before the persona turns the switch on or off.** Put the statement in the label or in the assistive text.

### Keyboard and non-mouse navigation

- **Space toggles a switch.** Personas expect Space to toggle a switch. Do not remap Space, do not require a drag, and do not block Space.
- **A switch must never need a drag or a swipe.** The thumb slides only as a visual cue. The persona operates the switch with a click or a key press.
- **The switch component handles key presses, such as Space.** Do not add custom key handlers, and do not rebuild the toggling.
- **Each switch is a separate tab stop** (a place the Tab key lands). A group of switches is a group of tab stops. A whole radio group, by contrast, is one tab stop. Do not add roving focus (where the arrow keys move between items that share one tab stop) or arrow-key movement between switches. Do not repurpose Home and End.
- **Clicking or tapping the item label toggles the switch.** A real label connected in code to the switch toggles the switch when clicked, and gives the persona a bigger area to click or tap.
- **Do not move focus for the persona.** Focus stays on the switch after the persona turns the switch on or off, including when the switch reveals fields below. The persona can then turn the switch straight back.
- **Never show information the persona needs only on hover.** Neither the consequence of the switch nor a tooltip explaining what off means may appear only on hover.

## Styling set by tokens

**Never set or override the switch's styling.** The theme sets every visual property of the switch, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the switch's look. Do not add margins or spacers between switches or around the switch group. Do not set or override the thumb's movement, any animation, the hover and active looks, or the focus ring. The switch components already set each of those properties. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-selection-controls` — the binary-inverse test and the label test, switch versus checkbox, the lone binary field, avoiding switches in table rows, and when a change saves across the whole system.
- `recursica-skill-forms` — the save-mode table and the save status each save mode requires, single-column layout, label placement and one placement per form, and progressive disclosure.
- `recursica-skill-label` — label text that names the object and makes sense out of context, and the required and optional markers.
- `recursica-skill-assistive-element` — the help text and error text below the switch, and the wording rules for both.
- `recursica-skill-buttons-links` — confirmation for changes with serious consequences, and undo.
- `recursica-skill-system-conventions` — one mode of behavior per system, and never showing a meaning in only one way.

### Only if used on the same screen

- `recursica-skill-checkbox` — the control to use instead of a switch whenever either test fails.

## Open questions

- **Which side of the label the switch sits on.** The design-system website shows a variant for the side, with the options `On Left` and `On Right`, and no token behind the variant. Do not build the variant, and do not rely on the website's options without asking. Ask only when the project has no variant for the side of the label.
- **How a switch shows an error.** The standard UI kit gives `dropdown` and `autocomplete` an `error` state. Ask only when the project has no error state.
- **What a switch does while the switch's change is still saving**, and what happens if the immediate save fails. Ask what the switch does during the save and after a failed save in every project. Ask which state to show only when the project has no pending, loading, or failure state.
- **Whether a switch group may hold more than a few switches**, and whether the 7 ± 2 limit applies to switches at all. The 7 ± 2 limit is stated only for radio groups and checkbox groups.

## Pre-flight checklist

- [ ] Every switch is inside a form. No switch appears in chrome, a toolbar, or a filter bar.
- [ ] The binary-inverse test passes. The opposite state is known, unique, and binary.
- [ ] The label test passes. The label alone names what the switch controls, with no competing values.
- [ ] The label names what the switch controls, never the state, and does not change when the switch turns on or off.
- [ ] No switch controls a setting where turning the switch on or off by accident could have serious consequences, or a setting that is destructive, cannot be undone, or is high-risk.
- [ ] No switch exists in a table row, unless the user approved the switch.
- [ ] Every switch saves at the same point as every other switch in the system. When switches save immediately, the page shows a save status that stays on the page.
- [ ] The system never mixes switches that save immediately with switches that wait for Save.
- [ ] `switch`, `switch-item`, and `switch-group` are used together, and the switches in each group are stacked vertically.
- [ ] Label placement matches every other field in the same form, with one placement per form at each breakpoint and no mixing between fields or form sections.
- [ ] The rule that governs each switch, or the consequence of turning each switch on or off, is in assistive text below the switch, built with the assistive element.
- [ ] The on and off state is available in code, never shown only by the thumb's position or the track's color, and the thumb icon is hidden from screen readers.
- [ ] A group of switches has a group label, announced when focus enters the group.
- [ ] Space toggles the switch, no drag or swipe is needed, and key handling comes from the component library.
- [ ] Each switch is a separate tab stop, with no arrow-key movement or roving focus between switches.
- [ ] Clicking the item label toggles the switch.
- [ ] Focus is never moved for the persona, including when turning the switch on or off reveals fields below.
- [ ] The disabled state is used only for switches that are unavailable for now. A value that can never be edited uses the read-only field.
- [ ] Every variant, size, and state is one the Recursica MCP server lists for the project.
- [ ] No styling is set or overridden on the switch, and no container or spacer is added to change the switch's look.
- [ ] Open questions were asked about, not decided: which side of the label the switch sits on, the error state, the state while a change is saving, and group size.
