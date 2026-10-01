# Writing guide

How everything in this repository is written: skills, agent instructions, the glossary, `AGENT.md`, `README.md`, contribution guides, commit messages, pull requests and issues.

Agents are the main readers, and people read the same text. Clear writing serves both. A sentence a designer has to read twice is one an agent can misapply.

`npm run writing:check` enforces the rules a script can check. The rest takes judgment, so read this before writing or reviewing any change.

## The rules

### 1. American English

Use American spelling and the AP style guide, the copy standard `recursica-skill-typography-semantics` already sets.

| Write     | Not       |
| --------- | --------- |
| color     | colour    |
| behavior  | behaviour |
| center    | centre    |
| labeled   | labelled  |
| canceled  | cancelled |
| recognize | recognise |
| organize  | organise  |
| summarize | summarise |
| judgment  | judgement |
| toward    | towards   |
| gray      | grey      |
| catalog   | catalogue |

The check fails on these and their other forms.

### 2. No "you"

The reader is never the subject. Write about the thing, or give the instruction directly.

| Kind of text   | Write it as                    | Example                                            |
| -------------- | ------------------------------ | -------------------------------------------------- |
| An instruction | the imperative                 | "Use a table for many records of one type."        |
| A rule         | a statement about the thing    | "A badge holds one value."                         |
| A checklist    | something a reviewer can check | "- [ ] Every variant is from the inventory above." |
| A heading      | the topic                      | "## Decided elsewhere", not "## Not your decision" |

**One exception: an agent's identity line.** "You are Betty, the designer agent for Recursica." That is how an agent is given its role, and it is the only sentence in an agent's instructions that starts with "You". Everything after it is an instruction.

Quoted interface copy keeps its own words. A button label `Save your changes` in an example is the example, not this file's voice.

### 3. Concrete words

Name the actual thing, the actual action, the actual result. A reader should be able to picture what happens on the screen.

| Vague                                                   | Concrete                                              |
| ------------------------------------------------------- | ----------------------------------------------------- |
| interactive                                             | clickable                                             |
| a bad component alias or a bad semantic alias           | the wrong color, set in the component or in the theme |
| a standard, portable artifact                           | a standard file other tools can read                  |
| a way of carrying meaning, such as color, shape or text | color, shape, position or text                        |
| a person's picture of how something works               | what the user expects, from tools they already use    |
| `alert` reads as something wrong                        | `alert` means a problem                               |
| a column has to earn its place                          | leave out a column that most rows have no value for   |

**Never use these:** "how something works", "what the shape means", "a way of", "the thing", "reads as", "reads like", "earn" in any form ("earns its place", "must be earned"), "the shape of the data". The check fails on them. They stand in for a specific word the writer has not found yet. Find it.

**Say what to do, not what something must earn or deserve.** A rule sentence names the action and the case: "Leave out a column that most rows have no value for", not "A column has to earn its place." Swapping one metaphor for another ("worth its width") does not fix it.

**No metaphors.** A summary row is not "furniture", a misused badge is not "wearing another component's clothes", and tokens do not "shape" agents. Say what is wrong in plain terms.

### 4. Short and direct

- **Lead with the rule.** The first sentence of a paragraph says what to do. The reason follows.
- **Give the reason once, in a sentence.** A reason helps a reader apply a rule to a case the rule does not name. An essay does not.
- **One idea per sentence.** Split a sentence that needs a semicolon and a dash.
- **Cut filler:** "really", "genuinely", "actually", "simply", "just", "quietly" (unless something happens without notice, as in "React ignores it without an error"), "in practice", "it is worth noting".
- **No setups.** Not "This is the judgment that matters most:" before a rule. State the rule.

### 5. Define only what a designer would not know

A designer knows what a modal, a tooltip and a placeholder are. Do not define them. Define a term the first time it appears when a designer could misread it, or when Recursica uses it in its own sense: a layer, a tone, a token, a tab stop.

Write the definition in concrete words, in brackets after the term: "a tab stop (a place the Tab key lands)". `skills/meta/GLOSSARY.md` holds the official wording, and `npm run skills:glossary:check` keeps the copies in step.

### 6. Emphasis

- **Bold the rule sentence** that opens a paragraph, so a skimming reader gets the rule.
- **NEVER, MUST and MUST NOT in capitals** only for hard rules with no exceptions. Most rules do not need them.
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

## What the check catches, and what it does not

`npm run writing:check` runs with `npm run skills:check` and in CI. It fails on:

- British spellings
- "you" and "your" in skills and agent instructions, except an agent's identity line, code and quoted text
- the phrases listed under rule 3

It cannot tell a vague sentence from a clear one, or an essay from a reason. That is review. When a check and this guide disagree, fix the check.
