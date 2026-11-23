---
"@recursica/knowledge": minor
---

CircleChat host kit: "quiet" now means no agent work only. An open web app and a person online no longer hold an update. Every wait for a quiet RecursicaChat 2.0 server uses the new rule (`cluster/quiet.mjs`): the four Homebrew updates that interrupt work, each image pin that moves, the kit's move to a new commit on main, and the hourly sync's Hermes skills step.

Agent work is either of two things, both read from the server's database, read-only:

- **An agent turn, running or queued:** a delivery in state queued or injected, as before.
- **A service's run:** a service account drives an agent, and the service has a request open, in state pending or taken. The service marks the request done or declined when the run ends.

A request unchanged for more than a day counts as abandoned, so a service that crashed can't hold every update for good. A database that can't be read still counts as busy. The update job no longer reads the computer's sockets with `lsof`.
