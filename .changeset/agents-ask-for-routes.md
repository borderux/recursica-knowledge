---
"@recursica/knowledge": patch
---

Agents never name a model. Each agent's `runtime/claude-code.json` names a route by its role (`route`: `coder`, `judge`, `general`, `fast`, `reasoning` or `vision`) in place of `model`, and a stack's site.json maps the route to a model. Barb, Betty, Claire, Edie, Janice and Stu ask for `reasoning`, Porter for `coder`, and Alan for `general`. Each route comment keeps the reason the old model comment gave.

- The Claude Code artifacts in `portable/claude-code/agents/` say `model: inherit`, so a plain session's own model decides.
- Alan's opencode settings name no model.
- Three lines of agent instructions no longer name the model a lesson came from.
- The CI smoke install's route is `general`.
- `scripts/build-agents.test.mjs` fails on a model name in an agent's runtime or platform files.

Each changed agent's version is raised by a patch.
