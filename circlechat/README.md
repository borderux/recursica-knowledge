# CircleChat setup for the Recursica agents

Runs Betty, Barb and Norm on a self-hosted [CircleChat](https://github.com/tashfeenahmed/circlechat)
with the Hermes runtime, each with its own Anthropic key, all reading the skills in this repo.

Tested on Windows + WSL2 (Ubuntu 24.04) + Docker Desktop, reached over Tailscale.

## Install, in order

Run everything in the **Ubuntu (WSL) terminal**, never PowerShell (except the two Tailscale lines).

1. Clone CircleChat to `~/circlechat` and this repo anywhere.
2. `TS_HOST=<your-pc>.<tailnet>.ts.net ./circlechat/setup-host.sh` — fixes `.env`, ports, shared workspace, pulls images, starts the stack and the prototype dev server.
3. In PowerShell, run the two `tailscale serve` lines the script prints.
4. For each agent: add it in the CircleChat UI (**Members → Add agent**: Hermes, provider Anthropic, paste that agent's key, **Install + link**), wait for it to finish, then:
   ```bash
   ./circlechat/setup-agent.sh betty
   ./circlechat/setup-agent.sh barb
   GITHUB_TOKEN=github_pat_... ./circlechat/setup-agent.sh norm
   ```
5. Test: `@betty hello`, `@barb run node -v`, `@norm list open PRs on borderux/recursica-knowledge`.

After merging a knowledge PR: `./circlechat/sync-skills.sh`.

## The agents

| Agent | Job                                                                                                       | Writes                         |
| ----- | --------------------------------------------------------------------------------------------------------- | ------------------------------ |
| Betty | Designs and builds prototypes in `/workspace/betty-test-proto-repo`                                       | Prototype code                 |
| Barb  | Reviews Betty's screens against the skills (subagents: checker, feisty). Flags knowledge problems to Norm | Nothing                        |
| Norm  | Turns Barb's knowledge notes into PRs on this repo                                                        | PR branches only, never merges |

Persona text lives in `souls/`. Barb's is her `agents/barb/SKILL.md` plus `souls/barb.md`.
Edit these files, not the live `SOUL.md`, then rerun `setup-agent.sh` — it replaces its own section and leaves CircleChat's part alone.

## Hard-won lessons (read before debugging)

- **Use the UI's Install + link to create agents.** Never insert agent rows in Postgres or hand-write `bridge-config.json`. The bridge only reads `handle`, `token`, `hermesHome` from it; tokens come from the install.
- **Never `rm -rf hermes-homes`.** Each agent's real setup lives in `hermes-homes/.hermes-<handle>/`.
- **Each agent's key lives in its own home.** The install puts it there. Nothing reads `ANTHROPIC_API_KEY_BETTY`-style lines in CircleChat's `.env`.
- **The model that runs is in `.hermes-<handle>/config.yaml`,** not the label on the agent page.
- **Don't `git checkout compose.yml`** — the port change (8080) lives there. `setup-host.sh` reapplies it.
- **`restart` doesn't reload `.env`.** Use `up -d --force-recreate`.
- **Edit files in WSL (`~/…`), not the Windows copy (`C:\Users\…`).** Docker reads the WSL one.
- **Docker Desktop can't mount symlinks.** Use real directories.
- **One turn per agent at a time.** Messages sent while an agent is busy are dropped (`agent_busy`), not queued. Big tasks get split into subtasks (see Betty's soul).
- **Files under `hermes-homes` are owned by the container.** Use `sudo` to read or edit them.
- `HERMES_HOME=undefined` in bridge logs means the agent's `hermesHome` is missing — i.e. it wasn't installed through the UI.
- A 502 right after `up` means the api is still starting. Wait 30 seconds.
