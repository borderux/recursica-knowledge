# Recursica Knowledge

Welcome to the central repository for **Recursica Design System Agent Skills and Knowledge**. This repository acts as a registered marketplace for Claude Code plugins and modular agent skills, allowing AI coding assistants to gain deep, procedural knowledge of the Recursica architecture, component definitions, and styling principles.

## 🚀 Getting Started & Installation

For detailed step-by-step setup guides (using the npm package or the Claude plugin marketplace), please see **[SETUP.md](SETUP.md)**.

---

## 🤝 Contributing to our Knowledge

If you would like to document a new component or create a new Claude skill, please see [CONTRIBUTING.md](CONTRIBUTING.md) for detailed step-by-step instructions.

---

## 📦 Packaging and Building Skills

To package all agent skills into distributable `.zip` files:

```bash
npm run build
```

This build script scans the `skills/` directory and compresses each individual skill folder into the `dist/` folder (e.g., `dist/recursica-skill-creator.zip`).
