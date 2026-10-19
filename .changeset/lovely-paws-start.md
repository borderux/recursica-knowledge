---
"@recursica/knowledge": patch
---

## Janice joins the portable agents

Janice reviews the research team's finished work against the agents' own session transcripts. She checks Claire, Stu and Claire's subagents, and reports each claim the evidence contradicts. Until now Janice existed only as a hand-written Buzz prompt.

- **One source for every build.** Janice now lives in `agents/janice/`, like the other agents. The Buzz prompt is built from that source.
- **A Claude Code build.** `portable/claude-code/agents/janice.md` runs Janice in a plain session. The user names the turn and the transcript, and Janice reports findings in the session.
- **Read-only by design.** The Claude Code build gets Read, Grep, Glob and Bash, and no tools that write. Janice reports problems and never fixes them.
- **Porting notes.** `agents/janice/PORTING.md` says what Janice needs: access to the transcripts, the review checklist, a signal to start, and a place to report. It also explains why there is no CircleChat build yet.
- **Clearer wording.** Seventeen sentences used "it" or "them" without naming the noun. Each now names the noun, such as the checklist, the roster or the finding. No rule changed.
- **Not installed automatically.** Like Claire, Stu and Loki, Janice works near client data, so `npm run agents:install` leaves her out. The README and AGENT.md say so.

### Upgrading

Nothing changes for agents already installed through `npm run agents:install`. On Buzz, Janice's prompt picks up the wording fixes the next time prompts are synced. Her rules are the same.
