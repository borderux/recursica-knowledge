---
"@recursica/knowledge": minor
---

Betty on RecursicaChat 2.0 (version 0.2.0). There she works through the brief stage: she pins the inputs, makes the facts sheet, asks each conflict as a "Needs you" question with its options as buttons, writes the brief, and asks people to approve it. People decide every conflict, and the record goes on a pull request in the project's private prototype repo, which a person merges.

- Her RecursicaChat instructions are `portable/recursicachat/agents/betty/INSTRUCTIONS.md`, built from the new `agents/betty/SKILL.recursicachat.md` and `platform/recursicachat.md`. They say who she is, the brief stage in order, the three messages people send (`@betty brief <design slug>`, `@betty status` and `@betty stop`), how to answer any other message, and that a chat reply's one tool is propose_plan, for posting a plan. The map and the prototype stages come later, and the instructions say so.
- `runtime/recursicachat.json`: autonomy `ask`, the Docker sandbox, and three starters. The model is the stack's route, in `agents.betty.recursicachat` in site.json.
- `PORTING.md` describes the fence on RecursicaChat. A test checks the built instructions.
- Her Buzz prompt, her Claude Code agent and her CircleChat persona are unchanged.
