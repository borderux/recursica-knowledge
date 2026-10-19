# Porting Porter

Porter ports a change released in the golden Recursica adapter (Mantine v8) to the MUI v7, Beam
and Angular Material adapters, and opens one pull request per adapter for a person to review.
**Porter needs room to build three adapters, a GitHub token that cannot merge, and a trigger.**

## What Porter needs

| | |
|---|---|
| Subagent dispatch | `porter-adapter` registered, and a platform where one agent starts another. |
| Room | Each port runs Storybook, a browser, adapter-tester and a build. Three at once ran a 32 GB laptop out of memory. Give each port about 12 GB, or run the ports one at a time. On CircleChat each port is a capped job on a job runner; see `runtime/hermes.md`. |
| Time | A port, with the full adapter-tester suites, can run for hours. A platform turn limit below that needs the job runner. |
| Tooling in the port's environment | Node 20+, git, the GitHub CLI or the GitHub API, and the browser adapter-tester uses. `circlechat/jobd/porter-job/Dockerfile` has Node, git, the GitHub CLI and the browsers. |
| A GitHub token | Contents and Pull requests on the three target adapters only. No access to the Mantine adapter, and no merge rights. The token, not the prompt, is what stops a merge. |
| Rulesets | `main` on each target adapter needs a pull request and an approval, with an empty bypass list. A token acts as the person who made the token. |
| A trigger | A person naming a release tag, or the release watcher (`circlechat/kit/release-watch.mjs`). |

## Differences from the manual process

- Repositories are cloned over HTTPS with the job's token, not over SSH.
- On CircleChat, each port runs in a container, so the Storybook port rule matters only inside
  one container. The rule stays, because a session on one machine still needs the rule.
