# Writing guide

This guide sets the writing rules for this repository. Agents are the main readers of the knowledge files. People also read, correct and maintain the knowledge files.

## The cold-reader test

**A designer reading the sentence cold knows what the sentence means and what to do.** If the designer would ask "which one?", "of what?", "where?", "what is that?" or "what does that mean?", the sentence is not finished. Rewrite the sentence until no question is left.

## Writing rules

### 1. American English

Use American spelling, and follow the AP style guide.

### 2. Imperatives and statements, never "you"

Never address the reader. Give an instruction in the imperative, and state a rule about the component or the screen.

| Kind of text   | Example                                                                |
| -------------- | ---------------------------------------------------------------------- |
| An instruction | "Use a table for many records of one type."                            |
| A rule         | "A badge holds one value."                                             |
| A checklist    | "- [ ] Where horizontal scrolling must be used, a reason is provided." |

**Removing "you" means rewriting the sentence, not making the sentence passive.** "Side by side is the value you have to pass" does not improve as "the value that has to be passed". Say what to do: "Set label placement to side by side on every field."

**A checklist item names what a reviewer can see.** Use the words a designer uses, not a vague passive like "that is stated". Items about the open questions take one form: "Open questions were asked about, not decided: …"

**An agent's identity line is the one exception**, such as "You are Betty, the designer agent for Recursica." The identity line is the only sentence in an agent's instructions that may start with "You".

Quoted interface copy keeps the exact interface wording, such as a button label `Save your changes`.

### 3. Specific nouns instead of pronouns

**Name the noun. Avoid pronouns.** Repeat the noun instead of writing "it", "they", "them", "this", "that", "these" or "those". Write "Keep the button the same size", not "Keep it the same size". A pronoun is acceptable only when the noun the pronoun replaces is in the same sentence and nothing else could match.

**Make every noun specific.** A vague noun leaves the reader asking "of what?" or "where?".

| Vague                           | Specific                                                 |
| ------------------------------- | -------------------------------------------------------- |
| a row                           | a table row                                              |
| a small set                     | two to five options                                      |
| an on/off state saved as data   | a setting the user turns on or off, such as email alerts |
| more actions than fit           | more action buttons than the table row has room for      |
| one primary button per surface  | one primary button per page, panel, or modal             |
| defines these for buttons       | defines these styles, sizes and states for buttons       |
| the user ends up somewhere else | clicking goes to a different page or URL                 |
| whatever it should look like    | even when the design shows a button                      |
| if the link must look light     | when the link needs less visual weight                   |

**Never use "something", "somewhere", "anything", "the rest" or "whatever" in a rule.** Each one stands in for a specific noun. Find that noun.

### 4. Designer vocabulary

**Write the term a designer would say.** Look the term up when unsure.

| Insider word                                  | What a designer says                                  |
| --------------------------------------------- | ----------------------------------------------------- |
| axis                                          | variant property                                      |
| surface                                       | page, panel, or modal                                 |
| gray bars where text will be                  | skeleton screen                                       |
| summary figures                               | KPI tiles                                             |
| interactive                                   | clickable                                             |
| design-system names                           | the names in Figma and the UI kit                     |
| a bad component alias or a bad semantic alias | the wrong color, set in the component or in the theme |

**Say what the reader sees and does, not what the code does.** Write "Clicking goes to a different page", not "the user ends up somewhere else". Write "the name the code uses", not "the adapter's name for the axis".

**Skills never name a programming language or a code library.** Never write React, a prop, `formLayout` or a file path in an adapter. Adapters exist for several languages, and a skill must hold for every adapter. Use the names in Figma and the UI kit, and tell the agent to look up the name the code uses with the Recursica MCP server.

**Standard HTML and ARIA names are allowed in accessibility rules**, such as `button`, `div`, `span`, `href` and `aria-label`. HTML and ARIA are web standards, not a library, and a reviewer can check a rule that names the element.

**Skills never state a project's variants as fixed facts.** Each project can add, rename or remove variants in the project's UI kit. Describe a variant by role, such as "the primary style" or "the smaller size", and give the standard UI kit name only as an example.

### 5. Concrete words instead of metaphors

Name the specific component, action or result. A reader should be able to picture what happens on the screen.

**Never use the following phrases:** "how something works", "what the shape means", "a way of", "the thing", "reads as", "reads like", "earn" in any form ("earns its place", "must be earned"), "the shape of the data" (write "the type and structure of the data"). Each one stands in for a specific word. Find that word.

**Say what to do, not what a rule or a component must earn or deserve.** Write "Leave out a column that most rows have no value for", not "A column has to earn its place." Swapping one metaphor for another ("worth its width") does not fix the sentence.

**Never use a metaphor.** A summary row is not "furniture", a running button is not "in flight", and a label does not "carry" meaning. Say what happens.

**Name the cost.** "Has a cost" says nothing until the cost is named. Write what happens: "KPI tiles take the top of the page and push the content down."

**State each rule in the affirmative, in the simplest form.** Never write a double negative or a complicated negative statement. Write "Keep markup correct, even when a screen reader reads more because of it", not "Do not change correct markup to reduce how much a screen reader says." A plain prohibition is fine when the prohibition is the simplest form: "Never use a badge to show an error."

### 6. Short, direct sentences

- **Write at a 9th-grade reading level or lower.** Use short sentences and common words. The check fails a skill or agent file with a Flesch-Kincaid grade of 10 or higher. A low score does not prove a sentence is clear. A short sentence full of jargon still fails review.
- **Cut every word and sentence that adds nothing.** Delete a sentence that repeats another, restates a rule in different words, or says that clear writing is good. Cut filler words: "really", "genuinely", "actually", "simply", "just", "already", "in practice", "it is worth noting", "on its own", "its own way". Use "quietly" only for an event that happens without notice.
- **Write complete sentences, with a subject and a verb.** Never open a document, a paragraph or a list item with a fragment such as "How everything is written:" or "How wide a panel is." A list item that names a topic uses a noun phrase: "Panel width."
- **Lead with the rule.** The first sentence of a paragraph says what to do. The reason follows.
- **Give the reason once, in one sentence.** The reason lets a reader apply the rule to a case the rule does not name.
- **Write one idea per sentence.** Split a sentence that needs a semicolon and a dash. Split a run-on joined by "so" into two sentences, and name what each sentence is about. Write "The check cannot tell a vague sentence from a clear one. Read this guide before writing or reviewing a skill.", not "The rest takes judgment, so read this before any change".
- **State each rule in one place.** Either state the rule or link to the file that states the rule. Do not summarize another file's rule and then point to that file. The skills are the one exception. An agent may load one skill without the others, and each skill must stand alone. Skills copy shared passages and glossary definitions for that reason, and `npm run skills:check` keeps the copies identical.
- **Never open with a setup.** State the rule, without a line such as "This is the judgment that matters most:" before the rule.

### 7. Definitions for unfamiliar terms

Do not define a modal, a tooltip, a placeholder or a variant property. Define a term at the term's first use when a designer could misread the term, or when Recursica uses the term in a Recursica-specific sense: a layer, an adapter, the standard UI kit, a tone, a token, a tab stop.

Write the definition in brackets after the term: "a tab stop (a place the Tab key lands)". `skills/meta/GLOSSARY.md` holds the official wording, and `npm run skills:glossary:check` keeps the copies in step.

### 8. Headings, emphasis, lists and tables

- **A heading is a short noun phrase with no pronoun.** Write "## Related skills", not "## Skills to read with this one". Write "## Rules", not "## Rules for using it".
- **Component skills use the same headings, in order:** "When to use a button", "When not to use a button", "Variants", "Rules", "Accessibility", "Styling set by tokens", "Related skills", "Open questions", "Pre-flight checklist". Only the first two name the component.
- **Write headings in sentence case.**
- **Bold the rule sentence** that opens a paragraph, and nothing else in the paragraph.
- **Write NEVER, MUST and MUST NOT in capitals** only for hard rules with no exceptions.
- **Use a table** for a comparison or a choice between options. **Use a list** for steps, checklists and parallel items.

### 9. Names, people and examples

The repository is public. Follow `AGENT.md` on what never goes into a commit, a pull request or an issue: client names, client domain words, people and identifiers. Examples use `acme`, and people in examples are "Person A" with an `acme.com` address.

## Rewrites of existing skills

**A rewrite changes the wording, never the rule.** Clearer wording often narrows or widens a rule by accident. "Goes somewhere" became "opens a different page" and dropped URL changes. "Show any confirmation elsewhere" became "Confirm with a toast" and added a rule.

**After every rewrite, compare the old and new versions line by line.** List every rule, number, example, reason and open question in the old version, and confirm the new version keeps each one with the same strength and scope. Use a reviewer who did not write the new version. Fix every lost, narrowed, widened or added rule before review.

**After every rewrite, run `npm run writing:flags`.** The report lists every sentence the change adds that holds a pronoun or a vague word, such as "it", "these", "something" or "everything". Rewrite each flagged sentence to name the noun, then compare the old and new versions again. The report cannot fix a sentence, because only a reader of the sentence knows which noun was meant. The report also saves a copy in `.reports/vague-words.txt`, which git ignores, so a report is never committed.

**A rule changes only when the design-system owner says so.** Record the change in the commit message.

## Files covered by this guide

| Covered                                                            | Not covered                                          |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| Every `SKILL.md`, the glossary and shared passages                 | Code, and text quoted from an interface              |
| Agent instructions: `agents/*/SKILL.md`, `platform/`, `subagents/` | `docs/components/*/DOCS.md`, the website's own pages |
| `AGENT.md`, `README.md`, `CONTRIBUTING*.md`, `PORTING.md` files    | Generated files, which follow the source files       |
| Commit messages, pull requests and issues                          |                                                      |

## Automated checks

`npm run writing:check` runs with `npm run skills:check` and in CI. The check fails on:

- British spellings
- "you" and "your" in skills and agent instructions, except an agent's identity line, code and quoted text
- the phrases listed under rule 5, and the filler "on its own" and "its own way"
- "whatever", "axis", "React" and "prop" in a skill, outside the chart skill's chart axes
- a Flesch-Kincaid grade of 10 or higher in a skill or agent file

The check cannot tell whether a sentence is vague, redundant or a fragment, or whether a pronoun is clear. `npm run writing:flags` lists every pronoun and vague word a change adds, without failing, and each one is a warning on the pull request. A person or an agent rewrites each flagged sentence, using the cold-reader test in this guide. When the check and this guide disagree, fix the check.
