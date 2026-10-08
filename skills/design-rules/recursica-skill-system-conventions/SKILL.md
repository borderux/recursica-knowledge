---
name: recursica-skill-system-conventions
description: Conventions that recur across all the Recursica rules, for decisions no topic skill covers — one behavior per system, the unadvertised affordance, never one channel for meaning, fixing structure not symptoms, grouping with space not boxes, one control one outcome — plus the accessibility baseline every component follows. Load this skill with the owning skill, which always wins.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# System conventions

The Recursica design rules repeat six conventions. Each convention was stated more than once, each time about a different page, panel, modal or other region that holds content, and in a different recording. The repetition across recordings makes each of the six rules a convention, not a one-off rule.

**This skill is drawn from other skills, not recorded from the team.** Each convention below lists the rules the convention comes from, and the skill that owns each rule. The rules in those skills are the authority. This skill describes the pattern that those rules share.

**Follow two rules when using this skill:**

1. **A rule about a specific page, panel, modal or other region always wins.** When the owning skill states a different rule for the page, panel, modal or other region being designed, follow the owning skill. This skill does not replace or extend the owning skill.
2. **This skill is mainly for a new page, panel, modal or other region.** When no topic skill, such as the forms skill or the tables skill, covers a decision, the six conventions are the house position. Apply the six conventions instead of inventing an answer or borrowing a convention from another source.

## 1. One behavioral mode per system

**Choose a behavioral mode once for the whole application, not screen by screen.** Some behaviors can work in two reasonable ways, such as saving each field or saving a batch of fields. A behavioral mode is one of those two ways. When the persona cannot tell by looking which mode is active, the application picks one mode and uses the same mode everywhere.

Examples:

| Behavior                 | The rule                                                                 | Owner                                |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------ |
| Saving                   | Field-level everywhere or batch everywhere, never mixed                  | `recursica-skill-forms`              |
| When a switch commits    | Immediately or on submit, but the same for every switch                  | `recursica-skill-selection-controls` |
| Inline editing in tables | Every table supports inline editing, or no table supports inline editing | `recursica-skill-tables`             |

**The convention applies generally because the persona builds one mental model** (what a person expects, based on the tools and work the person already knows) of the whole application, not a separate mental model for each view. Mixed modes do more than make the mental model a little less accurate on one screen. Mixed modes take away the persona's ability to predict any behavior, because the persona can no longer trust the mental model.

**On a new page, panel, modal or other region, ask whether the persona can see on screen which mode is active.** If the persona can see which mode is active, letting the mode vary by screen might be acceptable. If the persona cannot see the mode, the whole application uses one mode. The persona cannot see when a change is saved, whether a click starts editing, or whether a change commits as soon as the persona makes the change.

**When a requirement calls for a second mode, raise the conflict with the user.** Do not build the second mode in as a variation without telling anyone. See `recursica-skill-design-router`.

## 2. The unadvertised affordance

**A feature that few personas need, and that the Recursica team has an opinion against, is present but not promoted.** An affordance is a visible cue that tells personas an element of the screen can be acted on. For a feature that is present but not promoted, the affordance is a real entry point, such as a settings control, a gear icon or a long-press. No callout, tour or banner teaches people about the feature.

Examples:

| Feature                                       | How the feature is offered                                                                                  | Owner                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Dashboard configuration                       | A settings entry point that does not draw attention. The dashboard keeps the persona's layout across visits | `recursica-skill-dashboards` |
| Showing, hiding, and reordering table columns | A gear or settings icon on the table. The icon opens a configuration screen                                 | `recursica-skill-tables`     |
| Sorting by more than one column               | A long-press on a column header. A plain click on the header still flips the sort direction                 | `recursica-skill-tables`     |

**The convention applies generally because a persona who needs the feature will look for the feature, ask a colleague, or find the feature while exploring.** Personas who find the feature themselves feel a sense of ownership. Personas who do not need the feature never have to deal with a control that they will never use. See `recursica-skill-discoverability` for the research behind this convention, and for the limits of the research.

**Hide a feature this way only when all three conditions below are true:**

1. **The house default is a deliberate choice.** The hidden control lets personas opt out of a decision that the Recursica team thought through. Hiding the control never replaces making the decision.
2. **Only a small minority of personas truly need the feature.**
3. **No task requires the feature.** If a persona cannot finish the work without finding the control, the control must be visible.

**An unadvertised control MUST stay reachable by keyboard and by assistive technology.** Unadvertised does not mean inaccessible. Where the control works by a drag or a long-press, a second way to use the control MUST exist. Reordering table columns has the same requirement.

## 3. Never carry meaning in a single channel

**Show any meaning the persona must receive in at least two ways.** Each way is a channel (color, shape, position or text, each a separate signal). A channel can fail because of a persona's color vision, printing, a screen reader or a small viewport. When one channel fails, the meaning must not be lost with the channel.

Examples:

| Meaning                                    | Required backup                                                                                                           | Owner                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| A field's error state                      | A visual change **plus** a separate indicator: an icon, a flag, or a message                                              | `recursica-skill-forms`              |
| Which series is which in a chart           | A pattern as well as a color. The chart still works when printed in black and white                                       | `recursica-skill-data-visualization` |
| An empty value versus zero in a table cell | An explicit "NA". Not an empty cell, and not a `0` that looks like a real value                                           | `recursica-skill-tables`             |
| An object's status                         | An icon as well as a color, and an accessible name (the name a screen reader reads out for a control) as well as the icon | `recursica-skill-icon-semantics`     |

**The convention applies generally because the rules above guard against the same failure.** Each rule was written about an unrelated page, panel, modal or other region. When a meaning is shown in only one channel and that channel fails, the persona loses the meaning. The color palette belongs to the design system. The screen designer decides which channels show the meaning.

**On a new page, panel, modal or other region, name the channel that the meaning depends on now.** Then ask what a persona who cannot perceive that channel would see. If the persona would see nothing, add a second channel.

## 4. Fix the structure, do not engineer around the symptom

**When a design has no room left, or stops being clear, the structure of the design is wrong. Change the structure instead of adding a workaround.** Fixing the structure is the belief the Recursica skills repeat most often.

Examples:

| Symptom                                        | The house response                                                                                                      | Owner                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Too many navigation items for the space        | Change the design. Switch to vertical navigation, or shorten the labels. Never wrap, scroll, or overflow the navigation | `recursica-skill-navigation`         |
| A table too wide for the screen                | Fewer columns, a drill-down, or stacked text in the table cells. Horizontal scrolling means the table design failed     | `recursica-skill-tables`             |
| A form spread across tabs                      | Use a stepper. Tabs holding forms is an invalid structure                                                               | `recursica-skill-navigation`         |
| A need for select-all across twenty checkboxes | Reconsider the choice of control before adding select-all                                                               | `recursica-skill-selection-controls` |
| A chart with a large amount of missing data    | Do not visualize the data                                                                                               | `recursica-skill-data-visualization` |
| No one can say what matters on the dashboard   | Do not build a dashboard                                                                                                | `recursica-skill-dashboards`         |

**The convention applies generally because a workaround keeps the broken structure and adds to the structure.** Overflow menus, scroll areas inside the page, and density toggles (switches for how tightly content is packed together) all look like solutions. Each workaround makes the broken structure permanent.

**On a new page, panel, modal or other region, stop before any addition whose purpose is to make content fit.** Name what would have to change for the content to fit without the addition, and propose that change instead. When a limit comes from outside the design and cannot be moved, say so plainly. A client requirement and an amount of data that cannot be reduced are two such limits. Do not let the workaround pass as a design choice.

## 5. Group with space, not boxes

**By default, show grouping with space. Use a drawn boundary, meaning a card, a box or a bordered region, only to separate repeated peers (objects of the same kind, such as rows in a list) from each other.** Not every container needs to be visible.

Examples:

| Situation                                                                                            | The house response                                                                                                                                                                                                     | Owner                                            |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A region of a screen that needs to look like one unit                                                | White space and type hierarchy. No box                                                                                                                                                                                 | `recursica-skill-card`                           |
| A small, finite set of repeating objects, each with a chart or an image                              | A card for each object. A small, finite set with a chart or an image on each object is the one case where a boundary is justified                                                                                      | `recursica-skill-card`                           |
| High plurality (a large number of items of the same kind), or repeating objects that are purely data | A table, not cards. High plurality has no exception. Repeating objects that are purely data may occasionally be cards chosen for looks, and the design states the choice. The choice is called the aesthetic exception | `recursica-skill-tables`, `recursica-skill-card` |
| A dashboard layout                                                                                   | A fixed layout that uses type hierarchy and white space, with cards placed inside the layout. Never a screen made of cards                                                                                             | `recursica-skill-dashboards`                     |
| Spacing between form fields and between form sections                                                | The form components include the spacing. Do not add wrappers or spacer elements                                                                                                                                        | `recursica-skill-forms`                          |
| A form, a form section, or a single form control                                                     | **Never inside a card**, with no exception. Group with headings and the spacing built into the components                                                                                                              | `recursica-skill-forms`, `recursica-skill-card`  |
| A region that needs a separate background but has no peers                                           | A layer (a numbered background level, 0 to 3, that sets the colors of the components on that level), at the shallowest level that works. Never a card, and never hand-written styles                                   | `recursica-skill-layers`                         |

**The convention applies generally because a border tells the persona two facts.** A border says that the content inside the border belongs together _and is separate from similar items beside the border._ With no similar items beside the border, the border is decoration and tells the persona nothing. A decorative border takes up padding and width, and uses up a level of hierarchy. Boxes inside boxes on a generated screen are the most common sign of decorative borders.

**On a new page, panel, modal or other region, name the peer that a container separates the content from, before drawing the container.** If the container has no peer, remove the container and use spacing instead.

## 6. One control, one outcome

**One interaction has one outcome.** A control that navigates _and_ does a second action is hyperloaded (doing more than one action at once), and a hyperloaded control must be split. The second action can be opening a page, panel, modal or other region, applying a filter, changing a mode, or switching a tab.

Examples:

| The control                                          | What the control must not also do                                                                         | Owner                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A row action that opens the row's details            | Change the tab or the route as well as opening the details. Open the details where the persona already is | `recursica-skill-buttons-links`, `recursica-skill-panels-modals` |
| A figure or a summary that points to a filtered list | Navigate and apply a filter in one click. Choose one of the two                                           | `recursica-skill-navigation`, `recursica-skill-filters`          |
| A button that opens a modal                          | Navigate. The button opens the modal and does not also move the persona                                   | `recursica-skill-buttons-links`                                  |

**The convention applies generally because a hyperloaded control causes three separate problems, and the problems add up.** The persona cannot predict what the control will do, because the control's label can honestly describe only one of the two actions. The persona cannot undo the control's actions, because going back reverses one action and leaves the other action in place. The persona cannot describe to a colleague what happened. Not being able to describe what happened makes an application feel impossible to learn, not merely awkward.

**On a new page, panel, modal or other region, list every change of state that one use of the control causes.** A change of state can be the route, an opened page, panel, modal or other region, a filter, a selection, a mode or the scroll position. If one use of the control causes more than one change of state, the control is hyperloaded. Either split the control into two controls, or make the second change of state one the persona clearly asked for, not one bundled in.

**Convention 6 allows a single action with necessary side effects.** A single action with necessary side effects is still one outcome. Submitting a form saves the form and closes the form. Deleting a row removes the row and shows an undo option. The test is whether the second effect is _part of_ what the persona asked for, or a separate effect added to the request.

## Accessibility baseline for every component

**The accessibility baseline below applies to every component, and no component skill repeats the baseline.** The accessibility baseline is not a seventh convention. Each component skill used to state the baseline rules separately. The focus ring rule, for example, was in 34 of 39 component skills. This skill states the baseline rules once, so no two copies can differ. The accessibility section of a component skill adds the rules specific to that component. Where the component skill's rule is more specific than the baseline, the component skill's rule wins.

- **Never hide the focus ring.** Keep the focus ring on every element that has focus. Keep the focus ring looking different from the hover style, from the caret alone, and from any selected, checked, active or on state. Focus and selection are different facts, and a persona must be able to tell focus and selection apart at a glance.
- **Nothing the persona needs appears only on hover.** The rule covers every control, action, label, value and count. A persona using a keyboard and a persona using touch never hover.
- **The tab order follows the visual order.**
- **A form control's help text, error text and rule text pass through the component.** For a group, the text passes through the group component. The text never appears as a separate element placed beside the control. Only the component can connect the text to the control. Text that is not connected is invisible to a persona who tabs straight into the field.
- **Set the required state in code. Never show the required state with an asterisk alone.** An asterisk is a visual convention, not an accessible way of saying "required".
- **Never move focus for the persona**, except where a component skill says when to move focus, such as when a modal opens.
- **An icon that is a control has an accessible name. A decorative icon is silent.** Each component skill says which icons of the component are controls and which icons are decorative.
- **No meaning is shown by color alone.** See convention 3.

## A seventh convention

**Do not add a seventh convention.** When a pattern seems to repeat across pages, panels, modals or other regions but is not listed in this skill, say so, and let a person decide whether the pattern is a convention. A later reader cannot tell a convention that an agent invented from a recorded convention. This skill exists to prevent that confusion.

## Out of scope

- **Every decision a topic skill covers.** Load the topic skill. The topic skill's rule wins.
- **The research behind the six conventions.** `recursica-skill-discoverability` and `recursica-skill-working-memory` hold the citations.
- **The order of decisions, and which rule wins in a conflict.** `recursica-skill-design-router` owns both.

## Pre-flight checklist

- [ ] Each behavior works one way across the whole application. A requirement for a second way went to the user and was not built.
- [ ] Every setting that few personas need has a real entry point that is not promoted. All three conditions for hiding the setting hold: the house default is a deliberate choice, only a minority of personas need the setting, and no task requires the setting.
- [ ] Every hidden control can be reached by keyboard and by assistive technology. Where a hidden control works by a drag or a long-press, a second way to use the control exists, and the second way is not a drag.
- [ ] No meaning relies on one channel alone. Each meaning has a second channel.
- [ ] Every component meets the accessibility baseline: the focus ring is never hidden and looks different from hover and from any selected state, nothing the persona needs appears only on hover, and the tab order follows the visual order.
- [ ] A form control's help text, error text and rule text pass through the component, and the required state is set in code, not by an asterisk alone.
- [ ] Focus is never moved for the persona except where a component skill says when to move focus. Icons that are controls have an accessible name, and decorative icons are silent.
- [ ] No workaround, such as an overflow menu or a scroll area inside the page, hides a broken structure. Where a limit cannot be changed, a reason is provided.
- [ ] Every visible container separates the container's content from a peer. A region with no peer is grouped with space.
- [ ] Repeating objects are shown in a table, unless the repeating objects are a small, finite set and each object has a graphic, or the aesthetic exception is used and a reason is provided.
- [ ] No form, form section, or form control sits inside a card.
- [ ] Where a topic skill covers a decision, the topic skill's rule is followed, not the general convention in this skill.
- [ ] No control both navigates and does a second action. One use of each control causes one change of state.
- [ ] No new convention that repeats across pages, panels, modals or other regions was added without a person's decision.
