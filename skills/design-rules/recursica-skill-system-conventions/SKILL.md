---
name: recursica-skill-system-conventions
description: Conventions that recur across all the Recursica rules, for decisions no topic skill covers — one behavior per system, the unadvertised affordance, never one channel for meaning, fixing structure not symptoms, grouping with space not boxes, one control one outcome — plus the accessibility baseline every component follows. Load this skill with the owning skill, which always wins.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# System conventions

The Recursica design rules repeat six conventions. The team stated each convention more than once, in different recordings. Each time, the statement was about a different page, panel, modal or other region that holds content. The repetition across recordings makes each of the six rules a convention, not a one-off rule.

**This skill collects rules from other skills, and was not recorded from the team.** Each convention lists the rules the convention comes from, and the skill that owns each rule. The rules in the owning skills are the authority. This skill describes the pattern that the owning skills' rules share.

**A rule about a specific page, panel, modal or other region always wins.** The owning skill can state a different rule for the page, panel, modal or other region being designed. In that case, follow the owning skill. This skill does not replace or extend the owning skill.

**This skill is mainly for a new page, panel, modal or other region.** A topic skill is a skill such as the forms skill or the tables skill. When no topic skill covers a decision, the six conventions are the house position. Apply the six conventions instead of inventing an answer or borrowing a convention from another source.

## 1. One behavioral mode per system

**When a behavior can work two reasonable ways, choose one way for the whole application.** For example, a form can save each field as the field changes, or save a batch of fields at once. Each way is a behavioral mode. When the persona cannot tell by looking which mode is active, use the same mode everywhere in the application.

Examples:

| Behavior                 | The rule                                                                 | Owner                                |
| ------------------------ | ------------------------------------------------------------------------ | ------------------------------------ |
| Saving                   | Field-level everywhere or batch everywhere, never mixed                  | `recursica-skill-forms`              |
| When a switch commits    | Immediately or on submit, but the same for every switch                  | `recursica-skill-selection-controls` |
| Inline editing in tables | Every table supports inline editing, or no table supports inline editing | `recursica-skill-tables`             |

**The convention covers more behaviors than the three examples.** The persona builds one mental model (what a person expects, based on the tools and work the person already knows) of the whole application. The persona does not build a separate mental model for each view. When modes are mixed, the persona stops trusting the mental model. The persona then cannot predict any behavior, not only the behavior on one screen.

**On a new page, panel, modal or other region, check whether the persona can see which mode is active.**

- When the persona can see the active mode on screen, a mode that varies by screen might be acceptable.
- When the persona cannot see the active mode, use one mode across the whole application.

The persona cannot see the active mode in any of the following cases:

- when a change is saved
- whether a click starts editing
- whether a change commits as soon as the persona makes the change

**When a requirement calls for a second mode, raise the conflict with the user.** Do not build the second mode in as a variation without telling anyone. See `recursica-skill-design-router`.

## 2. The unadvertised affordance

**Do not promote a feature that few personas need and that the Recursica team has an opinion against.** Keep the feature in the application. For example, sorting by more than one column starts with a long-press on a column header.

- The feature's affordance is a real entry point, such as a settings control, a gear icon or a long-press. An affordance is a visible cue that tells personas an element of the screen can be acted on.
- Add no callout, tour or banner that teaches personas about the feature.

Examples:

| Feature                                       | How the feature is offered                                                                                  | Owner                        |
| --------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------- |
| Dashboard configuration                       | A settings entry point that does not draw attention. The dashboard keeps the persona's layout across visits | `recursica-skill-dashboards` |
| Showing, hiding, and reordering table columns | A gear or settings icon on the table. The icon opens a configuration screen                                 | `recursica-skill-tables`     |
| Sorting by more than one column               | A long-press on a column header. A plain click on the header still flips the sort direction                 | `recursica-skill-tables`     |

**The convention covers more features than the three examples.** A persona who needs the feature will look for the feature, ask a colleague, or find the feature while exploring. Personas who find the feature themselves feel a sense of ownership. A persona who does not need the feature never has to deal with a control the persona will never use. See `recursica-skill-discoverability` for the research behind this convention, and for the limits of the research.

**Hide a feature behind an entry point that is not promoted only when all three conditions below are true:**

1. **The house default is a deliberate choice.** The Recursica team thought the default through, and the hidden control lets personas opt out of the default. Never hide the control in place of making the decision.
2. **Only a small minority of personas truly need the feature.**
3. **No task requires the feature.** If a persona cannot finish the work without finding the control, the control must be visible.

**A control that is not promoted MUST stay reachable by keyboard and by assistive technology.** Where the control works by a drag or a long-press, a second way to use the control MUST exist. Unadvertised does not mean inaccessible. Reordering table columns has the same requirement.

## 3. Never carry meaning in a single channel

**Show any meaning the persona must receive in at least two ways.** Each way is a channel (color, shape, position or text, each a separate signal). For example, show an object's status with an icon as well as a color. A channel can fail because of a persona's color vision, printing, a screen reader or a small viewport. When one channel fails, the meaning must not be lost with that channel.

Examples:

| Meaning                                    | Required backup                                                                                                           | Owner                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| A field's error state                      | A visual change **plus** a separate indicator: an icon, a flag, or a message                                              | `recursica-skill-forms`              |
| Which series is which in a chart           | A pattern as well as a color. The chart still works when printed in black and white                                       | `recursica-skill-data-visualization` |
| An empty value versus zero in a table cell | An explicit "NA". Not an empty cell, and not a `0` that looks like a real value                                           | `recursica-skill-tables`             |
| An object's status                         | An icon as well as a color, and an accessible name (the name a screen reader reads out for a control) as well as the icon | `recursica-skill-icon-semantics`     |

**The convention covers more meanings than the four examples.** Each of the four rules was written about an unrelated page, panel, modal or other region. All four rules guard against the same failure. A meaning shown in only one channel is lost when that channel fails. The color palette belongs to the design system. The agent or the user designing the screen chooses which channels show each meaning.

**On a new page, panel, modal or other region, name the channel each meaning depends on now.** For example, a status shown only as a colored dot depends on color. Then picture a persona who cannot perceive that channel, and check what the persona would see. If the persona would see nothing, add a second channel.

## 4. Fix the structure, do not engineer around the symptom

**When a design runs out of room or stops being clear, change the structure of the design. Do not add a workaround.** For example, when a table is too wide, show fewer columns or a drill-down instead of horizontal scrolling. In both cases, the structure of the design is wrong. The Recursica skills repeat the belief in fixing the structure more often than any other belief.

Examples:

| Symptom                                        | The house response                                                                                                      | Owner                                |
| ---------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------ |
| Too many navigation items for the space        | Change the design. Switch to vertical navigation, or shorten the labels. Never wrap, scroll, or overflow the navigation | `recursica-skill-navigation`         |
| A table too wide for the screen                | Fewer columns, a drill-down, or stacked text in the table cells. Horizontal scrolling means the table design failed     | `recursica-skill-tables`             |
| A form spread across tabs                      | Use a stepper. Tabs that hold forms are an invalid structure                                                            | `recursica-skill-navigation`         |
| A need for select-all across twenty checkboxes | Reconsider the choice of control before adding select-all                                                               | `recursica-skill-selection-controls` |
| A chart with a large amount of missing data    | Do not visualize the data                                                                                               | `recursica-skill-data-visualization` |
| No one can say what matters on the dashboard   | Do not build a dashboard                                                                                                | `recursica-skill-dashboards`         |

**The convention covers more symptoms than the six examples.** A workaround keeps the broken structure and adds a new part on top. Overflow menus, scroll areas inside the page, and density toggles all look like solutions. A density toggle is a switch for how tightly content is packed together. Each workaround makes the broken structure permanent.

**On a new page, panel, modal or other region, stop before any addition whose purpose is to make content fit.** For example, stop before adding an overflow menu or a scroll area inside the page.

- Name the change that would let the content fit without the addition.
- Propose that change instead.
- If a limit comes from outside the design and cannot be moved, state the limit plainly. A client requirement and an amount of data that cannot be reduced are two such limits.
- Do not let the workaround pass as a design choice.

## 5. Group with space, not boxes

**By default, show grouping with space. Draw a card, a box or a bordered region only to separate repeated peers (objects of the same kind, such as rows in a list) from each other.** For example, a small set of product cards, each with an image, separates one product from the next. A group of content does not always need a visible container.

Examples:

| Situation                                                                                            | The house response                                                                                                                                                                                                     | Owner                                            |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| A region of a screen that needs to look like one unit                                                | White space and type hierarchy. No box                                                                                                                                                                                 | `recursica-skill-card`                           |
| A small, finite set of repeating objects, each with a chart or an image                              | A card for each object. Only a small, finite set with a chart or an image on each object justifies a boundary                                                                                                          | `recursica-skill-card`                           |
| High plurality (a large number of items of the same kind), or repeating objects that are purely data | A table, not cards. High plurality has no exception. Repeating objects that are purely data may occasionally be cards chosen for looks, and the design states the choice. The choice is called the aesthetic exception | `recursica-skill-tables`, `recursica-skill-card` |
| A dashboard layout                                                                                   | A fixed layout that uses type hierarchy and white space, with cards placed inside the layout. Never a screen made of cards                                                                                             | `recursica-skill-dashboards`                     |
| Spacing between form fields and between form sections                                                | The form components include the spacing. Do not add wrappers or spacer elements                                                                                                                                        | `recursica-skill-forms`                          |
| A form, a form section, or a single form control                                                     | **Never inside a card**, with no exception. Group with headings and the spacing built into the components                                                                                                              | `recursica-skill-forms`, `recursica-skill-card`  |
| A region that needs a separate background but has no peers                                           | A layer (a numbered background level, 0 to 3, that sets the colors of the components on that level), at the shallowest level that works. Never a card, and never hand-written styles                                   | `recursica-skill-layers`                         |

**The convention covers more situations than the seven examples.** A border tells the persona two facts:

- The content inside the border belongs together.
- The content inside the border is _separate from similar items beside the border._

With no similar items beside the border, the border is decoration and tells the persona nothing. A decorative border takes up padding and width, and uses up a level of hierarchy. Boxes inside boxes on a generated screen are the most common sign of decorative borders.

**Before drawing a container on a new page, panel, modal or other region, name the container's peer.** The peer is the item that the container separates the content from. For example, the peer of one product card is the next product card. If the container has no peer, remove the container and use spacing instead.

## 6. One control, one outcome

**Give each interaction one outcome.** For example, a KPI tile that opens the Orders page _and_ filters the orders has two outcomes. A control that navigates _and_ does a second action is hyperloaded (doing more than one action at once). A hyperloaded control must be split. The second action can be:

- opening a page, panel, modal or other region
- applying a filter
- changing a mode
- switching a tab

Examples:

| The control                                          | What the control must not also do                                                                         | Owner                                                            |
| ---------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| A row action that opens the row's details            | Change the tab or the route as well as opening the details. Open the details where the persona already is | `recursica-skill-buttons-links`, `recursica-skill-panels-modals` |
| A figure or a summary that points to a filtered list | Navigate and apply a filter in one click. Choose one of the two                                           | `recursica-skill-navigation`, `recursica-skill-filters`          |
| A button that opens a modal                          | Navigate. The button opens the modal and does not also move the persona                                   | `recursica-skill-buttons-links`                                  |

**The convention covers more controls than the three examples.** A hyperloaded control causes three separate problems, and the problems add up:

- The persona cannot predict the control's result, because the label can honestly describe only one of the two actions.
- The persona cannot undo the control's actions, because going back reverses one action and leaves the other action in place.
- The persona cannot describe to a colleague what happened. Not being able to describe what happened makes an application feel impossible to learn, not merely awkward.

**On a new page, panel, modal or other region, list every change of state one use of a control causes.** A change of state can be a change to:

- the route
- an opened page, panel, modal or other region
- a filter
- a selection
- a mode
- the scroll position

If one use of the control causes more than one change of state, the control is hyperloaded. Fix a hyperloaded control in one of two ways:

- Split the control into two controls.
- Make the second change of state a change the persona clearly asked for, not a change bundled in.

**A single action with necessary side effects is still one outcome, and convention 6 allows the action.** For example, submitting a form saves the form and closes the form. Deleting a row removes the row and shows an undo option. Check whether the second effect is _part of_ the persona's request or a separate effect added to the request.

## Accessibility baseline for every component

**Every component follows the accessibility baseline below, and no component skill repeats the baseline.** The baseline is not a seventh convention. The baseline rules used to be copied into each component skill. The focus ring rule was in 34 of 39 component skills. Stating the baseline once means no two copies can differ. A component skill's accessibility section adds the rules for that component. Where the component skill's rule is more specific than the baseline, the component skill's rule wins.

- **Never hide the focus ring.** Keep the focus ring on every element that has focus. The focus ring must look different from each of the following:

  - the hover style
  - the caret alone
  - any selected, checked, active or on state

  Focus and selection are different facts. A persona must be able to tell focus from selection at a glance.

- **Never show an element the persona needs only on hover.** The rule covers every control, action, label, value and count. A persona using a keyboard and a persona using touch never hover.
- **Make the tab order follow the visual order.**
- **Set a form control's help text, error text and rule text on the control's component.** For a group, such as a checkbox group, set the text on the group component. Never place the text as a separate element beside the control. Only the component can connect the text to the control. Text that is not connected is invisible to a persona who tabs straight into the field.
- **Set the required state in code. Never show the required state with an asterisk alone.** An asterisk is a visual convention, not an accessible way of saying "required".
- **Never move focus for the persona**, except where a component skill says when to move focus. For example, moving focus when a modal opens is one such exception.
- **An icon that is a control has an accessible name. A decorative icon is hidden from screen readers.** Each component skill says which of the component's icons are controls and which are decorative.
- **Never show meaning by color alone.** See convention 3.

## A seventh convention

**Do not add a seventh convention.** A pattern can seem to repeat across pages, panels, modals or other regions without being listed in this skill. In that case, raise the pattern with the user. The user decides whether the pattern is a convention. A later reader cannot tell a convention an agent invented from a convention the team recorded. This skill exists to prevent that confusion.

## Out of scope

- **Every decision a topic skill covers.** Load the topic skill. The topic skill's rule wins.
- **The research behind the six conventions.** `recursica-skill-discoverability` and `recursica-skill-working-memory` hold the citations.
- **The order of decisions, and which rule wins in a conflict.** `recursica-skill-design-router` owns both.

## Pre-flight checklist

- [ ] Each behavior works one way across the whole application. A requirement for a second way was raised with the user and was not built.
- [ ] Every setting that few personas need has a real entry point that is not promoted. All three conditions for hiding the setting hold. The house default is a deliberate choice. Only a minority of personas need the setting. No task requires the setting.
- [ ] Every hidden control can be reached by keyboard and by assistive technology. Where a hidden control works by a drag or a long-press, a second way to use the control exists. The second way is not a drag.
- [ ] No meaning relies on one channel alone. Each meaning has a second channel.
- [ ] Every component meets the accessibility baseline. The focus ring is never hidden, and looks different from hover and from any selected state.
- [ ] Nothing the persona needs appears only on hover, and the tab order follows the visual order.
- [ ] A form control's help text, error text and rule text are set on the control's component. The required state is set in code, not by an asterisk alone.
- [ ] Focus is never moved for the persona except where a component skill says when to move focus. Icons that are controls have an accessible name, and decorative icons are hidden from screen readers.
- [ ] No workaround, such as an overflow menu or a scroll area inside the page, hides a broken structure. Where a limit cannot be changed, a reason is provided.
- [ ] Every visible container separates the container's content from a peer. A region with no peer is grouped with space.
- [ ] Repeating objects are shown in a table, with two exceptions. The first exception is a small, finite set where each object has a graphic. The second exception is the aesthetic exception, used with a reason provided.
- [ ] No form, form section, or form control sits inside a card.
- [ ] Where a topic skill covers a decision, the topic skill's rule is followed, not the general convention in this skill.
- [ ] No control both navigates and does a second action. One use of each control causes one change of state.
- [ ] No new convention that repeats across pages, panels, modals or other regions was added without the user's decision.
