# CircleChat setup for the Recursica agents

Runs Betty, Barb and Alan (and optionally Loki) on a self-hosted
[CircleChat](https://github.com/tashfeenahmed/circlechat) with the Hermes runtime, all reading the
skills in this repo. Linux or macOS, on one machine or many.

## What is yours, and what is the repo's

Nothing about a deployment lives in this repository. Two files on the control machine, both
outside any repo, hold all of it:

| File | Holds | Example |
| --- | --- | --- |
| `$CC_DIR/site.json` | Machines, how to reach them, what each runs, model routes, the app repo | `circlechat/site.example.json` |
| `$CC_DIR/.env` | Secrets: `ANTHROPIC_API_KEY`, `KEV_ENGINE_KEY`, `SLACK_WEBHOOK_URL`, `LITELLM_MASTER_KEY` (generated) | — |

Each agent's own key and GitHub token stay in its Hermes home (`setup-agent.sh` puts them there).
Each extra machine keeps the secrets its services need in `~/.recursica-node.env`.

## Machines

`site.json` lists every machine as a **node**, as many as you have. Exactly one is the
**control** node: it runs CircleChat, the agents, the model gateway and the notifier. Any node can
serve models and a Kev-engine. `address` is how the control machine's containers reach it: a
Tailscale or other VPN address, or `host.docker.internal` for the control machine itself.

**Routes** are the names agents ask for. Each maps to an ordered list of backends
(`<node>/<model id>` or `anthropic/<model>`); the gateway tries them in order, so put the
fallback last. Kev-engines are tried best-first by `priority`, and Kev moves on by itself when one
is unreachable. Add a machine by adding a node and rerunning `setup-host.sh`.

## Install, in order

1. **Control machine:** clone CircleChat to `~/circlechat` and this repo anywhere. Write
   `~/circlechat/site.json` from `circlechat/site.example.json`, and add secrets to
   `~/circlechat/.env`.
2. `./circlechat/setup-host.sh`. It validates `site.json` (and stops before changing anything if
   it is wrong), then: fixes `.env` (including `HERMES_TIMEOUT`), ports, the shared workspace and
   its checkouts, copies Kev, starts CircleChat, the app preview, the model gateway
   (`localhost:4000`) and the Slack notifier, and installs start-at-boot and hourly jobs (systemd
   or launchd). It turns on this repository's commit hooks in Alan's checkout; add
   `LOCAL_REDACTIONS=<path to your local-redactions.json>` so client names are checked too.
3. **Every other machine:** copy `site.json` over (it holds no secrets), put its services'
   secrets in `~/.recursica-node.env`, and run `./circlechat/setup-node.sh <node name>`.
4. Point your HTTPS name at `127.0.0.1:<port>`; the script prints the Tailscale commands.
5. For each agent: add it in the CircleChat UI (**Members → Add agent**: Hermes, provider
   Anthropic, paste that agent's key, **Install + link**), wait for it to finish, then:
   ```bash
   ./circlechat/setup-agent.sh betty
   KEV_ENGINE_KEY=... ./circlechat/setup-agent.sh barb
   GITHUB_TOKEN=github_pat_... ./circlechat/setup-agent.sh alan   # stored as ALAN_GITHUB_PAT
   ```
   `setup-agent.sh` fills each persona's deploy tokens (`@APP_REPO@`, `@APP_REPO_GITHUB@`) from
   `site.json`, and gives Barb the Kev-engine list. Alan's token is fine-grained: Contents, Pull
   requests and Issues on this repository, Issues on the adapter repositories and Theme Forge,
   and **no merge rights**. Protect `main` with a ruleset whose bypass list is empty; a token acts
   as the person who made it.
6. Test: `@betty hello`, `@barb run node -v`, `@alan list open PRs on <this repo>`.

After that, an hourly job pulls this repo and reruns `setup-agent.sh` for every agent
(`sync-skills.sh`), so merged changes reach the agents within the hour.

## Notifications

With `"notify": { "slack": true }` and `SLACK_WEBHOOK_URL` set, the notifier posts to Slack:
task created, assigned, status changed and done; every comment, flagged **needs @person** when it
mentions one; agent messages CircleChat rejected (otherwise silent); and tasks blocked 24 h or in
progress 12 h with no activity. It reads the database, so it misses nothing across restarts.

## Privacy

`site.example.json` is the only deployment-shaped file here, and it holds placeholders.
Don't commit a real `site.json`, an `.env`, a machine name, an address or a key. Kev's
disagreement notes can be pushed to a branch (`data.kev_disagreements_branch`); leave it empty when
the application's code is confidential, since that branch is as public as this repository.

## The agents

| Agent | Job                                                                                                  | Writes                                           |
| ----- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Betty | Designs and builds prototypes in the app repo (`/workspace/<repos.app_dir>`)                       | Prototype code                                   |
| Barb  | Reviews Betty's screens against the skills (subagents: checker, feisty). Flags rule problems to Alan | Her reports in `/workspace/reviews`              |
| Alan  | Turns feedback about the rules into PRs on this repo, and adapter or theme problems into issues      | PR branches in `/workspace/kb-proposals`, issues |

Loki is set up the same way. On CircleChat he has no Drive: he writes only in `/workspace/loki`,
and `setup-agent.sh` refuses him if his config has any tool server that could reach client data.
He runs on a local model, so the script also pins his context sizes; see
`agents/loki/runtime/hermes.md`.

**Each persona is the built file `portable/circlechat/agents/<handle>/SOUL.md`**, made by
`npm run agents:build` from `agents/<handle>/SKILL.md` and `agents/<handle>/platform/circlechat.md`.
So a change to how an agent works goes in `agents/<handle>/SKILL.md`, and a change to how it runs
_here_ goes in its `platform/circlechat.md`. Never edit the live `SOUL.md` in a Hermes home:
`setup-agent.sh` replaces its own marked section and leaves CircleChat's part alone.

Never paste `agents/<handle>/SKILL.md` in directly. It still holds unfilled
`<!-- platform:NAME -->` markers, and pasting it silently drops whole passages — Barb once lost
her identity line, her intake paragraph and her write fence that way.

Barb's Hermes settings (delegation limits, timeout, Kev access) are explained in
`agents/barb/runtime/hermes.md`. `setup-agent.sh barb` writes the delegation limits when her
`config.yaml` has none, and tells you to check them by hand when it does.

## Hard-won lessons (read before debugging)

- **Compose needs both files:** `docker compose -f compose.yml -f compose.agents.yml ...`. Without the second, the api loses Docker access and new agents fail to install.
- **On WSL, keep WSL running.** It stops when no Windows program holds it open, taking every service with it. `setup-host.sh` prints the keep-alive task.

- **Use the UI's Install + link to create agents.** Never insert agent rows in Postgres or hand-write `bridge-config.json`. The bridge only reads `handle`, `token`, `hermesHome` from it; tokens come from the install.
- **Never `rm -rf hermes-homes`.** Each agent's real setup lives in `hermes-homes/.hermes-<handle>/`.
- **Each agent's key lives in its own home.** The install puts it there. Nothing reads `ANTHROPIC_API_KEY_BETTY`-style lines in CircleChat's `.env`.
- **The model that runs is in `.hermes-<handle>/config.yaml`,** not the label on the agent page. `setup-agent.sh` sets Alan's to Sonnet; pass `MODEL=...` to set another agent's.
- **A review that finishes but never appears is `HERMES_TIMEOUT`.** The api drops replies that arrive later than it + 60 s. `setup-host.sh` sets 4000.
- **Don't `git checkout compose.yml`** — the port change (8080) lives there. `setup-host.sh` reapplies it.
- **`restart` doesn't reload `.env`.** Use `up -d --force-recreate`.
- **Edit files in WSL (`~/…`), not the Windows copy (`C:\Users\…`).** Docker reads the WSL one.
- **Docker Desktop can't mount symlinks.** Use real directories.
- **One turn per agent at a time.** Messages sent while an agent is busy are dropped (`agent_busy`), not queued. Big tasks get split into subtasks.
- **Files under `hermes-homes` are owned by the container.** Use `sudo` to read or edit them.
- `HERMES_HOME=undefined` in bridge logs means the agent's `hermesHome` is missing — i.e. it wasn't installed through the UI.
- A 502 right after `up` means the api is still starting. Wait 30 seconds.
