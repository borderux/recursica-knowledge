---
"@recursica/knowledge": minor
---

Claire on RecursicaChat 2.0 (version 0.2.0). On RecursicaChat she analyzes a study in a research repo in GitHub, not in BigQuery and Drive. She proposes terms, tagged quotes, findings, personas and themes as a pull request, which a research reviewer merges.

- Her RecursicaChat instructions are `portable/recursicachat/agents/claire/INSTRUCTIONS.md`, built from the new `agents/claire/SKILL.recursicachat.md` and `platform/recursicachat.md`. Her Buzz prompt and her Claude Code agent are unchanged.
- She works one interview and one pass per turn, and keeps her progress on her pull request's branch, so a restart or a long study loses nothing.
- `runtime/recursicachat.json`: autonomy `ask`, the Docker sandbox, and four starters.
- Her repo tools come from the Claire repos MCP server, which runs outside the RecursicaChat server through her two GitHub Apps. An admin adds it on the server and grants it to Claire alone.
- `scripts/build-agents.mjs`: an agent can keep one target's body in `SKILL.<target>.md` when its method differs there. `scripts/check-writing.mjs` checks those files too.
