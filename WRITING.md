# Writing guide

This guide sets the writing rules for this repository. Agents are the main readers of the knowledge files. People also read them, correct them and maintain them.

## The rules

### 1. American English

Use American spelling and the AP style guide.

### 2. No "you"

Never address the reader. Give an instruction in the imperative, and state a rule about the component or the screen.

| Kind of text   | Example                                                                |
| -------------- | ---------------------------------------------------------------------- |
| An instruction | "Use a table for many records of one type."                            |
| A rule         | "A badge holds one value."                                             |
| A checklist    | "- [ ] Where horizontal scrolling must be used, a reason is provided." |
| A heading      | "## Set by the component", not "## Not your decision"                  |

**Removing "you" means rewriting the sentence, not making it passive.** "Side by side is the value you have to pass" does not improve as "the value that has to be passed". Say what to do: "Set `formLayout=\"side-by-side\"` on every field to put the label beside the input."

**A checklist item names what a reviewer can see.** Use the words a designer uses, not a vague passive like "that is stated". Items about the uncovered list take one form: "Uncovered items were asked about, not decided: …"

**One exception: an agent's identity line**, such as "You are Betty, the designer agent for Recursica." It is the only sentence in an agent's instructions that may start with "You".

Quoted interface copy keeps its own words, such as a button label `Save your changes`.

### 3. Concrete words

Name the specific component, action or result. A reader should be able to picture what happens on the screen.

| Vague                                                   | Concrete                                              |
| ------------------------------------------------------- | ----------------------------------------------------- |
| interactive                                             | clickable                                             |
| a bad component alias or a bad semantic alias           | the wrong color, set in the component or in the theme |
| a standard, portable artifact                           | a standard file other tools can read                  |
| a way of carrying meaning, such as color, shape or text | color, shape, position or text                        |
| a person's picture of how something works               | what the user expects, from tools they already use    |
| `alert` reads as something wrong                        | `alert` means a problem                               |

**Never use these:** "how something works", "what the shape means", "a way of", "the thing", "reads as", "reads like", "earn" in any form ("earns its place", "must be earned"), "the shape of the data" (write "the type and structure of the data"). Each one stands in for a specific word. Find that word.

**Say what to do, not what something must earn or deserve.** Write "Leave out a column that most rows have no value for", not "A column has to earn its place." Swapping one metaphor for another ("worth its width") does not fix it.

**Say it in the affirmative, the simplest way.** No double negatives and no complicated negative statements. Write "Keep markup correct, even when a screen reader reads more because of it", not "Do not change correct markup to reduce how much a screen reader says." A plain prohibition is fine when it is the simplest form: "Never use a badge to show an error."

**Name the cost.** "Has a cost" says nothing until the cost is named. Write what happens: "KPI tiles take the top of the page and push the content down."

**Use the term designers use.** "Skeleton screen", not "gray bars where text will be"; "KPI tiles", not "summary figures". Look the term up when unsure.

**No metaphors.** A summary row is not "furniture", and a misused badge is not "wearing another component's clothes". Say what is wrong.

### 4. Short and direct

- **Cut every sentence that adds nothing.** Delete a sentence that repeats another, restates a rule in different words, or says that clear writing is good. Make a vague sentence specific, or delete it.
- **Write complete sentences, with a subject and a verb.** Never open a document, a paragraph or a list item with a fragment such as "How everything is written:" or "How wide a panel is." A list item that names a topic uses a noun phrase: "Panel width."
- **Lead with the rule.** The first sentence of a paragraph says what to do. The reason follows.
- **Give the reason once, in one sentence.** The reason lets a reader apply the rule to a case it does not name.
- **One idea per sentence.** Split a sentence that needs a semicolon and a dash. Split a run-on joined by "so" into two sentences, and name what each one is about. Not "The rest takes judgment, so read this before any change", but "The check cannot tell a vague sentence from a clear one. Read this guide before writing or reviewing a skill."
- **Cut filler:** "really", "genuinely", "actually", "simply", "just", "already", "in practice", "it is worth noting". Use "quietly" only for something that happens without notice, as in "React ignores it without an error".
- **State each rule in one place.** Either state the rule or link to the file that states it. Do not summarize another file's rule and then point to that file. The skills are the one exception. An agent may load one skill without the others, and each skill must stand on its own. Skills copy shared passages and glossary definitions for that reason, and `npm run skills:check` keeps the copies identical.
- **No setups.** Not "This is the judgment that matters most:" before a rule. State the rule.

### 5. Define only what a designer would not know

Do not define a modal, a tooltip or a placeholder. Define a term at its first use when a designer could misread it, or when Recursica uses it in its own sense: a layer, a tone, a token, a tab stop.

Write the definition in brackets after the term: "a tab stop (a place the Tab key lands)". `skills/meta/GLOSSARY.md` holds the official wording, and `npm run skills:glossary:check` keeps the copies in step.

### 6. Emphasis

- **Bold the rule sentence** that opens a paragraph.
- **Write NEVER, MUST and MUST NOT in capitals** only for hard rules with no exceptions.
- Do not bold whole paragraphs.

### 7. Lists, tables and headings

- **A table** for a comparison or a choice between options.
- **A list** for steps, checklists and parallel items.
- **Headings in sentence case**, naming the topic: "## Rows, scrolling, and pagination".

### 8. Names, people and examples

The repository is public. Follow `AGENT.md` on what never goes into a commit, a pull request or an issue: client names, their domain words, people, identifiers. Examples use `acme`, and people in examples are "Person A" with an `acme.com` address.

## Where this applies

| Covered                                                            | Not covered                                          |
| ------------------------------------------------------------------ | ---------------------------------------------------- |
| Every `SKILL.md`, the glossary and shared passages                 | Code, and text quoted from an interface              |
| Agent instructions: `agents/*/SKILL.md`, `platform/`, `subagents/` | `docs/components/*/DOCS.md`, the website's own pages |
| `AGENT.md`, `README.md`, `CONTRIBUTING*.md`, `PORTING.md` files    | Generated files, which follow their sources          |
| Commit messages, pull requests and issues                          |                                                      |

## The check

`npm run writing:check` runs with `npm run skills:check` and in CI. It fails on:

- British spellings
- "you" and "your" in skills and agent instructions, except an agent's identity line, code and quoted text
- the phrases listed under rule 3

It cannot tell whether a sentence is vague, redundant or a fragment. Review catches those. When the check and this guide disagree, fix the check.
