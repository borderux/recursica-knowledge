---
"@recursica/knowledge": patch
---

CircleChat kit: each stack's own control computer checks the stack. An older agent's report no longer causes a false alarm about a stack.

- **The control computer checks the stack, on that computer.** The stack is up when the stack's RecursicaChat 2.0 server and model gateway each answer at a local address. Only the control computer lists the stack in the computer's report. A helper lists no stack.
- **Every other computer learns the stack's state from that report.** A stack down for 3 minutes posts once in the stack's channel, and once more when the stack is back. Before, a down stack posted at once.
- **An older agent's stacks are skipped.** An agent from before the services report checks CircleChat 1.x's web port for each stack. Once site.json drops `site.circlechat`, that agent reports a working stack as down. A watching computer now skips the stacks in such a report, and posts once that the agent needs a restart.

No check crosses Tailscale to another computer's stack. The computers still reach only each other's agent.
