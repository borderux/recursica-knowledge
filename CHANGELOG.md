# @recursica/knowledge

## 0.8.0

### Minor Changes

- bbafacc: ## v0.8.0

  This release adds 13 design-rules skills, four agents that design and review screens and maintain the knowledge, and a plain-language rewrite of every skill. The release covers 95 merged changes since v0.7.0.

  ### New design-rules skills

  Thirteen skills join the design rules:

  - `recursica-skill-defaults` — what a screen shows before the user touches the screen
  - `recursica-skill-feedback-messaging` — toasts, banners, success and error messages
  - `recursica-skill-filters` — filter bars, search over a list and date ranges
  - `recursica-skill-icon-semantics` — fixed icon meanings and when an icon needs a label
  - `recursica-skill-information-architecture` — the object map an app is built on, agreed before any screen
  - `recursica-skill-layers` — the numbered background levels that set component colors
  - `recursica-skill-live-regions` — what a screen reader announces when content changes
  - `recursica-skill-naming-terminology` — names and terms in an interface
  - `recursica-skill-panels-modals` — choosing between a panel, a modal and a page
  - `recursica-skill-responsive-behavior` — layouts below desktop
  - `recursica-skill-screen-priority` — ranking what matters on a screen
  - `recursica-skill-screen-scaffolding` — the header, navigation, footer and regions of a page
  - `recursica-skill-typography-semantics` — headings, emphasis and type styles

  The library now has 65 skills: 39 component skills, 23 design-rules skills, 2 psychology skills and the design router.

  ### Every skill rewritten in plain language

  - **WRITING.md** sets the rules for all text in the repository: American English, specific nouns instead of pronouns, the subject first, short sentences at a 9th-grade reading level, and designer vocabulary.
  - **Variants come from the project.** A component skill tells the agent to get the project's variants from the Recursica MCP server, because a designer can add variants in Theme Forge. A skill never says what a component lacks. Where a rule depends on an option, the skill says "If the project has X, use X. Otherwise, …".
  - **No theme details.** The theme sets sizes, spacing, borders, colors and animation, so no skill lists those properties or the tokens behind the properties. Each "Styling set by tokens" section holds one instruction: never set or override the styling.
  - **No code or library names** in any skill. Skills work the same for every adapter.
  - **Short, consistent headings** in every component skill: When to use, When not to use, Variants, Rules, Accessibility, Styling set by tokens, Related skills, Open questions and Pre-flight checklist.
  - **Decisions recorded.** House rules settled during the rewrite are in `docs/open-questions.md`. For example, a panel is never modal, a link can be the primary call to action, a field never shows success, and a table scrolls sideways only as a last resort.

  ### Agents

  - **Betty** designs and builds screens on Recursica from a product request, and opens a pull request with a live preview.
  - **Barb** reviews a screen against the skills and reports each violation with a file and line. Barb writes nothing. Checker and Feisty, two helper subagents, check each skill and test each finding.
  - **Alan** maintains the knowledge. Alan turns designer feedback and Barb's findings into pull requests against the skills.
  - **Edie** rewrites skills and agent instructions to follow WRITING.md. A read-only comparer subagent checks that no rule changed. Edie runs in Claude Code only.
  - **Kev** (`tools/kev`) gives Barb a fast first pass over a screen.
  - **Research agents** that work with client data, Claire, Stu and Loki, are now in the portable format. They run only where their data fence can be enforced.
  - Agents are defined once in `agents/<name>/` and built for Claude Code, Buzz and CircleChat.

  ### Install and update

  - **One command installs or updates the design agents in Claude Code:** `npm run agents:install`. `npm run agents:install:check` reports what is out of date.
  - **CircleChat setup scripts** install Betty, Barb and Alan on a self-hosted CircleChat.
  - **The knowledge MCP server** serves the skills to agents.

  ### Checks and tooling

  - `npm run skills:check` runs every skill check: structure, glossary definitions, shared passages, open questions, wiring to the agents, and the writing check.
  - `npm run writing:flags` lists pronouns and vague words for a person to review. In CI, each flag is a warning on the pull request.
  - `npm run skills:manifest` works out which skills apply to a screen from the components the screen imports, now including Angular component names.
  - `npm run skills:routing` scores how well a model picks the right skill from the descriptions.

  ### Safety

  - Commits, pull requests and issues are checked for client names, personal email addresses and phone numbers before the text is published.
  - A hook requires the operator's sign-off trailers on every commit an agent makes.
  - Agents that handle client data run inside a tool fence, set per agent and per community.
  - Agents cannot read source from a checkout that git does not track, or read the operator's credential store.

  ### Upgrading

  ```bash
  git pull
  npm run agents:install
  ```

  On a CircleChat host, also run `circlechat/sync-skills.sh`.

  **Full changelog:** https://github.com/borderux/recursica-knowledge/compare/@recursica/knowledge@0.7.0...main

## 0.7.0

### Minor Changes

- d9505a9: Revised skills layout

## 0.6.0

### Minor Changes

- 4827885: Updated Table description in docs

## 0.5.0

### Minor Changes

- fecda27: Added docs for missing components

## 0.4.0

### Minor Changes

- e78ec51: Added Table to component docs

## 0.3.0

### Minor Changes

- 0ebfc62: Revised layout of repo

## 0.2.0

### Minor Changes

- 407b8f0: Updated release
