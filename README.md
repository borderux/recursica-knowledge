# Recursica Knowledge

Welcome to the central repository for **Recursica Design System Agent Skills and Knowledge**. This repository acts as a registered marketplace for Claude Code plugins and modular agent skills, allowing AI coding assistants to gain deep, procedural knowledge of the Recursica architecture, component definitions, and styling principles.

## 🚀 Getting Started & Installation

For detailed step-by-step setup guides (using the npm package or the Claude plugin marketplace), please see **[SETUP.md](SETUP.md)**.

---

## 🐝 Running the Buzz agents

This repository is also the durable record of the Buzz agents built around this knowledge — Claire, Stu, Janice and Alan — and of the runtime tooling they need. Nothing here is loaded when you install the design-system plugin; it is a separate stack with its own install path.

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
