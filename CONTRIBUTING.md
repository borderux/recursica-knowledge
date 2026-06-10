# Contributing to Recursica Knowledge

Thank you for contributing to the Recursica Design System Agent Skills and Knowledge base!

Please refer to the appropriate guide depending on what you would like to contribute:

- **[Contributing Components](docs/CONTRIBUTING_COMPONENT.md)**: Guidelines for adding or updating UI component documentation in the `components/` directory.
- **[Contributing Skills](docs/CONTRIBUTING_SKILL.md)**: Guidelines for creating, extending, and versioning modular Claude Agent Skills in the `skills/` directory.

---

## 🔄 Versioning & Publishing

If you are proposing general changes to the repository or want to publish/release new package versions:

- We use **Changesets** to manage version numbers and release changelogs.
- To create a changeset for the entire repository (`@recursica/knowledge` root package) or individual skills, run:
  ```bash
  npx changeset
  ```
- For detailed step-by-step instructions on how the Changesets workflow operates, see **[Contributing Skills (Changesets Guide)](docs/CONTRIBUTING_SKILL.md#🔄-versioning--changesets)**.
