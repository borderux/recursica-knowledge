---
"@recursica/knowledge": minor
---

CircleChat host kit: `circlechat/check-agent.sh <handle>` checks how one agent behaves on a running CircleChat, as a person would see it. Run it after `setup-agent.sh`, which prints the command and never runs it. It drives CircleChat's API with a person's session, or a person's email and password, from the environment or `$CC_DIR/.env`. It works in a private throwaway channel, on throwaway tasks, and archives them at the end. It checks four things:

- A request that arrives during a running turn still gets answered. Its run waits in the agent's queue and is never refused as `agent_busy`.
- A question gets asked once, then waits through heartbeats until a person replies, and the agent then acts.
- A task a person moved to review gets no comment, status change or file from the agent.
- A reply past the chat limit (600 characters for a deliverables-only agent, 2,000 otherwise) is posted as its opening paragraph, with the whole reply attached as `reply.md`.

It prints one PASS, FAIL or SKIP line per check and exits 1 on any failure. Each wait has a time limit, set by a `CHECK_*` variable. The check needs the CircleChat fork's agent queue. A test runs it on GitHub against a stand-in CircleChat and a scripted stand-in agent.

The rules for reading a request are in CircleChat's prompt for every agent, not in Loki's persona: the person's newest comment is the request and the title is a label, a request that names its deliverable is clear, and an agent asks once, then waits. Loki's persona is unchanged, and a test checks that it never contradicts those rules.
