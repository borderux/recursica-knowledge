---
"@recursica/knowledge": minor
---

CircleChat host kit: `circlechat/check-agent.sh <handle>` checks how one agent behaves on a running CircleChat. Run it on the stack's control computer, by hand, after `setup-agent.sh`, which prints the command and never runs it. It works in a private throwaway channel, on throwaway tasks, and archives them at the end. It checks four things:

- A request that arrives during a running turn still gets answered. Its run waits in the agent's queue and never fails.
- A question gets asked once, then waits through heartbeats until a reply, and the agent then acts.
- A task moved to review gets no comment, status change or file from the agent.
- A reply past the chat limit (2,000 characters, or 600 with `CHECK_DELIVERABLES_ONLY=1` for a deliverables-only agent) is posted as its opening paragraph, with the whole reply attached as `reply.md`.

It prints one PASS, FAIL or SKIP line per check and exits 1 on any failure. Each wait has a time limit, set by a `CHECK_*` variable. The check needs the CircleChat fork's agent queue.

The check signs in as its own CircleChat account, made only for the check, and signs out at the end. The account is a member of the agents' workspace and never an admin, and the check stops when the account has another role. The email is `site.check_account` in site.json, or `agent-check@<site.public_host>`. The password is the new `CC_CHECK_PASSWORD` secret in the stack's GitHub environment: the "Deploy secrets" workflow passes it, and the secrets helper writes it to `$CC_DIR/agent-check.env` only, mode 600, owned by the owner. `kit/check-account.mjs` makes the account inside CircleChat's api container, with CircleChat's own password hashing, and sets the role back to member when the role changed. The account is locked except while a check runs: locked, its stored password is the hash of a random secret nothing keeps, and its sessions are ended, so the delivered password signs in nowhere. The secrets deploy and the full setup leave it locked. `check-agent.sh` unlocks it, runs the check, and locks it again on every way out, a failed check, an error and Ctrl-C included. The password reaches the container on stdin and is never printed.

A member sees no run's error text and no agent's deliverables-only setting, so check 1 fails on any failed run of the request, and check 4 takes the setting from `CHECK_DELIVERABLES_ONLY`.

Tests run the check on GitHub against a stand-in CircleChat that gives a member only what CircleChat gives a member and refuses the admin-only routes, and a scripted stand-in agent. Other tests cover the account step, the password file and the workflow's list of secrets, and the smoke install makes the account against CircleChat's real database.

The rules for reading a request are in CircleChat's prompt for every agent, not in Loki's persona: the person's newest comment is the request and the title is a label, a request that names its deliverable is clear, and an agent asks once, then waits. Loki's persona is unchanged, and a test checks that it never contradicts those rules.
