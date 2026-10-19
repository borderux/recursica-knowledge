---
"@recursica/knowledge": minor
---

## Porter

Porter is a new agent. The Mantine adapter is the golden adapter. When the Mantine adapter publishes a release, Porter ports the change to the other Recursica adapters: MUI v7, Beam and Angular Material.

- **One port per adapter.** Porter reads the release, builds a reference package for each target adapter, and sends one porter-adapter to each target. The porter-adapters run at the same time. Each porter-adapter follows `ADAPTER_AGENT_INSTRUCTIONS.md` in the `borderux/recursica` repository and opens a pull request on the target adapter.
- **One summary.** Porter posts one summary with a pull request link for each adapter. Porter never changes the Mantine adapter and never merges.
- **Runs in Claude Code and on CircleChat.** In a session, the user names the Mantine release to port. On CircleChat, a release watcher announces each new release once, and Porter starts from that announcement.
- **A job runner for heavy work.** `circlechat/jobd` runs each port in a separate container with a memory cap. Each machine has a limit on how many ports run at once. Each job has a fixed type and an allowed list of repositories, so a request cannot run an arbitrary command. Secrets pass by name, and a signed message tells CircleChat when a job ends.
- **Configured in `site.json`.** Each machine can list the jobs the machine runs. A Porter block names the release to watch, the target adapters and the person to mention with results.

### Upgrading

Porter needs the CircleChat host kit. On a CircleChat host, add the jobs and Porter blocks to `site.json`, rerun `circlechat/setup-node.sh` on each machine that runs jobs, and rerun `circlechat/setup-host.sh`. Then install Porter in the CircleChat UI and run `circlechat/setup-agent.sh porter`.
