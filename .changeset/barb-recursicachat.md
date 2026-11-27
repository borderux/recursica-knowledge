---
"@recursica/knowledge": minor
---

Barb on RecursicaChat 2.0 (version 0.2.0). There she runs every review in one fixed order (the code checks, Kev's first pass, a checker per skill, Feisty on every finding), and never skips Kev. The report gives the findings, the checks not made, and adapter issues drafted for a person to file.

- Her RecursicaChat instructions are `portable/recursicachat/agents/barb/INSTRUCTIONS.md`, built from the new `agents/barb/SKILL.recursicachat.md` and `platform/recursicachat.md`. They say who she is, the review's steps and report, the messages people send (`@barb review <screen path or pull request>`, `@barb right <n>` and `@barb wrong <n> <why>`), that the answers become Kev's training labels, that screenshots are not reviewed yet, and that a chat reply's one tool is propose_plan, for posting a plan.
- Her `SKILL.md` runs the review with a shell and subagents, and skips Kev on a large file or a full review, so a `platform/recursicachat.md` alone would have claimed tools she has no access to there. Her RecursicaChat body is its own file, as Claire's is.
- `runtime/recursicachat.json`: autonomy `ask`, the Docker sandbox, and three starters. The model is the stack's route, in `agents.barb.recursicachat` in site.json.
- `PORTING.md` describes her on RecursicaChat. A test checks the built instructions.
- Her Buzz prompt, her Claude Code agent and her CircleChat persona are unchanged.
