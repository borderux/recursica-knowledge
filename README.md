# Recursica Knowledge

Welcome to the central repository for **Recursica Design System Agent Skills and Knowledge**. This repository acts as a registered marketplace for Claude Code plugins and modular agent skills, allowing AI coding assistants to gain deep, procedural knowledge of the Recursica architecture, component definitions, and styling principles.

## 🚀 Getting Started & Installation

For detailed step-by-step setup guides (using the npm package or the Claude plugin marketplace), please see **[SETUP.md](SETUP.md)**.

---

## 🤖 Using the design agents in Claude Code

Betty (builds screens), Barb (reviews them, with her helpers Checker and Feisty), Alan (maintains the rules) and Edie (edits the writing, with her helper Comparer) can be installed for every project on your machine. Edie runs in Claude Code only. You need Node 20 or newer; nothing else to install.

**One-time setup**

1. Clone this repository into the folder where you keep your code. Betty looks for the rules, and for the projects she builds in, next to this folder.
2. Delete any agent files you copied in by hand — `betty.md`, `barb.md`, `checker.md`, `feisty.md`, `alan.md`, `edie.md`, `comparer.md` — from `~/.claude/agents` and from any project's `.claude/agents` folder. The installer never overwrites a file it did not write, and a project's own copy overrides the shared one.
3. In this folder, run:

   ```bash
   npm run agents:install
   ```

   You should see seven ✓ lines. If one says "a copy this script did not write", delete that file and run it again.

**Whenever the agents change**

```bash
git pull
npm run agents:install
```

`npm run agents:install:check` reports what is out of date without changing anything, and lists any project copies that are overriding the shared ones. Keep this checkout on `main` — Barb follows whatever branch it is on.

Claire, Stu, Janice and Loki are not installed this way: they work with client data, and the protection around it cannot travel in a copied file. Agents running elsewhere update elsewhere — Buzz Desktop with `node buzz-agents/scripts/sync-prompts.mjs`, a CircleChat host with `circlechat/sync-skills.sh`, and instructions pasted into a Claude app Project by hand.

---

## ⚡ Using Recursica in Grok Build

[Grok Build](https://x.ai/news/grok-build-cli), xAI's coding agent, installs Recursica as one marketplace plugin. The plugin holds all 66 skills, Betty and Barb with Barb's helpers Checker and Feisty, and two MCP servers: the Recursica knowledge server and `@recursica/mcp`. You need Grok Build and Node 20 or newer.

1. Add this repository as a marketplace. Nothing installs yet:

   ```bash
   grok plugin marketplace add borderux/recursica-knowledge
   ```

2. Install the plugin. `--trust` lets the plugin start its MCP servers:

   ```bash
   grok plugin install recursica --trust
   ```

3. Let Betty's review reach Barb's checkers. Grok allows one level of subagents by default, and Betty dispatches Barb, who dispatches her checkers. Add these lines to `~/.grok/config.toml`. A plugin cannot set them for you:

   ```toml
   [subagents]
   max_depth = 2
   ```

4. Start a new Grok session. Run `grok inspect` to see the skills, the agents and the MCP servers the plugin added.

In Grok the agents carry the plugin's name, so Betty is `recursica:betty` and Barb is `recursica:barb`. Update the plugin with `grok plugin update recursica`. Alan and Edie maintain this repository and run in Claude Code only. Claire, Stu, Janice and Loki work with client data and are never in the plugin.

---

## 🐝 Running the Buzz agents

This repository is also the durable record of the Buzz agents built around this knowledge — Claire, Stu, Janice, Betty, Barb and Alan — and of the runtime tooling they need. Nothing here is loaded when you install the design-system plugin; it is a separate stack with its own install path.

| If you want to…                                | Read                                                                     |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| Install the agents on your own Mac             | **[buzz-agents/INSTALL.md](buzz-agents/INSTALL.md)**                     |
| Hand them to a teammate as the community owner | [buzz-agents/ONBOARD_AN_OPERATOR.md](buzz-agents/ONBOARD_AN_OPERATOR.md) |
| Change how the definitions are stored          | [buzz-agents/README.md](buzz-agents/README.md)                           |

Requires macOS: the `buzz` CLI ships only inside Buzz Desktop, arm64 only, with no Linux or container build.

---

## 🤝 Contributing to our Knowledge

If you would like to document a new component or create a new Claude skill, please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed step-by-step instructions.

---

## 📦 Packaging and Building Skills

To package all agent skills into distributable `.zip` files:

```bash
npm run build
```

This build script scans the `skills/` directory — including the `components/` and `design-rules/` category folders — and compresses each individual skill folder into the `dist/` folder (e.g., `dist/recursica-skill-button.zip`). Any directory containing a `SKILL.md` is treated as a skill.
