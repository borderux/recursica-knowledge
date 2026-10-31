---
"@recursica/knowledge": minor
---

Loki now lives on CircleChat only. He makes exactly what a request asks for, such as one 15-minute transcript, with no study plan or answer key unless the request asks for one. He picks sensible values for anything left out and asks a question only when something is truly open. Each transcript is his reply: with his CircleChat agent set to deliverables-only, CircleChat saves a long reply as `reply.md` on the message or the task, so he calls no tool and writes no action to deliver it. This replaces the write, check and attach steps, which failed on gpt-oss. The synthetic banner, the made-up-names rule and the refusal to hand fake data into a real dataset stay. His Buzz prompt and settings, his Claude Code artifact, `nest/bin/deploy-loki.sh` and the Loki sandbox guide are removed; what they explained about the fence is in `agents/loki/PORTING.md`.
