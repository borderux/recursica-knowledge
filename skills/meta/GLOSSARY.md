# Glossary

The official wording for the design and accessibility terms the skills define.

**This file is not a skill, and agents are not sent here.** Each skill defines its own terms the
first time it uses them, in brackets right after the term — for example, "a tab stop (a place the
Tab key lands)". That keeps every skill complete on its own. The MCP server and the skill packages
serve one `SKILL.md` at a time, and neither one serves this file.

This file is what keeps those in-place definitions the same everywhere. When a skill defines a term
listed here, `npm run skills:glossary:check` requires the words in the brackets to match the
**Definition** column exactly. The test suite runs the same check, so a definition that drifts fails
CI.

## Using the glossary

- **Defining a listed term in a skill?** Copy the definition from the table, word for word, into
  brackets right after the term. Do this once per skill, the first time the term appears in prose.
- **The definition does not fit the sentence?** Rewrite the sentence, not the definition. If no
  sentence can take it, change the definition here — and every skill that uses it — in the same
  pull request.
- **Adding a term?** Add it here when a second skill needs to define it. A term used by one skill
  only can be defined in that skill without a row here.
- **A term with two meanings** gets one row per meaning. The check accepts either one, so the
  **Where** column says which meaning belongs where. Reviewers check that; the script cannot.

## What the check does not do

A guard believed to be total is worse than one known to be partial, so here is what the check misses:

- **It reads only definitions in brackets straight after the term.** A definition written as a
  sentence — "A token is a named design value…" — is not checked. Prefer the bracket form.
- **It does not check that a term is defined at all**, or defined at its first use.
- **It skips brackets that start with a capital letter, a backtick, or "see", "e.g." or "for
  example"**. Those are references and examples, not definitions.
- **It matches the longest listed term first**, so "unadvertised affordance (…)" is checked against
  its own row, not against "affordance". A compound term that is not listed — "spacing tokens" — is
  checked against the last word it ends in, here "tokens".

## Terms

| Term                      | Also written as  | Definition                                                                                      | Where                                                                                    |
| ------------------------- | ---------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| UI kit                    |                  | the token file, `recursica_ui-kit.json`, that says which variants and states each component has |                                                                                          |
| standard UI kit           |                  | the unchanged UI kit in the official Recursica release                                          |                                                                                          |
| accessibility tree        |                  | the version of the page that assistive technology reads                                         |                                                                                          |
| accessible name           | accessible names | the name a screen reader reads out for a control                                                |                                                                                          |
| adapter                   | adapters         | the Recursica component library for one framework, such as Mantine or Angular Material          |                                                                                          |
| affordance                | affordances      | a visible cue that a control can be used, such as the underline on a link                       |                                                                                          |
| AND together              |                  | a row appears only if it matches all of them                                                    | Filters                                                                                  |
| bottom sheet              | bottom sheets    | a panel that slides up from the bottom on iPhones                                               |                                                                                          |
| channel                   |                  | color, shape, position or text, each a separate signal                                          | The usual meaning: how information reaches the senses                                    |
| channel                   |                  | the form a message takes: a toast, a banner or a modal                                          | Only where a message is being delivered — `feedback-messaging`                           |
| channels                  |                  | the forms a message takes: a toast, a banner or a modal                                         | Plural of the delivery meaning                                                           |
| chrome                    |                  | the header, navigation and footer around the content                                            |                                                                                          |
| combobox                  |                  | a text field paired with a list of options                                                      |                                                                                          |
| destructive action        |                  | an action that deletes data or cannot be undone                                                 |                                                                                          |
| determinate variant       |                  | one that shows how much is done                                                                 | Loaders                                                                                  |
| elevation                 |                  | the shadow that makes a surface look raised                                                     |                                                                                          |
| below the fold            | fold, the fold   | the part of the page visible only after scrolling                                               |                                                                                          |
| gutters                   |                  | the gaps between columns and regions                                                            |                                                                                          |
| high plurality            |                  | a large number of items of the same kind                                                        |                                                                                          |
| indeterminate state       | indeterminate    | the partly selected state, shown as a dash, when some but not all items are selected            | Checkboxes. A loader's "indeterminate spinner" is another meaning, defined in that skill |
| landmark                  | landmarks        | a labeled region of the page a screen reader can jump straight to                               |                                                                                          |
| landmark list             |                  | the list of labeled page regions a screen reader can jump between                               |                                                                                          |
| layer                     |                  | a numbered background level, 0 to 3, that sets the colors of the components on that level       |                                                                                          |
| listbox                   |                  | a list the user picks one or more options from                                                  |                                                                                          |
| live region               | live regions     | an area a screen reader announces automatically when its content changes                        |                                                                                          |
| mental model              |                  | what a person expects from the tools and work they already know                                 |                                                                                          |
| non-modal                 |                  | it leaves the rest of the page usable                                                           | After "is": "a panel is non-modal (…)"                                                   |
| non-modal dialog          |                  | a window that leaves the rest of the page usable                                                |                                                                                          |
| peer                      |                  | an object of the same kind as the ones around it, such as a row in a list                       |                                                                                          |
| peers                     | peer objects     | objects of the same kind, such as rows in a list                                                |                                                                                          |
| plurality                 |                  | the number of items                                                                             |                                                                                          |
| reduced-motion preference |                  | a setting that asks for less animation                                                          |                                                                                          |
| roving tabindex           | roving focus     | where the arrow keys move between items that share one tab stop                                 |                                                                                          |
| scrolling ancestor        |                  | a container further up the page that scrolls                                                    |                                                                                          |
| semantic HTML             |                  | HTML elements chosen for their role, such as a button element for a button                      |                                                                                          |
| stub                      |                  | an empty placeholder                                                                            |                                                                                          |
| surface                   |                  | a region that holds content, such as a page, panel, or modal                                    |                                                                                          |
| tab stop                  |                  | a place the Tab key lands                                                                       |                                                                                          |
| tab stops                 |                  | places the Tab key lands                                                                        |                                                                                          |
| tenant                    |                  | the organization whose account the application runs under                                       |                                                                                          |
| token                     |                  | a named design value, such as a color or a size, set by the design system                       |                                                                                          |
| tokens                    |                  | named design values, such as colors or sizes, set by the design system                          |                                                                                          |
| unadvertised affordance   |                  | a control that works but is not shown in the main interface, such as a keyboard shortcut        |                                                                                          |
| viewport breakpoint       |                  | the screen width at which the whole layout changes                                              | Where it is contrasted with a container's width — `forms`                                |
| working memory            |                  | how much a person can hold in mind at once                                                      |                                                                                          |

## Not defined

Designers and agents already know these terms, so the skills use them without a definition. Do not add one back. See rule 5 in `WRITING.md`.

alternative text, assistive technology, breadcrumbs, breakpoint, breakpoints, caret, cognitive load, dark pattern, DOM, empty state, focus ring, hamburger menu, infinite scroll, locale, microcopy, modal, persona, personas, popover, progressive disclosure, screen reader, screen reader user, scrim, scrims, segmented control, skeleton, skeletons, stepper, tablet breakpoint, toast, truncated, variant, variant property, variant properties, variants, viewport, viewport height.
