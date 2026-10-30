---
"@recursica/knowledge": minor
---

## CircleChat host kit changes since 0.12.0

The CircleChat host kit changed in many places since 0.12.0. The changes below are grouped by area.

### Model keys and the gateway router

- **Only the model gateway holds the cloud keys.** Every agent and every port job sends each model request to the stack's gateway. LiteLLM reads the keys from `model-keys.env`, so no container's settings show a key.
- **A router sits in front of LiteLLM.** The router checks each agent's gateway key, picks the model, and writes one spend log line per request. The router passes on only model requests, so LiteLLM's admin endpoints stay out of reach.
- **`model_keys` and `agents` in `site.json`.** `model_keys` names each cloud key, with the key's provider, model and agents. `agents` sets each agent's routes and cloud switch.
- **Each task's "Cloud models" setting decides when a cloud model answers.** The choices are Cluster only, Cloud after a wait, and Cloud now. A route lists only the cluster's models, so a busy cluster never calls a cloud model.
- **Each key lives in GitHub as `MODEL_KEY_<NAME>`.** `deploy/set-model-keys.sh` asks for each value at the keyboard and saves the value as a GitHub secret.
- **Port jobs get a task key.** A port job calls the gateway with a key for one task, and holds no cloud key.
- **The key check fails when a cloud key leaks.** `gateway/key-check.mjs` looks in CircleChat's database, the agent homes and the backups. The check never follows a symlink.
- **Every Hermes setting that picks a model points at the gateway.** The setting covers the main model, compression summaries, side tasks and subagents. `setup-agent.sh` stops and names each setting that would still skip the gateway.
- **The gateway accepts a key from each network the gateway joins.** Before this fix, every agent got `403 outside_cluster`.

### Model servers

- **A computer can run several model servers.** Each node in `site.json` lists `servers`, of the kind `ollama` or `mlx-lm`. An mlx-lm server runs on a Mac only.
- **Any agent can use any server and model.** A route names a model as `<node>/<server id>/<model id>`. The spend log names the server and the model, so runs compare by model.
- **Each model records its memory.** The config check refuses a node whose models need more than the node's `model_memory_gb`.
- **Ollama's settings come from `site.json`.** An Ollama server sets `context_length`, `parallel` and `keep_alive`.
- **Agents never reach a model server's own API.** The outgoing filter closes every model server port, so only the gateway reaches a model server.

### Client and demo stacks

- **A stack runs on the computers picked for the stack.** `site.computers` names one computer or the whole cluster. `kit/stack-site.mjs` writes the stack's `site.json` from the cluster's `site.json`, with free ports.
- **A demo stack follows a client stack's rules.** A demo gets cloud keys only with a recorded permission: who granted the permission, the date and who pays. Without a yes, a demo runs on local models only.
- **Limits make a large computer act like a smaller one.** `nodes[].limits` caps a stack's CPUs, memory and model memory. The setup leaves out each model that does not fit, and names the model.
- **`offboard.sh check` checks the cluster's own stack too.** The check covers each model server, Kev's model, the job runner and the gateway.

### Security fixes

- **Root runs the kit only from a checkout outside the agents' workspace.** `kit/check-kit.sh` refuses a checkout inside a workspace, and a checkout another account can change.
- **Root never follows a symlink an agent planted.** `kit/safe-files.mjs` takes every write in the workspace and the agent homes. `sync-skills.sh` and `setup-agent.sh` run as the stack's owner, never as root.
- **No kit script runs git in the shared workspace.** An agent can change a checkout's git hooks, and git runs the hooks.
- **A secrets deploy and a release upgrade need no password-free sudo.** The secrets helper and the root update job take each step that needs root. The database password passes on stdin, never on a command line.
- **The job runner listens only on loopback and Tailscale.**
- **The firewall rules pass Tailscale's addresses only on the Tailscale adapter.** The rules cover pf on a Mac and the Windows firewall.
- **CircleChat's caddy, postgres and redis images are pinned by digest.**
- **No setting holds a value from one install.** `site.stack_name`, `site.timezone` and `site.cloud_models.payer` replace the values the kit had built in.

### Slack messages

- **Each Slack message names the computer or the stack that sent the message.** A computer can set an emoji in `nodes[].slack_icon`. Slack shows both only when the Slack app has the `chat:write.customize` scope.
- **The backup and the restore test report every failure to Slack, once.**
- **The update job posts when Lima or Colima has a new release.**

### The network check

- **The cluster agent checks each computer's network every 5 minutes.** The agent posts in the cluster's Slack channel when one of three things happens:
  - The default route leads to a router other than `nodes[].router`.
  - github.com resolves to an address outside GitHub's own ranges.
  - The computer's office network address changes.

### Kev's private notes

- **Kev's disagreement notes go to a private repo.** The notes can quote the application's code. The hourly job pushes only to the repo in `data.repo`, and refuses a public repo.
- **A person reviews the notes before Kev's training reads them.** Each change opens a pull request. Training reads only the notes on the private repo's `main` branch.
- **The job is off by default.** With no `data.repo`, neither job runs.

### The setup on a Mac

- **The kit runs Colima and Ollama as LaunchDaemons.** A full `setup-host.sh` on a Mac installs both. The setup stops when a second Colima or Ollama daemon runs outside the kit.
- **Each Colima VM stops cleanly before a Mac restart.** A VM can lose writes when macOS restarts under the VM.
- **The gateway's port for port jobs goes through `tailscale serve`.** Colima's VM does not hold the Mac's Tailscale address.
- **The gateway and the backup work under Colima.** The stack's owner owns the gateway's secrets and the backup's staging folder. Colima reads the Mac's files as the owner.
- **Root jobs get `HOME` and the full path to `chown`.** The backup and the restore test failed on a Mac without both.
- **The setup serves CircleChat and the app preview on the tailnet.** With `site.proxy` set to `tailscale`, the setup runs `tailscale serve` and checks the result.

### Upgrading

Make each change below on an existing install before upgrading:

1. **Add `site.stack_name` and `site.timezone` to `site.json`.** Set `stack_name` to the name of the stack's GitHub environment. Set `timezone` to the time zone the reboot buttons used. Without `stack_name`, the backups move to a new path, and the secrets helper accepts only `cluster`.
2. **Rename the GitHub secret `ANTHROPIC_API_KEY` to `MODEL_KEY_DEFAULT`.** Move `PORTER_ANTHROPIC_API_KEY` to a `MODEL_KEY_<NAME>` secret too, and list `porter` in that key's agents.
3. **Remove `data.kev_disagreements_branch` from `site.json`.** The config check refuses the setting. Set `data.repo` to a private repo to keep the notes job.
4. **Clone the kit to a checkout outside the agents' workspace,** such as `~/recursica-knowledge`. Root refuses to run a checkout inside the workspace.
5. **Rerun `setup-host.sh` and `install-cluster.sh` from that checkout.** Also rerun `install-secrets-helper.sh`, and `setup-pc.sh` on Linux or in WSL.
