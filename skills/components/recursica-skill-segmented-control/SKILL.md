---
name: recursica-skill-segmented-control
description: Rules for the Recursica segmented control, the horizontal single-select — when to use a segmented control instead of radio buttons, a dropdown, tabs, or chips, orientation and fill width, the 2 to 5 option limit, and radio-group accessibility. Use for view switchers, inline filters, and mode toggles. Not for multi-select — see recursica-skill-chip; not for parts of one whole — see recursica-skill-tabs.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Segmented control

A segmented control is a horizontal radio group. The user selects exactly one of 2 to 5 options, and every option is visible at once.

## When to use a segmented control

- **The layout needs a horizontal single-select, where the user selects exactly one option.** A segmented control is the house component for a horizontal single-select. Never lay out radio buttons in a horizontal row.
- **The screen needs a toggle outside a form.** A switch belongs only in a form. Every two-state control in application chrome (the header, navigation and footer around the content), a filter bar, or a toolbar is a segmented control. In application chrome, the segmented control shows icons instead of text labels. A control that switches between a light theme and a dark theme is the standard example. See `recursica-skill-screen-scaffolding` for where application chrome sits.
- **The choice has 2 to 5 options**, with short labels.
- **The choice switches a view or a mode**, such as list or grid, or daily or weekly. The options are closely tied to the content on screen.
- **The user filters the content where the content is shown**, and a dropdown or a modal would be more than the filter needs.

## When not to use a segmented control

| Instead of a segmented control                                         | Use                                                                                       |
| ---------------------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| More than five options                                                 | A vertical radio group. Use a dropdown when the options also number more than 7 ± 2.      |
| The user may choose more than one option                               | Selectable chips for a horizontal layout, or a checkbox group for a vertical layout.      |
| The labels are long or complex                                         | A vertical radio group. Long labels do not fit the compact layout of a segmented control. |
| The options are parts of one whole, and each part has separate content | Tabs, which have routes. See `recursica-skill-tabs`.                                      |
| Switching to another option causes a heavy reload or changes data      | A control with an explicit submit action, and feedback.                                   |
| The choice is on or off                                                | A switch or a checkbox. See `recursica-skill-selection-controls`.                         |

**Never use tabs in place of a segmented control that grows past five options.** Tabs hold the parts of one whole. A segmented control holds the values of one single-select field. Tabs never replace a segmented control, and a segmented control never replaces tabs. When the options grow past five, use a vertical radio group or a dropdown.

## Variants

**Use only the segmented control variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant or an option.

The rules below describe each option by role, such as "the horizontal orientation". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **A segmented control has two parts: the control and the segments.** The control is the whole group of options. A segment is one option in the group. In the standard UI kit, the two parts are `segmented-control` and `segmented-control-item`.
- **An orientation variant on the control, with a horizontal option and a vertical option.** Always use the horizontal option. See the orientation rule below. In the standard UI kit, the variant is `orientation`, with the options `horizontal` and `vertical`.
- **A fill-width variant on the control.** With fill width on, the control stretches to the width of the container the control sits in, and the segments share the width equally. Fill width is off by default. In the standard UI kit, the variant is `fill-width`, with the options `false` and `true`.
- **A selection variant on each segment, with a selected option and an unselected option.** In the standard UI kit, the variant is `selection-states`, with the options `selected` and `unselected`.
- **A leading icon on a segment.** A segment may show a leading icon.

## Rules

**A segmented control has 2 to 5 options, and the 2-to-5 limit overrides the general limit.** The house limit on the number of options is 7 ± 2. A segmented control is horizontal and compact, so the tighter limit wins. `recursica-skill-selection-controls` sets this rule.

**Use the horizontal orientation.** A segmented control is the house component for a _horizontal_ single-select, and for no other layout. `recursica-skill-selection-controls` names the **radio group** as the vertical single-select, with the options stacked one above another. The UI kit has a vertical orientation, but a vertical single-select is a radio group. Do not use the vertical orientation.

**Write each segment label in one or two words.** If a label needs more than two words, use a different control.

**One option is always selected.** A segmented control has no empty state, because a segmented control is a single-select field with a default option. Choose the default option by the pre-selection rules in `recursica-skill-selection-controls`.

**A segmented control saves changes in the same mode as every other part of the system.** If the application saves selection changes immediately, the segmented control saves immediately too. If the application saves all changes together, the segmented control saves with all the other changes. Never give a segmented control a separate save mode. See `recursica-skill-system-conventions`.

**Switching to another option must be quick and must not be destructive.** If a switch would be slow or destructive, use a control with an explicit submit action and feedback instead.

**A segmented control used as a toggle follows every rule in this skill**, including 2 to 5 options, one option always selected, and quick switching that is not destructive. A segmented control with two options is still a segmented control, not a switch.

**Give every icon-only segment a name.** An icon alone does not say what the segment does. See the screen reader rules below.

**Never turn on fill width to fit more options.** A stretched segmented control still has a limit of 5 options.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

**Build a segmented control as a radio group.** The most common mistake is a line of buttons where only color marks the selected button. A screen reader does not announce the color, and a keyboard user has to tab through every segment.

### Screen readers

- **A screen reader must announce the segmented control as a group of radio options with exactly one option selected**, not as a group of buttons.
- **Give the group an accessible name** (the name a screen reader reads out for a control) that says what the user is choosing, such as "View" or "Date range". Without the accessible name, a screen reader user hears the options but not what the options are for.
- **A screen reader announces each segment's label, and whether the segment is selected.** The selected state must be available in code. `recursica-skill-system-conventions` forbids showing the selected state by color alone.
- **An icon-only segment must have an explicit accessible name.** A screen reader does not announce the icon.
- **A screen reader must not announce a leading icon beside a label.** The leading icon is decorative.
- **When a change of selection changes the content on screen, a screen reader user must be able to perceive the content change.** A screen reader user who selects a segment and hears nothing cannot know that the view changed.

### Keyboard and non-mouse navigation

- **The group is a single tab stop** (a place the Tab key lands). The Tab key moves focus into the segmented control and then out of the segmented control. The Tab key does not step through every segment. Do not add a tabindex to any single segment.
- **The arrow keys move the selection within the group, in the direction of the orientation.** The Left and Right arrow keys move the selection in a horizontal control. The Up and Down arrow keys move the selection in a vertical control. The Home key moves to the first segment, and the End key moves to the last segment.
- **Keep each change of selection quick and not destructive.** The arrow keys select every segment on the way to the segment the user wants. For the same reason, use a different control for a slow or destructive switch.
- **When the user tabs into the group, focus lands on the selected segment**, not on the first segment.
- **Focus and selection must look different.** Focus can be on one segment of the group while a different segment is selected. Both the focus and the selection must be visible.

## Styling set by tokens

**Never set or override the segmented control's styling.** The theme sets every visual property of the segmented control, such as size, spacing, borders and colors. Do not add extra containers or spacers to change the segmented control's look. If the design needs a look the theme does not give, raise the gap. See `recursica-skill-design-router`.

## Related skills

- `recursica-skill-selection-controls` — when a segmented control is the right control, the rules a segmented control shares with radio groups, pre-selection, and when a change is saved.
- `recursica-skill-working-memory` — the research basis for the limits on the number of options.
- `recursica-skill-system-conventions` — one behavior mode for the whole system, and never showing meaning in only one way.
- `recursica-skill-forms` — label placement and validation when the segmented control is a form field.

## Open questions

- **When to use fill width.** No rule says where a stretched segmented control is used.
- **A disabled segment.** No rule says whether a single segment may be disabled, or how a disabled segment looks. Ask only when the project has no disabled state.
- **A segmented control as a form field.** No rule says whether a segmented control may be a labeled form field instead of a view switcher. No rule says where the label goes if a segmented control may be a form field.
- **Screens narrower than desktop size.** Five short labels may not fit on a narrow screen. `recursica-skill-design-router` names behavior below desktop size as a topic with no owner.

## Pre-flight checklist

- [ ] Exactly one option can be chosen, and one option is always selected.
- [ ] The segmented control has 2 to 5 options, each with a label of one or two words.
- [ ] A choice with more than five options uses a vertical radio group or a dropdown, not tabs.
- [ ] The segmented control saves changes in the same mode as every other part of the system.
- [ ] Switching is quick, and selecting an option causes no slow reload and no destructive change.
- [ ] A screen reader announces the group as a radio group with an accessible name and one option selected.
- [ ] The selected state is available in code and is not shown by color alone, and every icon-only segment has an explicit accessible name.
- [ ] The group is one tab stop. The arrow keys move the selection, and no single segment has a tabindex.
- [ ] Focus lands on the selected segment when the user tabs in.
- [ ] A screen reader user can perceive every content change that switching causes.
- [ ] Every variant, option, and state is one the project's UI kit lists, and no variant or option is invented.
- [ ] The orientation is horizontal, and every vertical single-select is a radio group.
- [ ] No styling is set or overridden on the segmented control, and no container or spacer is added to change the segmented control's look.
- [ ] Open questions were asked about, not decided: when to use fill width, a disabled segment when the project has no disabled state, a segmented control as a labeled form field, and behavior below desktop size.
