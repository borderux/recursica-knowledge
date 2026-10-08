---
name: recursica-skill-loader
description: Rules for the Recursica loader, a spinner — when a wait needs a loader, sizes, the text that must go with the loader, and announcing the start and end of a wait. Use for loading states, regions still loading, and actions still running. Not for the result of the wait — see recursica-skill-toast.
license: MIT
metadata:
  author: hi@borderux.com
  version: 0.1.0
---

# Loader

A loader shows that work is still in progress. A loader cannot show how much of the work is done, or how much time is left.

## When to use a loader

- The user waits for an operation of unknown length, such as loading data, a submit action, or a recalculation.
- One region is still loading on a page that has otherwise loaded. A spinner is most useful for a single region that is still loading. Show the content that has arrived, and put a spinner in each region that is still loading, instead of hiding the whole page until every region loads. The most common example is a dashboard whose widgets load at different speeds.
- The wait is long enough for the user to notice. Show a loading indicator when the operation will take more than about 3 seconds. `recursica-skill-feedback-messaging` sets the 3-second threshold. For a shorter wait, a spinner flashes on and off and looks like a glitch.
- One region is loading, such as a card, a panel, or a modal, and the loader can cover only that region instead of the whole screen.

## When not to use a loader

| Situation                                              | Use instead                                                                                                                                                                                                   |
| ------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The amount of work or the percentage done is known     | If the project has a determinate variant (one that shows how much is done), use the determinate variant. Otherwise, use nothing instead. Raise the need for a progress indicator, and see the open questions. |
| The operation finishes in well under a second          | Show no loading indicator. A spinner that flashes on and off distracts the user more than the wait does.                                                                                                      |
| The wait is over, and the screen must state the result | Text in the place where the result appears, or a toast for a global result. See `recursica-skill-toast`.                                                                                                      |
| No data exists, and no data ever existed               | An empty state that is filled in, not left blank, and never an empty state on a dashboard. See `recursica-skill-dashboards`.                                                                                  |
| A skeleton screen shown before the content             | **Nothing. Skeleton screens and ghost text are forbidden outright.** See "Variants" below.                                                                                                                    |
| The operation failed                                   | An error message. Stop the spinner and say what happened.                                                                                                                                                     |

**A loader is not an empty state, and not an error state.** A spinner that keeps turning after a request failed tells the user the system is still trying, when the system has stopped trying.

## Variants

**Use only the loader variants and options that the Recursica MCP server lists for the project.** A designer can add variants and options in Theme Forge, so each project can differ. Get the list with the server's `recursica_get_component_doc` tool, and use the names the code uses. Never invent a variant, an option, a type, or a state.

The rules below describe each option by role, such as "the largest size". The names in the standard UI kit (the unchanged UI kit in the official Recursica release) are examples only.

- **In the standard UI kit, a loader is an indeterminate spinner.** An indeterminate spinner shows that work is happening, but not how much of the work is done. The indeterminate spinner is the most important fact about the loader.
- **In the standard UI kit, a loader has three sizes, called `small`, `default`, and `large`.** Write the size names from the UI kit (the token file, `recursica_ui-kit.json`, that says which variants and states each component has). The UI kit's size names are also names the code uses. Each of the two adapters (the Recursica component library for one framework, such as Mantine or Angular Material) also accepts `sm`, `md`, and `lg` as other names for the three sizes. `sm`, `md`, and `lg` work today, but the design system is specified in the UI kit's names. Only the design-system website shows sizes named xs, sm, and md.
- **If the project has a determinate variant, use the determinate variant to show progress.** Otherwise, a loader cannot show how far along the work is. Do not show progress in any other form, such as "45%". A spinner cannot show how long the work will take. Do not show an estimated time left. Raise the need for a progress indicator, and see the open questions.
- **If the project has a slot for a label or text, use the project's label slot.** Otherwise, place the text that goes with the spinner as a separate element.
- **Never use a skeleton screen.** Skeleton screens are forbidden outright, even when the project lists a skeleton screen. A skeleton screen shows gray placeholder shapes where content will appear. A skeleton screen is also called a skeleton loader or ghost elements. A skeleton screen is a loading indicator, like a spinner. Users have to work out what the gray shapes are, and the gray shapes tell the user nothing about the content. `recursica-skill-screen-scaffolding` sets the rule: a loading page shows nothing until the page shows content.
- **If the project has a shimmer variant, a progress bar variant or a type variant for the loader, use the project's loader variant.** A loader variant is not a separate progress component.
- **Both adapters offer three loader types: Oval, Bars, and Dots.** Each adapter has a type setting for the three types, and each adapter styles each type. All three types are available. Get the name of the type setting in code from the Recursica MCP server. A type's look comes from the adapter, not the UI kit, and the look may differ between the two adapters. Oval is the default type in both adapters. Use the default type unless a reason calls for a different type. Do not use the choice of type to signal any meaning.
- **Only the design-system website shows a track for total progress and an indicator for the percentage done.** See the open questions.

## Rules

**Always show text with the loader, and make the text say what is happening.** Write "Loading invoices", not "Loading". If the project has no label slot, place the text beside the loader or below the loader. The text tells the user what the wait is for. The spinner only shows that a wait is underway.

**Show the loader only over the region that is loading.** Do not cover the whole screen while one card loads. Use a loader across the whole screen only for a wait that affects the whole screen.

**Do not show a loader for a wait under about 3 seconds.** Delay the loader, or leave the loader out. A spinner that appears and disappears at once distracts the user. The spinner also makes a fast operation feel slower than the operation was. `recursica-skill-feedback-messaging` sets the 3-second threshold. An earlier version of this skill gave 300ms. The 300ms figure was never a recorded house rule, and the 300ms figure has been corrected.

**Never let the spinning motion be the only signal.** `recursica-skill-system-conventions` forbids showing meaning in a single channel (color, shape, position or text, each a separate signal). Animation is the channel the user loses most easily. A screen reader cannot report the animation, the animation disappears when motion is reduced, and a screenshot cannot show the animation. The text with the loader is the second channel.

**Follow the operating system's reduced-motion setting** (a setting that asks for less animation). When motion is reduced or removed, the text with the loader and the screen reader announcement must still tell the user about the wait, without the animation.

**Keep the space the content will fill.** A loader smaller than the content the loader stands in for makes the layout jump when the content arrives. The user then loses the reading position in the text.

**Show one loader per loading region.** Do not nest loaders or stack loaders. Do not show a loader for a region inside a loader for the page.

**Do not leave a control usable behind a loader.** While a submit action is running, the control that started the submit action must not accept a second click.

**Do not use a spinner to suggest that the data updates live.** When a dashboard's components refresh on different schedules, `recursica-skill-dashboards` requires text that says how up to date each component's data is.

## Accessibility

The rules below add to the accessibility baseline in `recursica-skill-system-conventions`, including the focus ring, which every Recursica component follows.

A screen reader user does not know a spinner is on the page unless the app announces the spinner, because a spinner is only animation. The most common failure is a wait that starts and ends with no announcement, not a control the user cannot reach. The screen reader user then never learns that a wait started or ended.

### Screen readers

- **Announce that loading has started, and announce that the content has arrived.** Both announcements are required. Apps most often skip the announcement that the content has arrived. When a spinner appears and disappears with no announcement, the user never learns there was a wait or a result.
- **Say what is loading, and what arrived.** Announce "Loading invoices", then "24 invoices loaded". Do not announce only "Loading" or "Loader".
- **The announcement must be polite, never assertive.** A polite announcement waits for a pause instead of interrupting. The user does not need to know at once that a wait started or finished. The announcement must not interrupt what the user is reading or typing. See `recursica-skill-live-regions`.
- **The live region (an area of the page that a screen reader announces automatically when the area's content changes) that makes the announcement must already be on the page before the loader appears.** A screen reader often never announces a live region that is added at the same moment as the live region's message.
- **Never announce progress that is not known.** Without a determinate variant, the app has no percentage, no step count, and no time estimate to report. Do not make up a percentage, a step count, or a time estimate.
- **The spinning motion tells assistive technology nothing.** The motion is a single visual channel. `recursica-skill-system-conventions` requires a second channel, which for a loader is the text and the announcement.
- **Do not announce every check, retry, or refresh.** A region that reloads on a schedule must not announce each reload. Announce only the changes the user needs to know about.
- **If a load fails, announce the failure.** A spinner that disappears with no message sounds like success.

### Keyboard and non-mouse navigation

- **Never put focus on a loader.** A loader is not a control. Give the loader no `tabindex`, no click action, and no code that moves focus to the loader. When an element with focus disappears, the user's place on the page is lost.
- **Never leave focus on a control that has disappeared behind the loader.** When the control the user activated is removed or covered, focus falls to the page body, and the user's place on the page is lost entirely. Before the control is removed or covered, move focus to an element that stays on the page.
- **When a region's content is replaced, keep the user's place.** When the content arrives, if focus was inside the region, move focus to the region's heading or to the first element in the region that the user can interact with. Never move focus to the top of the page.
- **Do not trap the keyboard behind a loader.** Content under the loader, and content that has not arrived yet, must not stay behind the spinner as tab stops (places the Tab key lands) that the user can neither see nor hear.
- **Never show content the user needs only on hover.** Above all, the text that says what is loading must stay visible.

## Styling set by tokens

**Never set or override the loader's styling.** The theme sets every visual property of the loader, such as size, spacing, borders, colors and animation. Do not add extra containers or spacers to change the loader's look. If the design needs a look the theme does not give, report the missing look as a gap in the design system. See `recursica-skill-design-router`.

**Never change the spinner's animation.** The theme sets the spinner's animation.

## Related skills

- `recursica-skill-system-conventions` — never showing meaning in a single channel, and one behavioral mode per system.
- `recursica-skill-dashboards` — text that says how up to date each component's data is when components refresh on different schedules, and the ban on shipping an empty dashboard.
- `recursica-skill-tables` — lists loading and error states for a table, including partial failure, as a topic no skill owns.
- `recursica-skill-buttons-links` — lists a pending state on an action other than submit as a topic no skill owns.
- `recursica-skill-live-regions` — announcing that loading started and finished, and what the app must cover beyond the loader's own announcement.

### Only if used on the same screen

- `recursica-skill-toast` — stating the result once the wait is over.

## Open questions

- **Showing progress.** A person must decide how a wait of known length shows progress. Do not assemble a progress indicator from other parts, and do not name a separate progress component as if the project had a progress component. If progress must be shown, ask instead of building a progress indicator. Ask only when the project has no determinate variant.
- **Whether the loader may have a label.** Without a label slot, the app places the text beside the loader. No rule says where the text goes relative to the spinner. Ask only when the project has no label slot.
- **Whether the three adapter loader types are approved.** Oval, Bars, and Dots are the three values of a type setting in both adapters. The question covers how each type looks and when to use each type. Only the design-system website shows a progress track. Ask before relying on a type other than the default. Ask only when the project has no type variant.
- **When a spinner for the whole page is called for, instead of an empty page.** The threshold for showing a loader is about three seconds. The clearest case for a spinner is one region still loading on a page that has otherwise loaded. No rule says where a region ends and the whole page begins.
- **Loading and error states for a table**, including partial failure. `recursica-skill-tables` lists loading and error states for a table as a topic no skill owns.
- **A pending state on an action other than submit.** `recursica-skill-buttons-links` lists the pending state as a topic no skill owns.
- **Whether the loader itself is delayed.** The 3-second threshold decides whether a wait needs a loader at all. No rule says whether the spinner also waits 3 seconds before appearing, or appears at once for an operation expected to take longer.
- **Which size to use in which region that holds content**, such as a page, a panel, or a modal, and whether a wait across the whole screen uses the largest size, `large` in the standard UI kit, or a different choice entirely.

## Pre-flight checklist

- [ ] The user waits for an operation of unknown length that takes longer than about 3 seconds. No shorter wait shows a loader.
- [ ] The loader covers only the region that is loading, and the region has only one loader.
- [ ] Text beside the loader says what is happening, and names what is loading.
- [ ] The app claims no time estimate. The app claims no progress or percentage, unless the project's determinate variant shows the progress.
- [ ] The spinning motion is not the only signal, and the screen respects the reduced-motion setting.
- [ ] The loader keeps the space the content will fill, so the layout does not jump when the content arrives.
- [ ] The start and the end of loading are both announced, politely, from a live region that was on the page before the loader appeared.
- [ ] A failure stops the spinner and is announced as a failure, not left silent.
- [ ] Checks and retries are not announced on every cycle.
- [ ] Focus is never put on the loader, and never left on a control that disappeared behind the loader.
- [ ] After a region's content is replaced, focus lands in the new content, not at the top of the page.
- [ ] Content under the loader, and content that has not arrived, is not left as hidden tab stops.
- [ ] The text that says what is loading does not appear only on hover, and the focus ring on the controls around the loader is intact.
- [ ] Every loader size is one the project's UI kit lists, such as `small`, `default`, or `large` in the standard UI kit. No type, label, track, skeleton screen, or determinate variant is invented.
- [ ] No styling is set or overridden on the loader, and no container or spacer is added to change the loader's look.
- [ ] The spinner's animation is not changed.
- [ ] Open questions were asked about, not decided: showing progress, a label on the loader, the three adapter loader types, a spinner for the whole page, loading and error states for a table, a pending state on an action other than submit, delaying the loader, and which size to use in which region that holds content.
