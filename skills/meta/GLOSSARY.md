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

## How to use it

- **Defining a listed term in a skill?** Copy the definition from the table, word for word, into
  brackets right after the term. Do this once per skill, the first time the term appears in prose.
- **The wording does not fit your sentence?** Rewrite the sentence, not the definition. If no
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
| axis                      |                  | a variant property, as Figma calls it — one way a component varies, such as its size            | Figma's name for it; the UI kit and the skills call it an axis                           |
| axes                      |                  | variant properties, as Figma calls them — the ways a component varies, such as its size         |                                                                                          |
| UI kit                    |                  | the token file, `recursica_ui-kit.json`, that says which variants and states each component has |                                                                                          |
| accessibility tree        |                  | the version of the page that assistive technology reads                                         |                                                                                          |
| accessible name           | accessible names | the name a screen reader reads out for a control                                                |                                                                                          |
| affordance                | affordances      | a visible cue that tells the user they can act on something                                     |                                                                                          |
| alternative text          | alt text         | text read in place of the image                                                                 |                                                                                          |
| AND together              |                  | a row appears only if it matches all of them                                                    | Filters                                                                                  |
| assistive technology      |                  | tools such as screen readers that help people with disabilities use a computer                  |                                                                                          |
| bottom sheet              | bottom sheets    | a panel that slides up from the bottom on iPhones                                               |                                                                                          |
| breadcrumbs               |                  | a trail of links showing where the page sits                                                    |                                                                                          |
| breakpoint                |                  | the screen width at which the layout changes                                                    |                                                                                          |
| breakpoints               |                  | the screen widths at which the layout changes                                                   |                                                                                          |
| caret                     |                  | the text cursor                                                                                 |                                                                                          |
| channel                   |                  | a way of carrying meaning, such as color, shape, position, or text                              | The usual meaning: how information reaches the senses                                    |
| channel                   |                  | the way a message reaches the user — a toast, a banner, a modal, and so on                      | Only where a message is being delivered — `feedback-messaging`                           |
| channels                  |                  | the ways a message reaches the user — a toast, a banner, a modal, and so on                     | Plural of the delivery meaning                                                           |
| chrome                    |                  | the frame around the content                                                                    |                                                                                          |
| cognitive load            |                  | the mental effort a task demands                                                                |                                                                                          |
| combobox                  |                  | a text field paired with a list of options                                                      |                                                                                          |
| dark pattern              |                  | a design that pushes users to act against their own interest                                    |                                                                                          |
| destructive action        |                  | one that deletes something or cannot easily be undone                                           |                                                                                          |
| determinate variant       |                  | one that shows how much is done                                                                 | Loaders                                                                                  |
| DOM                       |                  | the page's structure in code                                                                    |                                                                                          |
| elevation                 |                  | how raised a surface looks                                                                      |                                                                                          |
| empty state               |                  | what a screen shows when there is no data yet                                                   |                                                                                          |
| focus ring                |                  | the outline that shows which element has keyboard focus                                         |                                                                                          |
| below the fold            | fold, the fold   | the part of the page you only see after scrolling                                               |                                                                                          |
| gutters                   |                  | the gaps between columns and regions                                                            |                                                                                          |
| hamburger menu            |                  | a button with three horizontal lines that opens a menu                                          |                                                                                          |
| high plurality            |                  | a large number of items of the same kind                                                        |                                                                                          |
| indeterminate state       | indeterminate    | the partly selected state, shown as a dash, when some but not all items are selected            | Checkboxes. A loader's "indeterminate spinner" is another meaning, defined in that skill |
| infinite scroll           |                  | more rows load as the user scrolls                                                              |                                                                                          |
| landmark                  | landmarks        | a labeled region of the page a screen reader can jump straight to                               |                                                                                          |
| landmark list             |                  | the list of labeled page regions a screen reader can jump between                               |                                                                                          |
| layer                     |                  | a numbered level that sets which colors the components inside it use                            |                                                                                          |
| listbox                   |                  | a list the user picks one or more options from                                                  |                                                                                          |
| live region               | live regions     | an area a screen reader announces automatically when its content changes                        |                                                                                          |
| locale                    |                  | the language and regional settings a person uses                                                |                                                                                          |
| mental model              |                  | a person's picture of how something works                                                       |                                                                                          |
| microcopy                 |                  | the short text in an interface                                                                  |                                                                                          |
| modal                     |                  | a window that blocks the rest of the page until the user closes it                              |                                                                                          |
| non-modal                 |                  | it leaves the rest of the page usable                                                           | After "is": "a panel is non-modal (…)"                                                   |
| non-modal dialog          |                  | a window that leaves the rest of the page usable                                                |                                                                                          |
| peer                      |                  | an object of the same kind as the ones around it, such as a row in a list                       |                                                                                          |
| peers                     | peer objects     | objects of the same kind, such as rows in a list                                                |                                                                                          |
| persona                   |                  | a profile that represents one type of user                                                      |                                                                                          |
| personas                  |                  | profiles that each represent one type of user                                                   |                                                                                          |
| plurality                 |                  | how many of something there are                                                                 |                                                                                          |
| popover                   |                  | the small panel that opens next to its trigger                                                  |                                                                                          |
| progressive disclosure    |                  | showing only what is needed now, with the rest available on request                             |                                                                                          |
| reduced-motion preference |                  | a setting that asks for less animation                                                          |                                                                                          |
| roving tabindex           | roving focus     | where the arrow keys move between items that share one tab stop                                 |                                                                                          |
| screen reader             | screen readers   | software that reads the screen aloud                                                            |                                                                                          |
| screen reader user        |                  | someone using software that reads the screen aloud                                              |                                                                                          |
| scrim                     |                  | a dimmed overlay                                                                                |                                                                                          |
| scrims                    |                  | dimmed overlays                                                                                 |                                                                                          |
| scrolling ancestor        |                  | a container further up the page that scrolls                                                    |                                                                                          |
| segmented control         |                  | a row of joined buttons, one of which is selected                                               |                                                                                          |
| semantic HTML             |                  | using each element for what it means, not how it looks                                          |                                                                                          |
| skeleton                  |                  | a gray placeholder shape shown while content loads                                              |                                                                                          |
| skeletons                 |                  | gray placeholder shapes shown while content loads                                               |                                                                                          |
| stepper                   |                  | a component that walks the user through numbered steps                                          |                                                                                          |
| stub                      |                  | an empty placeholder                                                                            |                                                                                          |
| surface                   |                  | a region that holds content, such as a page, panel, or modal                                    |                                                                                          |
| tab stop                  |                  | a place the Tab key lands                                                                       |                                                                                          |
| tab stops                 |                  | places the Tab key lands                                                                        |                                                                                          |
| tablet breakpoint         |                  | the screen width at which the layout changes for tablets                                        |                                                                                          |
| tenant                    |                  | the organization whose account the application runs under                                       |                                                                                          |
| toast                     |                  | a short message that appears briefly and then disappears                                        |                                                                                          |
| token                     |                  | a named design value, such as a color or a size, set by the design system                       |                                                                                          |
| tokens                    |                  | named design values, such as colors or sizes, set by the design system                          |                                                                                          |
| truncated                 |                  | cut short and ended with an ellipsis, …                                                         |                                                                                          |
| unadvertised affordance   |                  | a control that is deliberately not promoted                                                     |                                                                                          |
| variant                   |                  | one version of a component, such as a solid or an outline button                                |                                                                                          |
| variants                  |                  | versions of a component, such as solid or outline buttons                                       |                                                                                          |
| viewport                  |                  | the visible area of the browser window                                                          |                                                                                          |
| viewport breakpoint       |                  | the screen width at which the whole layout changes                                              | Where it is contrasted with a container's width — `forms`                                |
| viewport height           |                  | the height of the visible area of the browser window                                            |                                                                                          |
| working memory            |                  | how much a person can hold in mind at once                                                      |                                                                                          |
