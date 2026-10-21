# @recursica/knowledge

## 0.12.1

### Patch Changes

- aa34c1d: CircleChat host kit: the smoke install clones only Border UX's CircleChat fork, `borderux/recursica-circlechat`. A failed clone now stops the smoke install, instead of falling back to the original CircleChat, which lacks the agents' network setting.

## 0.12.0

### Minor Changes

- df1e400: CircleChat host kit: one isolated stack per client. Each client stack has its own CircleChat, Slack channel, keys, gateway and job runner, in its own Docker VM. The config check refuses a client stack that could share one of these parts.

  Secrets can live in GitHub: one environment per stack in the private repo of stacks, a `deploy-secrets` workflow, and a root-owned helper on each computer that writes each secret to the file that reads the secret. `setup-host.sh --secrets-only` recreates only the gateway and the Slack notifier after a secret changes.

### Patch Changes

- df1e400: CircleChat host kit: `setup-host.sh` now writes `COMPOSE_FILE` into `.env`, so a plain `docker compose up -d` loads the agents overlay too and agents keep installing.

## 0.11.0

### Minor Changes

- 9a0abb1: ## Porter

  Porter is a new agent. The Mantine adapter is the golden adapter. When the Mantine adapter publishes a release, Porter ports the change to the other Recursica adapters: MUI v7, Beam and Angular Material.

  - **One port per adapter.** Porter reads the release, builds a reference package for each target adapter, and sends one porter-adapter to each target. The porter-adapters run at the same time. Each porter-adapter follows `ADAPTER_AGENT_INSTRUCTIONS.md` in the `borderux/recursica` repository and opens a pull request on the target adapter.
  - **One summary.** Porter posts one summary with a pull request link for each adapter. Porter never changes the Mantine adapter and never merges.
  - **Runs in Claude Code and on CircleChat.** In a session, the user names the Mantine release to port. On CircleChat, a release watcher announces each new release once, and Porter starts from that announcement.
  - **A job runner for heavy work.** `circlechat/jobd` runs each port in a separate container with a memory cap. Each machine has a limit on how many ports run at once. Each job has a fixed type and an allowed list of repositories, so a request cannot run an arbitrary command. Secrets pass by name, and a signed message tells CircleChat when a job ends.
  - **Configured in `site.json`.** Each machine can list the jobs the machine runs. A Porter block names the release to watch, the target adapters and the person to mention with results.

  ### Upgrading

  Porter needs the CircleChat host kit. On a CircleChat host, add the jobs and Porter blocks to `site.json`, rerun `circlechat/setup-node.sh` on each machine that runs jobs, and rerun `circlechat/setup-host.sh`. Then install Porter in the CircleChat UI and run `circlechat/setup-agent.sh porter`.

- 9a0abb1: ## CircleChat host kit

  One CircleChat deployment can now run on any number of machines, set up from a single config file.

  - **One config file per deployment.** `site.json` lists the machines, what each one runs, and the model routes, with the app repository and notifications. It lives on the control machine, outside any repository, with secrets in a separate `.env`. `circlechat/site.example.json` is the template, and it holds placeholders only.
  - **Any machine can be the control machine.** A Mac or a PC of any size runs CircleChat, the agents and the model gateway. Windows runs it through WSL.
  - **Setup scripts for every machine.** `setup-host.sh` sets up the control machine: the model gateway, the Slack notifier, and services that start at boot. `setup-node.sh` sets up each other machine's own services. Both work on Linux and macOS.
  - **A model gateway with fallbacks.** Agents ask for a route by name. The gateway tries the route's models in order, and the last one is the fallback.
  - **Slack notifications.** Task changes, comments that need a person, agent posts that CircleChat rejected, and stalled tasks post to Slack.
  - **Kev failover.** Barb's first-pass reviewer, Kev, can use several engines, best first, and moves to the next when one is down.
  - **Agent setup.** Barb and Betty get the app repository from the deployment's setup. Loki gets concrete steps for each turn, pinned context sizes, and summaries that stay on his own model.

  ### Upgrading

  On a CircleChat host, copy `circlechat/site.example.json` to `site.json` on the control machine, fill it in, and run `circlechat/setup-host.sh`. Run `circlechat/setup-node.sh` on each other machine.

### Patch Changes

- 7292dd9: ## Janice joins the portable agents

  Janice reviews the research team's finished work against the agents' own session transcripts. She checks Claire, Stu and Claire's subagents, and reports each claim the evidence contradicts. Until now Janice existed only as a hand-written Buzz prompt.

  - **One source for every build.** Janice now lives in `agents/janice/`, like the other agents. The Buzz prompt is built from that source.
  - **A Claude Code build.** `portable/claude-code/agents/janice.md` runs Janice in a plain session. The user names the turn and the transcript, and Janice reports findings in the session.
  - **Read-only by design.** The Claude Code build gets Read, Grep, Glob and Bash, and no tools that write. Janice reports problems and never fixes them.
  - **Porting notes.** `agents/janice/PORTING.md` says what Janice needs: access to the transcripts, the review checklist, a signal to start, and a place to report. It also explains why there is no CircleChat build yet.
  - **Clearer wording.** Seventeen sentences used "it" or "them" without naming the noun. Each now names the noun, such as the checklist, the roster or the finding. No rule changed.
  - **Not installed automatically.** Like Claire, Stu and Loki, Janice works near client data, so `npm run agents:install` leaves her out. The README and AGENT.md say so.

  ### Upgrading

  Nothing changes for agents already installed through `npm run agents:install`. On Buzz, Janice's prompt picks up the wording fixes the next time prompts are synced. Her rules are the same.

## 0.10.0

### Minor Changes

- 91eb595: ## Recursica in Grok Build

  Recursica now installs in [Grok Build](https://x.ai/news/grok-build-cli), xAI's coding agent, as one marketplace plugin.

  ```bash
  grok plugin marketplace add borderux/recursica-knowledge
  grok plugin install recursica --trust
  ```

  The plugin holds all 66 skills, Betty the designer, Barb the design reviewer with her helpers Checker and Feisty, and two MCP servers: the Recursica knowledge server and `@recursica/mcp`. In Grok the agents carry the plugin's name, so Barb is `recursica:barb`.

  - `.grok-plugin/plugin.json` makes this repository a Grok plugin, and `.grok-plugin/marketplace.json` lists the plugin.
  - `npm run agents:build` has a new `grok` target that writes the agents to `portable/grok/agents/`. The target is opt-in, so an agent joins the public plugin only by naming `grok` in its `targets:` line.
  - A new test fails the build when a Grok agent's tool list names a tool Grok does not recognize. Grok gives such an agent every tool, so a typo in Barb's list would otherwise give the reviewer write access.

### Patch Changes

- 0107430: ## Skill versions

  Each skill now has a version that follows the skill's changes. Until now every skill stayed at 0.1.0, because changesets versions only the package.

  - **Every skill catches up for v0.9.0.** The five renamed skills move to 1.0.0. The other changed skills move up one minor version, such as 0.1.0 to 0.2.0. The new undo skill keeps 0.1.0.
  - **From now on, a script versions each skill.** `npm run skills:versions` compares each changed skill with `main` and records a major, minor or patch bump with a reason. A person checks each bump, and the release writes the new versions.
  - **Major** means a rename, a removed checklist item, or fewer rule words. **Minor** means an added checklist item, a changed description, or a changed heading, table or rule word. **Patch** means wording only.
  - CI fails when a pull request changes a skill and records no bump.

  ### Upgrading

  Anything that checks a skill's version sees the new numbers after this release. Nothing else changes.

## 0.9.0

### Minor Changes

- 43ace77: ## v0.9.0

  This release rewrites every skill a second time in plain language. It adds an undo skill and eight reference layout templates, and renames five skills. It also settles about 50 house rules that two skills used to state differently. The library now has 66 skills.

  ### Breaking: renamed skills

  Five skills are renamed so that each name says what the skill is about. Anything that loads a skill by name must use the new name. Examples are an agent prompt and a project's own notes.

  - `recursica-skill-defaults` → `recursica-skill-screen-starting-state`
  - `recursica-skill-responsive-behavior` → `recursica-skill-responsive-layout`
  - `recursica-skill-naming-terminology` → `recursica-skill-names-and-terms`
  - `recursica-skill-system-conventions` → `recursica-skill-design-system-conventions`
  - `recursica-skill-screen-scaffolding` → `recursica-skill-layouts-and-templates`

  ### New

  - **`recursica-skill-undo`** holds every undo rule in one place. The skill says when an action gets an undo instead of a confirmation, and where the undo goes. The rules used to be spread across seven skills.
  - **Layout templates.** `recursica-skill-layouts-and-templates` has eight reference layouts, each as four images: desktop, a tablet held sideways, a tablet held upright, and a phone. The templates are references, not requirements, and every region in a template still follows the region's own rules.
  - **Missing components.** The design router says what to do when the theme lacks a component. Check other names, use the code's own version, and file a defect on Theme Forge. Never build the missing component.
  - **Images from the knowledge MCP.** A served skill lists the skill's images, and a new `skill_image` tool returns one image.

  ### Writing

  - Every sentence in a skill is 20 words or fewer, and the writing check enforces the limit. `node scripts/check-writing.mjs --long <file>` lists each long sentence. Agent instructions are exempt.
  - Each rule reads the way the rule would be explained out loud: an example, then a short list.
  - Words mean one thing each. "The theme" is what a designer sets in Theme Forge, and "the code" is what the application installs. "The persona" is anyone using the software. "The user" is the person the agent works with, and stands in for the team and any approver.
  - The theme sets the breakpoint widths, the layout grid, the maximum content width and the icon set. No skill states numbers for those values.

  ### House rules settled in this release

  **Layout and navigation**

  - At the tablet breakpoint or wider, sidebars and side columns stay. Below the tablet breakpoint, navigation moves into a hamburger menu and side columns stack. A table stays only if every column fits.
  - The agent confirms with the user which devices, screen sizes and orientations the application supports.
  - A top bar holds about three or four items that will not grow. More items, or items expected to grow, get a sidebar.
  - Breadcrumbs follow the depth of the application. A shallow application has none, and a top-level page never has one.
  - Every page, panel, modal and tab gets an address whenever possible. Opening a panel or a modal adds no history entry. A confirmation gets no address.
  - The navigation drawer is not a panel.
  - A layer is a style applied to a container, and a card is a component that sits on a layer. KPI tiles and dashboard items sit in a container with a layer, not in cards.
  - Each tab may hold the tab's own complete form. One form never spreads across tabs. Switching away from a tab with unsaved changes asks first.

  **Saving, messages and undo**

  - A control outside a form saves right away. Forms keep one save mode for the whole application. Drafts save when lost work would cost real rework.
  - A toast confirms success only when the result is out of view. Different events may stack briefly, and duplicates combine.
  - The button that starts any action shows the loading state. A loading button is disabled.
  - A delete that can be undone gets an undo instead of a confirmation.

  **Controls and content**

  - A field that could hold several values shows chips, one type of value per group. A value that is only ever single is a badge. A badge never shows an error.
  - Every icon-only button gets a tooltip, including the hamburger button and a chip's remove control.
  - A checkbox starts checked only when about 90 percent of personas would choose the option. The option must also have no major later effects.
  - A switch belongs in the page's content. Chrome, filter bars and toolbars use a segmented control.
  - A field that only exists for one answer is hidden until that answer is picked. A field the persona should know about is disabled until the enabling step.
  - Every field error shows below the field and replaces the help text.
  - A date or time range is one control when both ends are required. An optional end makes the range two fields.
  - A date shows a short month, the day and a four-digit year, in the order of the persona's locale.
  - A placeholder shows a format example only when the format is required. A label has at most three words.
  - An explanation never sits on the page. The explanation goes behind a tooltip, a popover or a link to help.

  **Tables and charts**

  - Table cells are not editable, except for a small edit to one cell where a mistake costs little. An editable cell saves right away.
  - Only inset tables paginate. A full-size table loads more rows as the persona scrolls. The rows may scroll inside a table fixed in place.
  - A chart always comes from a charting library, never from components. The chart's colors come from a palette in the theme.
  - 7 ± 2 is a guideline, not a hard limit. Going well past the guideline suggests a different pattern.

  ### Upgrading

  ```bash
  git pull
  npm run agents:install
  ```

  Update any prompt or note that loads a renamed skill by the old name. On a CircleChat host, also run `circlechat/sync-skills.sh`.

  **Full changelog:** https://github.com/borderux/recursica-knowledge/compare/@recursica/knowledge@0.8.0...main

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
