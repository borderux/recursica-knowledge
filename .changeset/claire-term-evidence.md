---
"@recursica/knowledge": patch
---

Claire on RecursicaChat 2.0 takes a term's evidence from the quotes pass. In the research repo, a term in `lexicon/lexicon.json` has no `evidence` field, because its schema allows no other key. Her RecursicaChat instructions now say so: each quote lists the terms it shows in `terms`, every term she adds must be listed by at least one quote in that study's `quotes.json`, and she adds a term only when she has a line to quote for it. Her Buzz prompt, her Claude Code agent and the Lexicon subagent are unchanged. A test checks the built instructions. Claire 0.3.0: a major change by the kit's rule, since it narrows which terms she may add.
