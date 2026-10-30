# Porter on Hermes (CircleChat)

The prompt is `portable/circlechat/agents/porter/SOUL.md`, built from `SKILL.md` and
`platform/circlechat.md`, and installed by `circlechat/setup-agent.sh porter`. This file is the
configuration that has no place inside a prompt.

## Porter runs no ports itself

A port runs for hours and needs memory: Storybook, a browser, adapter-tester and a build, three
times at once. A CircleChat turn has a time limit (`HERMES_TIMEOUT`) and shares the control
machine with the other agents. So Porter's turns only read the release, send jobs, record them
and report. Each porter-adapter runs as a **job** on a **job runner** (`circlechat/jobd`):

- A job runner runs on every machine whose `site.json` node has a `jobs` block. It starts one
  container per job, from the `recursica/porter-job` image, with the node's memory cap
  (`jobs.memory_gb`) and at most `jobs.slots` jobs at once. A job that runs out of memory fails
  alone and is reported; it does not stop the machine.
- The job runner only runs the porter job type, only for the repositories `site.json` lists in
  `porter.targets`. A request cannot run an arbitrary command.
- Inside the job, Claude Code runs with `portable/claude-code/agents/porter-adapter.md` as the
  system prompt, clones the target repository, ports the change and opens the pull request.
- When the job ends, the job runner wakes Porter through the CircleChat workflow webhook.

## What Porter needs in its environment

`setup-agent.sh porter` writes these to Porter's `.env`:

| Variable | From | Holds |
| --- | --- | --- |
| `PORTER_JOB_NODES` | `site.json` nodes with `jobs`, best first | Job runner addresses |
| `JOBD_TOKEN` | the control machine's `.env` | The job runners' shared token |
| `PORTER_OWNER` | `site.json` `porter.owner` | The CircleChat handle to mention with a result |
| `CC_GATEWAY_URL`, `CC_GATEWAY_KEY` | `setup-agent.sh porter` | The model gateway's address and Porter's own gateway key, to get each job's task key |

Porter needs no GitHub token. Porter reads public releases, and the jobs push with their own token.

## What each job needs

A job holds no cloud key. Porter gets a gateway key for each adapter's subtask and puts the key in
the job request. The job runner gives the job that key and the gateway's address in a file in the
job's folder, and deletes the file when the job ends. Claude Code in the job sends every model
request to the gateway, and the subtask's "Cloud models" setting decides which model answers.

The job runner reads these from `~/.recursica-node.env` on its machine and passes only these to
the job:

| Variable | Holds |
| --- | --- |
| `PORTER_HOOK_URL`, `PORTER_HOOK_SECRET` | The CircleChat workflow webhook that wakes Porter |

The job gets no GitHub token from the job runner. Porter's GitHub App covers the three target adapters only, with Contents and Pull requests, and **no merge rights**. Protect `main` on each target with a ruleset whose bypass list is empty. The job asks the stack's token service for a token for the job's repo, with the job's task key. The token lasts at most one hour, and the job asks for a new token after 45 minutes. Commits use the app's bot identity, `<app-slug>[bot]`, which keeps the pull requests reviewable by the whole team.

## The trigger

`circlechat/kit/release-watch.mjs` runs every hour on the control machine. When the Mantine
adapter's latest GitHub release changes, the watcher posts `{"event": "release", ...}` to the same
workflow webhook. The first run only records the current release, so installing Porter never
starts a fan-out for an old release. The webhook's delivery id is `<repo>@<tag>`, and CircleChat
drops a repeated delivery, so one release starts one fan-out.
