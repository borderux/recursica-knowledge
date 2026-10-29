# CircleChat setup for the Recursica agents

A client's IT team installs the platform with `circlechat/INSTALL.md`. This README holds the details each part of the kit needs.

Runs Betty, Barb and Alan (and optionally Loki) on a self-hosted
[CircleChat](https://github.com/tashfeenahmed/circlechat) with the Hermes runtime, all reading the
skills in this repo. Linux or macOS, on one machine or many.

## What is yours, and what is the repo's

Nothing about a deployment lives in this repository. Two files on the control machine, both
outside any repo, hold all of it:

| File                     | Holds                                                                                                                 | Example                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `$CC_DIR/site.json`      | Machines, how to reach them, what each runs, model routes, cloud keys' names, the app                                 | `circlechat/site.example.json` |
| `$CC_DIR/.env`           | Secrets other than cloud keys, such as `KEV_ENGINE_KEY` and `SLACK_BOT_TOKEN`                                         | —                              |
| `$CC_DIR/model-keys.env` | The cloud model keys, as `MODEL_KEY_<NAME>` lines. Root owns the file on Linux. Only the model gateway reads the file | —                              |

Each agent's gateway key and GitHub token stay in the agent's Hermes home (`setup-agent.sh` puts them there). No agent holds a cloud key.
Each extra machine keeps the secrets its services need in `~/.recursica-node.env`.

## Machines

`site.json` lists every machine as a **node**, as many as you have. Exactly one is the
**control** node: it runs CircleChat, the agents, the model gateway and the notifier. Any node can
serve models and a Kev-engine. `address` is how the control machine's containers reach it: a
Tailscale or other VPN address, or `host.docker.internal` for the control machine itself.

**Routes** are the names agents ask for. Each maps to an ordered list of the cluster's models
(`<node>/<server id>/<model id>`); the gateway tries them in order, so put the fallback last. A cloud model
never joins a route: cloud models come from `model_keys`, as "Cloud models and the model gateway" describes. Kev-engines are tried best-first by `priority`, and Kev moves on by itself when one
is unreachable. Add a machine by adding a node and rerunning `setup-host.sh`.

### Model servers

**A computer can run more than one model server.** List each server under the node's `servers`, with the models the server serves. The kit supports two kinds of server:

- `ollama`: Ollama, on a Mac or a PC. One Ollama server can serve several models.
- `mlx-lm`: mlx-lm's OpenAI-compatible server, `mlx_lm.server`, on a Mac only. An mlx-lm server serves one model, so run one server, on its own port, for each model. Start each one from the node's `services`, as `site.example.json` shows.

```json
"model_memory_gb": 96,
"servers": [
  { "id": "ollama", "kind": "ollama", "port": 11434,
    "models": [{ "id": "large-local", "model": "your-large-model", "memory_gb": 40 }] },
  { "id": "mlx", "kind": "mlx-lm", "port": 8081,
    "models": [{ "id": "large-mlx", "model": "your-org/your-large-model-mlx", "memory_gb": 40 }] }
]
```

- `model`: the name the server knows the model by. For mlx-lm, use the same name as the server's `--model`.
- `memory_gb`: the memory the model needs, in GB.
- `model_memory_gb`: the memory the computer gives its models. On a Mac, that is unified memory, less what macOS and other work need. On a PC, that is the GPU's memory.

**An Ollama server on the control computer can set three of Ollama's own settings.** On a Mac, the kit's Ollama service runs with each setting the server sets. A setting left out keeps Ollama's default.

| Setting in `site.json` | Ollama's setting        | What the setting sets                                                                     |
| ---------------------- | ----------------------- | ----------------------------------------------------------------------------------------- |
| `context_length`       | `OLLAMA_CONTEXT_LENGTH` | The context length, in tokens, for each model                                             |
| `parallel`             | `OLLAMA_NUM_PARALLEL`   | The requests each model answers at once                                                   |
| `keep_alive`           | `OLLAMA_KEEP_ALIVE`     | How long a model stays loaded: `"-1"` keeps each model loaded, or a time, such as `"30m"` |

```json
{
  "id": "ollama",
  "kind": "ollama",
  "port": 11434,
  "context_length": 131072,
  "parallel": 4,
  "keep_alive": "-1",
  "models": [
    { "id": "large-local", "model": "your-large-model", "memory_gb": 96 }
  ]
}
```

Each request that runs at once holds a context of its own in memory. Count the context in the model's `memory_gb`.

**Every listed model stays loaded,** so agents can use several models at once. The config check refuses a `site.json` whose models need more than a computer's `model_memory_gb`. The message names each model and the memory the model needs.

**Name a model as `<node>/<server id>/<model id>`,** such as `machine-2/mlx/large-mlx`, in a route or in an agent's routes. Pull or download each model on its server first: the kit does not.

**An older `site.json` keeps working.** A node may still list `models`, each with its own port, and name each model `<node>/<model id>`. The gateway counts port 11434 as an Ollama server named `ollama`.

### Comparing models

**Give each agent the server and model to compare.** An agent's `routes` can name a route or one cluster model:

```json
"agents": {
  "betty": { "routes": ["machine-2/ollama/large-local"] },
  "barb": { "routes": ["machine-2/mlx/large-mlx"] }
}
```

To move an agent to another server or model, change `site.json` and rerun `setup-host.sh`. The script points each agent at the agent's first route, compression summaries included. The spend log then records the agent, the server and the model for each request, so runs compare by agent, server and model.

## Install, in order

1. **Control machine:** clone CircleChat to `~/circlechat` and this repo to `~/recursica-knowledge`
   (see "The kit checkout" below). Write
   `~/circlechat/site.json` from `circlechat/site.example.json`, and add secrets to
   `~/circlechat/.env`.
2. `~/recursica-knowledge/circlechat/setup-host.sh`. It validates `site.json` (and stops before changing anything if
   it is wrong), then: fixes `.env` (including `HERMES_TIMEOUT`), ports, the shared workspace and
   its checkouts, copies Kev, starts CircleChat, the app preview, the model gateway
   and the Slack notifier, and installs start-at-boot and hourly jobs (systemd
   or launchd). It turns on this repository's commit hooks in Alan's checkout; add
   `LOCAL_REDACTIONS=<path to your local-redactions.json>` so client names are checked too.
3. **Every other machine:** copy `site.json` over (it holds no secrets), put its services'
   secrets in `~/.recursica-node.env`, and run `./circlechat/setup-node.sh <node name>`.
4. Point your HTTPS name at `127.0.0.1:<port>`; the script prints the Tailscale commands.
5. For each agent: add the agent in the CircleChat UI (**Members → Add agent**: Hermes, provider
   custom (FreeLLMAPI), base URL `http://cc-gateway:4000/v1`, key `placeholder-key`, **Install + link**).
   Never paste a cloud key into CircleChat. Wait for the install to finish, then run:
   ```bash
   ./circlechat/setup-agent.sh betty
   KEV_ENGINE_KEY=... ./circlechat/setup-agent.sh barb
   GITHUB_TOKEN=github_pat_... ./circlechat/setup-agent.sh alan   # stored as ALAN_GITHUB_PAT
   ```
   `setup-agent.sh` gives the agent the agent's own gateway key, in place of the placeholder. The
   script fills each persona's deploy tokens (`@APP_REPO@`, `@APP_REPO_GITHUB@`) from `site.json`,
   and gives Barb the Kev-engine list. Alan's token is fine-grained: Contents, Pull
   requests and Issues on this repository, Issues on the adapter repositories and Theme Forge,
   and **no merge rights**. Protect `main` with a ruleset whose bypass list is empty; a token acts
   as the person who made it.
6. Test: `@betty hello`, `@barb run node -v`, `@alan list open PRs on <this repo>`.

After that, an hourly job pulls this repo and reruns `setup-agent.sh` for every agent
(`sync-skills.sh`), so merged changes reach the agents within the hour.

### The kit checkout

**Clone this repo to `~/recursica-knowledge`, and run each kit command from that checkout.** Root runs the kit's scripts. Every agent container mounts the agents' workspace, `~/circlechat-workspace`. An agent could change a checkout inside the workspace, and root would then run the change.

Each script below checks the kit checkout first, with `circlechat/kit/check-kit.sh`:

- `setup-host.sh`, which installs the backups and the hourly sync
- `backup/backup.sh`, `backup/restore-test.sh` and `sync-skills.sh`
- `deploy/install-secrets-helper.sh`, and the secrets helper, `agent-stacks-apply`
- `tenant/setup-pc.sh`, which installs `agent-stacks-disk`
- `cluster/install-cluster.sh`, and the cluster agent and the update job at each start

The check refuses a checkout in three cases:

- The checkout sits inside an agents' workspace: `~/circlechat-workspace` or `~/tenants/<client>/workspace`.
- The group or other accounts can change the checkout, or a folder above the checkout. Fix the checkout with `chmod -R go-w ~/recursica-knowledge`.
- Another account owns a file or folder in the checkout.

A root-owned folder with the sticky bit, such as `/tmp`, passes above a checkout. Other accounts cannot rename or delete the owner's folder there.

**The workspace keeps a separate checkout for the agents to read,** `~/circlechat-workspace/recursica-knowledge`. The hourly sync pulls that checkout. With `upgrade.auto`, the upgrade job moves both checkouts to each release. The job runs the setup from `~/recursica-knowledge`.

**The check finds a checkout that agents or other accounts could change.** The check cannot find a file that was changed before the check ran.

To move an existing install, clone this repo to `~/recursica-knowledge`. Then rerun each command below from the new checkout:

- `setup-host.sh`, once for each stack
- `install-secrets-helper.sh <runner account>`
- `install-cluster.sh <computer>`
- `setup-pc.sh`, on Linux or in WSL

### Colima and Ollama on a Mac

**On a Mac, `setup-host.sh` runs Colima and Ollama as LaunchDaemons that run as the owner.** A LaunchDaemon starts at each start-up, before anyone logs in. Homebrew's services (`brew services`) are LaunchAgents, which start only when the owner logs in. The script stops each Homebrew service for Colima and Ollama and removes the service.

- **Colima:** the daemon runs the VM of the current Docker context, `colima` or `colima-<profile>`. The daemon runs `circlechat/kit/colima-service.sh`. When launchd stops the daemon, the script runs `colima stop`, then ends `colima start -f`. `colima start -f` keeps running after the VM stops. Without that step, the daemon never exits.
- **Colima, when the VM stops another way:** `colima-service.sh` checks the VM every 15 seconds. A VM that ran and then stopped, such as after `colima stop` by hand, ends the daemon, and launchd starts the VM again. `colima start -f` gets 10 seconds to end after the daemon stops `colima start -f`, then gets SIGKILL. The daemon never hangs on a stopped VM.
- **Ollama:** the daemon runs `ollama serve` on `127.0.0.1`, as the owner. The port is the port of the control computer's Ollama server in site.json. The daemon runs with the server's `context_length`, `parallel` and `keep_alive` from site.json ("Model servers"). With no Ollama server in site.json, no Ollama daemon is installed. Quit the Ollama app and remove the app from the login items. The app otherwise takes the same port.
- **Ollama after a Homebrew upgrade:** the hourly update job restarts the Ollama daemon after Homebrew upgrades Ollama. The running server keeps the old version, and a security fix in the new version takes effect only after the restart.

**`setup-host.sh` stops, and changes nothing, while a LaunchDaemon outside the kit runs Colima or Ollama.** The kit's daemons are `io.recursica.colima` and `io.recursica.ollama`. A second daemon for the same VM, or for the same port, would fight with the kit's daemon. The check reads each daemon in `/Library/LaunchDaemons`. A daemon whose label starts with `io.recursica.` belongs to the kit. The message names each other daemon, such as `local.colima` or `local.ollama`, and the commands to retire the daemon.

To hand a Mac's Colima and Ollama to the kit:

1. **Move each daemon's settings to site.json.** An Ollama daemon's `OLLAMA_CONTEXT_LENGTH`, `OLLAMA_NUM_PARALLEL` and `OLLAMA_KEEP_ALIVE` become the Ollama server's `context_length`, `parallel` and `keep_alive`. An older `site.json` lists `models` on the node instead of `servers`: move the models to an Ollama server, and rename each model in `routes` and `agents` from `<node>/<model id>` to `<node>/ollama/<model id>`.
2. **Retire each daemon,** with the commands from the message:

   ```sh
   sudo launchctl bootout system/local.colima && sudo rm /Library/LaunchDaemons/local.colima.plist
   sudo launchctl bootout system/local.ollama && sudo rm /Library/LaunchDaemons/local.ollama.plist
   ```

   Booting out a Colima daemon stops the VM, and every container of the stack stops with the VM. Booting out an Ollama daemon stops Ollama. Run step 3 right after step 2.

3. **Run `setup-host.sh`.** The script installs the kit's daemons, and Colima's daemon starts the VM. Each container with a restart policy starts with the VM. The script then brings up the rest of the stack.

A client stack's VM sits in the client's disk image, and the "Unlock stack" workflow starts that VM. The VM gets no daemon.

## Porter and the job runners

Porter's adapter ports are too long and too heavy for an agent turn, so each port runs as a
**job** on a **job runner** (`circlechat/jobd`): one container per job, capped at the node's
`jobs.memory_gb`, at most `jobs.slots` at once. Porter sends each port to the first job runner
with room, best first by `jobs.priority`. `agents/porter/runtime/hermes.md` explains the design.

1. **Give Porter a GitHub token** with Contents and Pull requests on the target adapters only
   (`porter.targets`), and no merge rights. Protect `main` on each target with a ruleset whose
   bypass list is empty. A bot account keeps the pull requests reviewable by the whole team.
2. **Create the wake-up webhook.** In CircleChat, create a workflow with a webhook trigger and
   one agent step for Porter. Copy the webhook URL and signing secret into the control machine's
   `.env` as `PORTER_HOOK_URL` and `PORTER_HOOK_SECRET`. The release watcher (hourly, installed by
   `setup-host.sh` when `porter.watch` is set) and every job runner use the same webhook.
3. **On each job-runner machine** (a node with `jobs`), put these in `~/.recursica-node.env`:
   `JOBD_TOKEN` (copied from the control machine's `.env`), `PORTER_GITHUB_PAT`,
   `PORTER_GIT_NAME`, `PORTER_GIT_EMAIL`, `PORTER_HOOK_URL`, `PORTER_HOOK_SECRET`. The file holds
   no cloud key. The machine's user needs Docker access. Then run `setup-node.sh <node>`:
   it builds the `recursica/porter-job` image and starts the job runner on `jobs.port`. On the
   control computer, run `setup-host.sh` first, so the gateway exists.
4. Install Porter in the CircleChat UI, then `./circlechat/setup-agent.sh porter`.

A job runner only runs the porter job type for the repositories in `porter.targets`, so a
request cannot run an arbitrary command. The job's secrets reach the container by name, never on
a command line. Each job sends the job's model requests to the control computer's gateway, with
the gateway key for the job's task. Porter gets that key from the gateway during a turn on the task. A job that runs out of memory ends as `out_of_memory` and is reported; the machine
keeps running.

**A job runner listens on `127.0.0.1` and the computer's Tailscale addresses, never on the office network.** `setup-node.sh` reads the Tailscale addresses with `tailscale ip`. Without Tailscale, the job runner listens on `127.0.0.1` only, and other computers cannot reach the job runner. Porter reaches the control computer's job runner at the control computer's `tailnet_address`. On Linux, `host.docker.internal` is Docker's bridge address, where no job runner listens.

## Clients: one isolated stack each

**Give each client, and each demo, a separate stack.** A stack is one client's CircleChat, agents, secrets, Slack channel, model gateway and job runner. A client's stack shares no data with the cluster's own stack or another client's stack. Several stacks can run on one computer. A demo stack (`site.kind` `"demo"`) follows the same rules as a client stack, including the recorded permission for cloud models.

CircleChat's workspaces cannot keep clients apart. Inside one CircleChat, every agent shares one `/workspace` folder and one set of agent homes. The CircleChat api, worker and bridge also hold a Docker socket with root access to the computer.

### The stack's computers

**Pick the computers for each stack:** one computer from the cluster's site.json, such as one PC or one Mac, or the whole cluster.

- **One computer:** that computer is the stack's control computer. The computer runs the stack's CircleChat in the stack's own Docker VM.
- **The whole cluster:** the cluster's control computer runs the stack's CircleChat, in the stack's own Docker VM.

The stack's site.json records the choice in `site.computers`, `["<computer>"]` or `"cluster"`, and lists only the picked computers. The stack's agents, jobs, local models and Kev's model then use only those computers. `setup-host.sh` checks the stack's computers and ports against the cluster's own site.json, `~/circlechat/site.json`.

**Write the stack's site.json with `circlechat/kit/stack-site.mjs`:**

```bash
node circlechat/kit/stack-site.mjs ~/circlechat/site.json acme demo machine-2 > site.json
node circlechat/kit/stack-site.mjs ~/circlechat/site.json acme client cluster > site.json
```

### Cloud keys for a demo

**Setting up a demo always asks:** "Give this demo cloud model keys, such as Claude or Grok, with billing attached? [y/N]". Each cloud key comes with billing, so a demo needs a recorded permission, the same as a client stack.

- **No**, the default: the demo gets no `model_keys` and no cloud route, and runs on local models only. site.json records `"cloud_models": { "allowed": false }`.
- **Yes:** the script asks for each provider and model, such as `anthropic:claude-sonnet-5-5,xai:grok-4`. Then the script asks who granted the permission and who pays. The script records the answers in the demo's `site.cloud_models` and `model_keys`. The first key is the key named `default`, which every agent uses. Each other key is named for the key's provider: name the key's agents in site.json. Add an Azure or Bedrock key to site.json by hand.

**Without a person at the keyboard, such as from Claude Code, give the answer as an option.** The script then stops unless the command has `--cloud-keys`, and never answers yes without the option:

```bash
node circlechat/kit/stack-site.mjs ~/circlechat/site.json acme demo machine-2 --cloud-keys none > site.json
node circlechat/kit/stack-site.mjs ~/circlechat/site.json acme demo machine-2 \
  --cloud-keys anthropic:claude-sonnet-5-5 --granted-by "Person A" --payer border-ramp > site.json
```

**Add the key values yourself, outside Claude Code,** with `circlechat/deploy/set-model-keys.sh <site.json> <owner/private repo>`. The script asks for each key's value at the keyboard and shows nothing on the screen. The script saves each value as a `MODEL_KEY_<NAME>` secret in the stack's GitHub environment, through `gh`. The script refuses to run without a terminal, or inside a Claude Code session. Then run the "Deploy secrets" workflow for the stack.

The script copies the picked computers, their routes and the agents from the cluster's site.json. The script gives the stack the first ports that no stack in `~/tenants` uses. Check `repos` and `notify` before the first setup.

**Model servers that keep no data serve several stacks,** such as Kev's model and the local models. The cluster's own stack starts each server, from `services` in the cluster's site.json. A stack's site.json lists the same servers and models, with no `services`. Each stack still gets the stack's own gateway, gateway keys, job runner and ports. Give a client a separate model server when the client's contract requires one.

### Limits: a smaller computer for a demo

**Optional limits make a large computer act like a smaller one,** so a demo can show how a smaller computer performs. Add the limits to stack-site.mjs, such as `--cpus 4 --memory-gb 16 --model-memory-gb 16`, or set `limits` on a picked computer:

```json
"limits": { "cpus": 4, "memory_gb": 16, "model_memory_gb": 16 }
```

- `cpus` and `memory_gb`: the most cores and memory for the stack's Docker VM and for each job. Create the VM with that size, such as `disk-image.sh vm acme 4 16 100`. `setup-host.sh` and `setup-node.sh` stop when the stack's VM is bigger.
- `model_memory_gb`: the memory the computer gives the stack's models.

**A model that does not fit is left out.** Each computer gives the stack's models the smaller of `model_memory_gb` and the limit. `setup-host.sh` leaves out each model that does not fit, in site.json's order, and prints a line for each one. A large model on a PC with 16 GB of GPU memory is left out, for example. A route with no model left goes too. An agent with no route left uses the stack's other routes. The setup stops when no model fits. The cluster's own stack has no limits: its config check refuses models that don't fit, as "Model servers" describes.

The limits choose the models and size the stack's VM and jobs. A shared model server still runs at the large computer's speed.

### Set up a stack

1. **Create the stack's encrypted disk image, then the stack's Docker VM,** on the stack's control computer. Do the same on each other picked computer that runs the stack's jobs. See "Encrypted client stacks" below. `disk-image.sh vm <client>` creates the Docker context `colima-<client>`.
2. **Clone CircleChat** into `~/tenants/<client>/circlechat`.
3. **Write the stack's site.json** at `~/tenants/<client>/circlechat/site.json` with stack-site.mjs. The script sets these fields:
   - `site.tenant`: the stack's short name, in lowercase.
   - `site.kind`: `"client"` or `"demo"`.
   - For a demo, `site.cloud_models` and any `model_keys`, from the answer about cloud keys.
   - `site.docker_context`: the stack's Docker context, `colima-<client>`.
   - `site.computers`: the picked computers.
   - `site.port`, `site.preview_port` and `site.gateway_port`: three ports no other stack uses, and each job runner's `jobs.port`.
4. **For a client stack, ask the client whether the agents may send the client's data to a cloud model provider.** Until the client says yes, the stack runs local open-weight models only. When the client says yes, record the permission in `site.cloud_models`:

   ```json
   "cloud_models": { "allowed": true, "granted_by": "Person A, acme.com", "granted_on": "2026-10-20", "payer": "client-byok" }
   ```

   `payer` says who pays. `border-ramp` means Border UX pays, with a virtual card made for the client. `client-byok` means the client supplies the client's own key.

5. **Put the stack's secrets,** including the Slack app's `SLACK_BOT_TOKEN`, in the stack's GitHub environment, as "Secrets in GitHub" describes.
6. **Run every kit script with `TENANT=<client>`**, such as `TENANT=<client> ~/recursica-knowledge/circlechat/setup-host.sh`. Use the same prefix for `setup-agent.sh`, and for `setup-node.sh` on each picked computer that runs jobs.
7. **Give the stack an address** with `tailscale serve --bg --https=<port> http://127.0.0.1:<port>`.

With `TENANT=<client>`, the stack lives in `~/tenants/<client>/`. The stack's containers, volume, Compose project, ports and background jobs all carry the client's name. The stack's job runner reads secrets from `~/tenants/<client>/node.env`.

The config check refuses a client or demo stack in these cases:

- The stack has no `site.tenant`.
- The stack has no `site.docker_context`.
- `site.computers` picks one computer, and the stack lists another computer, or the picked computer is not the control computer.
- `site.computers` is `"cluster"`, and the stack leaves out a computer of the cluster, or names another control computer.
- The stack uses a port of the cluster's own stack.

The config check also refuses a client stack that sets `data.kev_disagreements_branch`. Review data from a client's code stays in the client's stack. With no recorded permission in `site.cloud_models`, the config check also refuses a `model_keys` block, every cloud route and Porter on a client or demo stack. The secrets helper refuses to deploy a cloud key to the stack.

A stack with no `site.tenant` keeps the names a single install uses today. An existing install changes nothing.

## Encrypted client stacks

**Keep each client stack in an encrypted disk image with the client's own key.** The image holds the client's whole stack in `~/tenants/<client>`. The stack holds CircleChat, the agent homes, the workspace, the job folder, the secrets file and the logs. The client's Docker VM lives inside the image too, in `~/tenants/<client>/colima`. Each client stack runs on the Docker engine in the stack's own VM, never on a shared Docker engine.

| Computer                   | Disk image                                           | Docker VM                                     |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| A Mac                      | An encrypted APFS sparse bundle in `~/tenant-images` | A Colima profile, with Apple's virtualization |
| Linux, or Windows with WSL | A LUKS image file in `/var/lib/agent-stacks/images`  | A Colima profile, with QEMU and KVM           |

1. **On Linux or in WSL, prepare the computer once.** Run `~/recursica-knowledge/circlechat/tenant/setup-pc.sh` as the account that owns the stacks. The script installs QEMU, Lima, Colima and cryptsetup, and adds the account to the `kvm` group. The script also installs `agent-stacks-disk`, the part of `disk-image.sh` that runs as root. The hourly update job installs `agent-stacks-disk` again after the kit changes. Rerun the script when the kit changes the version of Lima or Colima.
2. **Create the key in the password manager,** at least 24 random characters. Add the key to the client's GitHub environment as `STACK_DISK_KEY`.
3. **Create the image before the client's Docker VM:** pipe the key into `./circlechat/tenant/disk-image.sh create <client> 200g`. The image grows as the stack grows, up to the size given. On Linux and in WSL, `sudo` asks for the owner's password, so run the command in a terminal.
4. **Create the Docker VM** with `./circlechat/tenant/disk-image.sh vm <client> <CPUs> <memory GiB> <disk GiB>`, such as `vm acme 8 32 100`. The VM mounts `~/tenants/<client>` and no other folder. The VM never becomes the current Docker context, so a plain `docker` command never reaches a client's VM.
5. **Copy `circlechat/deploy/unlock-stack.yml`** to `.github/workflows/unlock-stack.yml` in the private repo of stacks.

After every restart of the computer, the client's image stays closed. Run the "Unlock stack" workflow with the stack and the computer. The workflow passes `STACK_DISK_KEY` to the secrets helper, which opens the image and starts the Docker VM. On Linux and in WSL, the secrets helper opens the LUKS image as root. The owner's account then starts the VM. Docker then starts each container of the stack. The key never touches the disk. Run the same workflow with `lock` to stop the VM and close the image.

**Check the stack's isolation** with `./circlechat/tenant/isolation-check.sh <client>`, while the stack is open. The pass/fail table covers the stack's Docker context and Docker engine, containers, volumes, networks, folders, VM mounts and ports.

**Give each `colima` command the client's Colima folder,** such as `COLIMA_HOME=~/tenants/<client>/colima colima status --profile <client>`. Without `COLIMA_HOME`, Colima looks in the folder for VMs outside any image.

**WSL needs nested virtualization** for the Docker VMs. Windows 11 turns nested virtualization on by default, and `ls /dev/kvm` in WSL shows the device. When `/dev/kvm` is missing, add `nestedVirtualization=true` under `[wsl2]` in `%UserProfile%\.wslconfig`. Set `memory=` in the same file high enough for every stack's VM, plus the services outside the VMs. Then run `wsl --shutdown` in PowerShell and reopen Ubuntu.

Deleting the image and the key makes the client's data unreadable for good.

## Secrets in GitHub

**Keep each stack's secrets in GitHub, in the private repo that holds the stacks' site.json files.** GitHub records each change, and more than one person can update a secret. GitHub never shows a secret again after the secret is saved. Keep a copy of each secret in a password manager.

1. **Create one GitHub environment per stack** in the private repo. Name the environment `border` for the stack with no tenant name, and `client-<name>` for each client stack.
2. **Require an approval** in each environment's settings, under "Required reviewers". A workflow then waits for the approval before the workflow reads the environment's secrets.
3. **Add the stack's secrets to the environment**, with the names in the table below. Add cloud key values with `circlechat/deploy/set-model-keys.sh`, in your own terminal, outside Claude Code.
4. **Copy `circlechat/deploy/deploy-secrets.yml`** to `.github/workflows/deploy-secrets.yml` in the private repo.
5. **Install a GitHub self-hosted runner on each computer**, for the private repo only, under a separate account. Give the runner a label with the computer's name from site.json.
6. **Run `~/recursica-knowledge/circlechat/deploy/install-secrets-helper.sh <runner account>`** on each computer, as the account that owns the stacks. The runner's account can then run one command as root: the helper that writes the secrets. The hourly update job reruns the script as root after the kit changes the helper.
7. **Run the "Deploy secrets" workflow** with the stack and the computer. The workflow writes each secret to the file that reads the secret, then restarts the services that read the file.

The node secrets file is `~/.recursica-node.env`, or `~/tenants/<client>/node.env` for a client or demo stack.

| Secret in GitHub                                           | File the helper writes                                    | Read by                                                                    |
| ---------------------------------------------------------- | --------------------------------------------------------- | -------------------------------------------------------------------------- |
| `MODEL_KEY_<NAME>`, such as `MODEL_KEY_DEFAULT`            | `model-keys.env` on the control computer                  | The model gateway, and nothing else                                        |
| `SLACK_BOT_TOKEN`                                          | `.env` on the control computer, for each stack            | The task notifier and the stack's scripts, through the cluster's Slack app |
| `KEV_ENGINE_KEY`                                           | `.env` on the control computer                            | Barb's first pass with Kev                                                 |
| `JOBD_TOKEN`                                               | `.env` on the control computer, and the node secrets file | Porter and each job runner                                                 |
| `PORTER_HOOK_URL`, `PORTER_HOOK_SECRET`                    | `.env` on the control computer, and the node secrets file | The release watcher and each job runner                                    |
| `<HANDLE>_GITHUB_PAT`, such as `ALAN_GITHUB_PAT`           | The `.env` in the agent's Hermes home                     | The agent, at the start of each turn                                       |
| `KEV_API_KEY`                                              | The node secrets file                                     | Kev's model                                                                |
| `PORTER_GITHUB_PAT`, `PORTER_GIT_NAME`, `PORTER_GIT_EMAIL` | The node secrets file                                     | The port jobs                                                              |

The workflow passes every `MODEL_KEY_<NAME>` secret in the environment, with no list to keep. The helper still accepts `ANTHROPIC_API_KEY` as the older name of `MODEL_KEY_DEFAULT`. The helper never writes a cloud key to `.env` or to a node secrets file. To deploy a GitHub token for a new agent, add the agent's `<HANDLE>_GITHUB_PAT` line to the workflow's list of secrets.

**Limit write access to the private repo.** A person who can edit a workflow can read the secrets of each environment the workflow uses. The required approval in step 2 keeps a changed workflow from reading secrets without an approval.

## Outgoing filter

**Each stack's agents reach only the sites on the stack's allowlist.** CircleChat starts agent containers on a closed Docker network with no route out. The only exit is the stack's filter, Squid from Ubuntu's LTS packages. CircleChat's api and the model gateway sit on the closed network too. Port jobs get the same kind of filter on each computer that runs jobs.

The allowlist holds GitHub, the npm and Python package registries, and the stack's other computers. The sites in `egress.allow` in site.json join the list. No cloud model provider is ever on the list. Agents and port jobs reach cloud models only through the model gateway. The config check refuses a cloud model provider in `egress.allow`.

**The filter opens five ports and never a model server's port.** The five ports are:

- 80 and 443, for websites
- 7400, for the job runner
- 8009, for Kev's model
- `site.gateway_port`, 4000 by default, for the model gateway

A model server's own API can delete or download a model, such as Ollama's API on port 11434. Only the model gateway reaches a model server. The gateway's LiteLLM container sits on the gateway's Docker network, which has a route out. LiteLLM reaches each model server directly, without the filter. The filter leaves out every port that site.json gives a model server, such as an mlx-lm server's port. The config check refuses a model server on one of the five ports.

When the filter refuses a site:

1. The agent gets an error page that names the filter and the rule. The agent uses an allowed site only when the allowed site is the genuine source of the same thing. The agent never reaches the blocked site another way.
2. With no genuine allowed source, the agent comments on the task, sets the task to blocked, and stops.
3. The stack's Slack channel gets one request with two buttons. "Allow once (15 min)" needs an authenticator code and opens the site for that stack for 15 minutes. "Deny" keeps the site closed.
4. After a decision, tell the agent on the task, so the agent retries or stops waiting.

**The filter's image, `recursica/egress:<hash>`, is built once for each version of `circlechat/egress`.** The tag carries a hash of the folder's files, so `setup-host.sh` and `setup-node.sh` use the same image. After a build, each script recreates each filter container that runs another image, with the container's mounts and networks. The agents' filter, `cc-egress`, and the port jobs' filter, `cc-jobs-egress`, then run the same image.

A refused site in a port job gets a Slack alert with no buttons, because a job cannot wait. To allow a site for good, add the site to `egress.allow` in the stack's site.json through a pull request. Then rerun `setup-host.sh`. Set `"egress": { "enabled": false }` only for a stack with no agents.

## Privacy rules for agents

**The model gateway removes personal information before a request reaches a cloud model.** Presidio, Microsoft's open-source masking service, finds names, email addresses, phone numbers and similar details. The gateway replaces each one before the request leaves. Masking is on by default for a client stack with cloud models. Set `"privacy": { "mask_pii": false }` in site.json only when the client asks. Masking is a separate setting for each stack: with masking on or off, every request passes the gateway.

Two more rules hold on every stack:

- **CircleChat's approval gate is on.** `setup-host.sh` sets `APPROVE_RISK_AT=high`, so each high-risk action waits for a person's approval in CircleChat. The high-risk action, `share_files`, has CircleChat itself fetch a web address, outside the agents' filter.
- **A client stack never runs Alan.** Alan's pull requests go to the public knowledge repo. `setup-agent.sh` refuses Alan on a client stack, and the secrets helper refuses `ALAN_GITHUB_PAT` for a client stack.

## Cloud models and the model gateway

**Every agent and every port job sends each model request to the stack's model gateway.** The cluster's own models answer by default. A cloud model answers only when the task's "Cloud models" setting allows a cloud model. No cloud key leaves the gateway.

### Cloud keys

**Name each cloud key in `model_keys` in site.json.** Each named key, such as `default`, `betty` or `acme-grok`, records three things:

- `provider`: the key's provider, such as `anthropic`, `xai` or `openai`. The gateway also takes `gemini`, `mistral`, `groq`, `deepseek`, `openrouter`, `azure` (with `api_base`) and `bedrock` (with `region`).
- `model`: the cloud model the key calls, such as `claude-sonnet-5-5`.
- `agents`: the handles of the agents that use the key. An agent that no key names uses the key named `default`.

```json
"model_keys": {
  "default": { "provider": "anthropic", "model": "claude-sonnet-5-5", "agents": [] },
  "acme-grok": { "provider": "xai", "model": "grok-4", "agents": ["barb"] }
}
```

Any mix works: one key for every agent, one key per agent, or a key shared by a few agents.

**Keep each key's value in the stack's GitHub environment,** as `MODEL_KEY_<NAME>`: `MODEL_KEY_DEFAULT` for `default`, and `MODEL_KEY_ACME_GROK` for `acme-grok`. A Bedrock key's value is `<access key id>:<secret access key>`. The secrets helper writes each value to `model-keys.env` on the control computer. On Linux, root owns that file. Only the gateway reads the file. The gateway reads each key from the file when the gateway starts, never from an environment variable. `docker inspect` then shows no key. CircleChat, the agent homes, the agent and job containers, the `.env` files and the backups hold no cloud key. Keep each provider's spend limit in the provider's console.

**On a Mac, the stack's owner can read the cloud keys, and the agents still cannot.** Docker on a Mac runs in a VM, such as Colima's. The VM reads the Mac's files as the stack's owner, never as root. The stack's owner therefore owns `model-keys.env` and the `gateway-state` folder, with the same modes as on Linux. Every program that runs as the owner can read the keys. Only the gateway's LiteLLM container mounts `model-keys.env`, so no agent or job container can read the file. The owner's account controls Docker on Linux too, so root ownership never kept the keys from the owner.

**A stack with no `model_keys` block keeps working.** The cloud model in the stack's routes becomes the key named `default`, which every agent uses. `setup-host.sh` moves the stack's `ANTHROPIC_API_KEY` out of `.env` and into `model-keys.env` as `MODEL_KEY_DEFAULT`. Rename the GitHub secret to `MODEL_KEY_DEFAULT` after that move.

### Agents

**Set each agent's routes and cloud switch in `agents` in site.json:**

```json
"agents": {
  "betty": { "routes": ["local-large"] },
  "loki": { "routes": ["local-small"], "cloud": false }
}
```

- `routes`: the routes the agent's gateway key may use, or single cluster models (`<node>/<server id>/<model id>`). The agent asks for the first route. An agent that `agents` leaves out may use every route.
- `cloud`: the agent's cloud switch, on by default. With the switch off, the gateway never calls a cloud model for the agent, whatever the task's setting says.

**Each agent has the agent's own gateway key.** `setup-agent.sh` makes the key and writes the key to the agent's Hermes home. The gateway keeps only a hash of each key. A gateway key reaches only the agent's routes, and works only from the stack's own containers and computers. No agent holds LiteLLM's master key. To revoke one agent's key, run `sudo node circlechat/gateway/keys.mjs revoke <CC_DIR>/gateway-state <handle>`. The other agents keep working. Run `setup-agent.sh <handle>` to give the agent a new key.

### Which model answers

**The task's "Cloud models" setting decides, for each request.** The gateway reads the setting from CircleChat's database, and keeps a copy for at most one minute. A change on the Kanban board applies within a minute.

| Setting            | Who answers                                                                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------ |
| Cluster only       | A cluster model, every time                                                                                        |
| Cloud after a wait | A cluster model, until the task passes the wait to start or the time to finish. Then the agent's cloud key answers |
| Cloud now          | The agent's cloud key, from the first request, so the work runs beside the cluster's other work                    |

- **A request waits for the cluster as long as the cluster needs.** A busy or failing cluster is never a reason to call a cloud model. The gateway tries the cluster again until the cluster answers.
- **The task's clock starts at the gateway's first request for the task.** The wait to start ends at the cluster's first answer. The time to finish counts from the first request.
- **A request outside a task uses the cluster only,** such as a chat mention or a heartbeat.
- **The gateway finds the task from the agent's running turn.** CircleChat records the task of each turn. A port job's gateway key names the job's task.
- **When the gateway cannot tell a request's task, the strictest setting decides.** An agent can have more than one running turn, or a turn outside a task. The gateway then uses the strictest setting among those turns, so Cluster only wins. Such a request starts no task's clock.
- **A stack with no cluster model fails a Cluster only task.** The gateway posts a comment on the task that says why, once per task.

### What reaches the gateway

**The gateway passes on model requests only:** `POST /v1/chat/completions`, `/v1/completions` and `/v1/messages`. Every other path gets a 404, even with a valid gateway key. LiteLLM's own endpoints, such as key and model management, stay out of reach.

**The gateway listens on two ports.**

- Port 4000 inside the stack's Docker networks: the agents, and the port jobs on the control computer.
- `site.gateway_port`, 4000 unless site.json sets another port: the port for port jobs on other computers. `setup-host.sh` opens this port on the control computer's Tailscale address only. The port takes only a task key, for every request, `/health` included.

With the outgoing filter off, the control computer's own agents use `site.gateway_port` on `127.0.0.1`.

**The control computer's operating system decides how the port for port jobs reaches Tailscale.**

| Control computer           | Docker publishes the port for port jobs on | Tailscale's port `site.gateway_port`                   |
| -------------------------- | ------------------------------------------ | ------------------------------------------------------ |
| Linux, or Windows with WSL | The Tailscale address                      | Docker's port                                          |
| A Mac with Colima          | `127.0.0.1:<site.gateway_port + 1>`        | `tailscale serve --tcp` passes the port to `127.0.0.1` |

On a Mac, Docker runs in Colima's VM, and the VM does not hold the Mac's Tailscale address. Docker therefore publishes the port on `127.0.0.1` only. `setup-host.sh` then runs `tailscale serve --bg --tcp=<site.gateway_port> tcp://127.0.0.1:<site.gateway_port + 1>`. The other computers keep the same address, the control computer's Tailscale address and `site.gateway_port`.

**On a Mac, `setup-host.sh` stops when a check of the gateway's port fails.** Each run checks three facts:

- `tailscale serve status` passes `site.gateway_port` to the port on `127.0.0.1`.
- The port on `127.0.0.1` answers 401 to a request without a task key.
- Neither gateway port answers on the Mac's other addresses, such as the office network.

Keep `site.gateway_port + 1` free on a Mac. The config check refuses `site.port` or `site.preview_port` on that port. A new client or demo stack gets a gateway port with the next port free too. Offboarding a client turns off the client's `tailscale serve` port.

**The gateway reads CircleChat's database with a read-only role, `cc_gateway_read`.** The role reads only the columns the gateway needs, from six tables, and writes nothing. `setup-host.sh` makes the role from `circlechat/gateway/gateway-db.sql`. The role's password lives in the gateway's state folder, never in an environment variable. After a CircleChat update, rerun `setup-host.sh`, so the role can read any new table the gateway needs.

### The spend log

**The gateway writes one line per request to `<CC_DIR>/gateway-logs/spend.jsonl`.** Each line holds these fields:

- the time, the task and the agent
- the key's name, or `cluster` for a cluster model
- the route, and the server and model that answered: `server` is `<node>/<server id>` for a cluster model, or the provider for a cloud model
- `backend`: the model's name in `site.json`, such as `machine-2/mlx/large-mlx`
- the status and the token counts

The log holds no prompt and no answer.

### The key check

**`setup-host.sh` and the test restore run the key check, `circlechat/gateway/key-check.mjs`.** The check fails when a cloud key is in CircleChat's database, in an agent's Hermes home or in a backup. The check finds a key by the exact values in `model-keys.env` and by the shapes of the providers' keys. The report names each place and the kind of key, never the key. Remove each key the check finds, and rotate the key in the provider's console.

## Backups

**Back up each stack every night, encrypted on the computer before the backup leaves the computer.** restic encrypts each backup with the stack's own `RESTIC_PASSWORD`, and rclone uploads the backup to Google Drive. Both tools are open source.

1. **Install restic and rclone** on the stack's control computer: `sudo apt install restic rclone` on Linux, or `brew install restic rclone` on a Mac.
2. **Create a Google Drive folder for the backups,** such as `agent-backups`.
3. **Set up an rclone remote** for the folder with `rclone config`, as the account that owns the stacks. Pick Google Drive, the `drive.file` scope, and the folder's ID as the root folder. With the `drive.file` scope, rclone reaches only the files rclone creates.
4. **Add `RESTIC_PASSWORD` to the stack's GitHub environment,** with a new random value, and save a copy in the password manager. A backup without the stack's `RESTIC_PASSWORD` cannot be read, by anyone.
5. **Add a `backup` block to site.json,** then rerun `setup-host.sh`:

   ```json
   "backup": { "remote": "gdrive-backups:agent-backups", "time": "02:00" }
   ```

The test restore also runs the key check over the restored backup. The test fails when the backup holds a cloud key. The Slack message gives the count of places, and the restore test's log on the computer lists the places.

Each nightly backup holds five parts: the database, CircleChat's file store, the agent homes, the shared workspace and site.json. The backup leaves out each `.env`, because every secret lives in the stack's GitHub environment. restic keeps 7 daily, 4 weekly and 6 monthly backups. Each backup also holds `generated.env`: CircleChat's generated passwords and session secret. A restore copies those lines into the new `.env` before CircleChat's first start, because the file store encrypts its own settings with its password.

On a Mac, launchd gives a job no `HOME`. Each job that runs as root, such as the backup and the test restore, gets `HOME=/var/root`, root's home folder. restic keeps the restic cache there. Rerun `setup-host.sh` to give a job installed by an earlier kit the `HOME` setting.

A test restore runs on the first day of January, April, July and October. The test unpacks the newest backup into a scratch folder, then checks the database dump, the file store and the agent homes. The result goes to the stack's Slack channel, and so does every failed backup. Run a test restore at any time with `FORCE=1`.

## Security services

`~/recursica-knowledge/circlechat/cluster/install-cluster.sh <computer>` installs the security services on one computer. Run the script on each computer, after `setup-host.sh` or `setup-node.sh`. The script installs five parts:

- **Firewall rules:** each new incoming connection is refused, except from the computer itself, Tailscale, Docker's internal networks and allowed sources. The rules load at every start-up. On Windows, run `circlechat/cluster/windows/install-windows-guard.ps1` once in an Administrator PowerShell, after Tailscale is up.
- **Decoys:** OpenCanary runs a fake SSH login, FTP server and web page on ports 2222, 2121 and 8088. Nobody legitimate touches a decoy, so any touch starts a lockdown.
- **The cluster agent:** each minute, the agent checks incoming connections, the decoys and the other computers' stacks. The agent also runs each scheduled reboot.
- **The update job,** hourly: one job for every kind of update.
- **The Slack app,** on the control computer only.

### Firewall rules on a Mac and on Windows

**On a Mac, pf never filters loopback (`lo0`).** `install-cluster.sh` adds `set skip on lo0` to the top of `/etc/pf.conf`. A copy of the old file stays in `/etc/pf.conf.agentguard-backup`. pf takes an option such as `set skip` only in the main rules, never in the `agentguard` anchor. The reasons for the choice:

- pf keeps a record of each connection it lets through. A connection opened before the rules load has no record. pf then misses the connection's opening settings and drops the connection's next packets. Colima's ssh link from the Mac into the VM is one such connection.
- Only programs on the Mac itself reach loopback. No rule in the anchor needs loopback, so skipping loopback opens nothing to other computers.

**A Tailscale address passes only on Tailscale's interface.** The office network can send a packet that claims a Tailscale address, `100.64.0.0/10` or `fd7a:115c:a1e0::/48`. A rule that checks only the address lets that packet in. Each rule names Tailscale's interface too:

| Computer | Tailscale's interface                                | Rule                                                                                                 |
| -------- | ---------------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| A Mac    | A `utun` interface                                   | `pass in quick on $tailscale_if`, for `utun0` to `utun31`                                            |
| Windows  | The `Tailscale` adapter                              | "AgentGuard: Tailscale peers" names the `Tailscale` adapter                                          |
| WSL      | No adapter: a Hyper-V firewall rule takes no adapter | "AgentGuard: Tailscale peers to WSL" takes the computer's own Tailscale addresses as local addresses |

macOS has no interface groups, and Tailscale takes the first free `utun` number, so the rule lists 32 `utun` numbers. On Windows, Windows accepts a packet for a Tailscale address only on the Tailscale adapter. Rerun `install-windows-guard.ps1` after the computer's Tailscale address changes. The Linux rules are unchanged.

### Remote access

**Reach each computer only through Tailscale, with RustDesk.** RustDesk is an open-source remote desktop for Linux, macOS and Windows. Set each computer's RustDesk this way:

- Turn on "Direct IP access", so connections go straight from computer to computer over Tailscale.
- Set the ID server to `127.0.0.1`, so RustDesk never contacts RustDesk's public servers.
- Set a permanent password, and turn on RustDesk's two-factor sign-in.

The firewall rules let RustDesk's port open only to Tailscale addresses. A RustDesk connection from the office network starts a lockdown.

### Lockdown

An incoming connection that no rule allows, or a touch on a decoy, starts a lockdown:

1. The computer seals first: each client stack's disk image closes, and each secrets file becomes unreadable.
2. For 10 minutes, tcpdump records the source's packets. A snapshot records the connections, programs, signed-in users and sign-in logs, and a lookup records the source's network owner and country.
3. Slack gets the alert, with five buttons: "Cut off now", "Keep watching 30 min", "Shut down", "Release lockdown" and "Allow this source".
4. After 10 minutes, the computer cuts off every connection except Tailscale and HTTPS on port 443.
5. Each evidence file gets a SHA-256 fingerprint and a UTC time in `manifest.json`. The evidence is encrypted to `security.evidence_recipient`, an age public key, and uploaded to the backups remote. The private key stays in the password manager.

"Release lockdown" and "Allow this source" need a 6-digit authenticator code. Three wrong codes lock both buttons for an hour. The guard records only traffic to the cluster's own computers, and never acts against the source.

### The Slack app

1. Create a Slack app with Socket Mode on. Give the app-level token the `connections:write` scope, and the bot the `chat:write` scope. Invite the bot to #agent-cluster and to each client's channel.
2. Enroll each approver: `node circlechat/cluster/enroll.mjs <name>`, then scan the QR code with an authenticator app.
3. Add the cluster's secrets to the border GitHub environment, then deploy them to each computer:
   - `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`, from the Slack app.
   - `CLUSTER_TOKEN`, a new random value.
   - `APPROVERS`: Slack user IDs and names, such as `U012=person_a,U034=person_b`.
   - Each approver's `TOTP_SECRET_<NAME>`, from `enroll.mjs`.
4. Set `site.slack_channel_id` in each stack's site.json, so uptime alerts reach the stack's own channel.

### Updates

One job, `cluster-updater`, runs each hour on each computer, with one rule:

- **Border UX's own software** (the knowledge repo, the CircleChat fork and `@recursica/mcp`), on a stack with `upgrade.auto`: right away. A new major version asks in Slack.
- **Everything else** (operating system packages and container images): after 7 days. A fix for a flaw on CISA's Known Exploited Vulnerabilities list goes in at once.
- **An update that needs a reboot** asks for a time in Slack: "4 a.m. ET", "Tonight", "Pick a time" or "Skip".

**Each Colima VM on a Mac stops cleanly before each restart the kit starts.** A VM still running when macOS restarts can lose writes to the VM's disk. Before the restart, the cluster agent takes three steps:

1. Boot out Colima's LaunchDaemon, so launchd never starts the VM again.
2. Run `colima stop` for each VM, including each unlocked client stack's VM.
3. Wait until `colima list` shows each VM stopped, for up to 2 minutes.

**After Homebrew upgrades tailscale on a Mac, the update job runs `tailscaled install-system-daemon` again.** The tailscale daemon runs a copy of the `tailscaled` binary in `/usr/local/bin`. The upgrade replaces only Homebrew's binary. The daemon keeps the old version until the copy is made again.

**A new kit reaches the two commands that are root-owned copies of kit files.** Root owns each copy. The account that runs the command cannot change the command.

| Command                             | Copy of                   | Computers                   |
| ----------------------------------- | ------------------------- | --------------------------- |
| `/usr/local/bin/agent-stacks-apply` | `deploy/apply-secrets.sh` | Every computer              |
| `/usr/local/bin/agent-stacks-disk`  | `tenant/disk-helper.sh`   | Linux, and Windows with WSL |

Each hour, the update job compares each copy with the kit. For a copy that differs, the job reruns `install-secrets-helper.sh` for the runner's account, or copies `disk-helper.sh` again.

Operating system packages are checked each hour, and each stack's container images once a day. Every image runs at an exact version from the stack's `images.lock`. A failed health check moves the stack back to the old versions. The pinned images include CircleChat's own caddy, postgres and redis. `setup-host.sh` reads each one's tag from CircleChat's `compose.yml`, and pins the tag by digest in `compose.images.yml`. macOS installs its own system updates overnight, and Windows waits 7 days before installing a quality update. A stack without `upgrade.auto` moves `@recursica/mcp` to a new version after 7 days. The version lives in `.recursica-mcp-version` in the shared workspace, and each agent turn reads it at start.

### Uptime

Each computer asks the other computers for the health of their stacks every minute. A computer silent for 3 minutes, or a stack that stops answering, gets one alert in each affected stack's channel.

## Offboarding a client

1. **Open the client's stack** with the Unlock stack workflow.
2. **Archive:** pipe a new archive key, made in the password manager, into `./circlechat/tenant/offboard.sh archive <client>`. The script writes a final encrypted archive, then test-restores the archive. Nothing is deleted unless the archive restores cleanly.
3. **Move the archive folder** into the Archive folder in Google Drive, by hand.
4. **Remove:** run `./circlechat/tenant/offboard.sh remove <client>` on each computer picked for the stack. The script lists those computers. The script destroys the client's disk image, with the Docker VM inside the image, and the stack's job runner. The shared model servers and Kev's model stay, because the cluster's own stack owns them.
5. **Check:** run `./circlechat/tenant/offboard.sh check <client>` on each of those computers, for a pass/fail table. The table also checks that the cluster's own stack runs as before on the computer: each model server, Kev's model, the job runner and each service, and the gateway on the control computer.
6. **Remove the client's access:** delete the client's GitHub environment, Tailscale shares, keys and tokens, and archive the client's Slack channel.

## Notifications

With `"notify": { "slack": true }`, `site.slack_channel_id` and `SLACK_BOT_TOKEN` set, the notifier posts to the stack's channel through the cluster's Slack app:
task created, assigned, status changed and done; every comment, flagged **needs @person** when it
mentions one; agent messages CircleChat rejected (otherwise silent); and tasks blocked 24 h or in
progress 12 h with no activity. It reads the database, so it misses nothing across restarts.

## Privacy

`site.example.json` is the only deployment-shaped file here, and it holds placeholders.
Don't commit a real `site.json`, an `.env`, a machine name, an address or a key. Kev's
disagreement notes can be pushed to a branch (`data.kev_disagreements_branch`); leave it empty when
the application's code is confidential, since that branch is as public as this repository.

## The agents

| Agent  | Job                                                                                                  | Writes                                           |
| ------ | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| Betty  | Designs and builds prototypes in the app repo (`/workspace/<repos.app_dir>`)                         | Prototype code                                   |
| Barb   | Reviews Betty's screens against the skills (subagents: checker, feisty). Flags rule problems to Alan | Her reports in `/workspace/reviews`              |
| Alan   | Turns feedback about the rules into PRs on this repo, and adapter or theme problems into issues      | PR branches in `/workspace/kb-proposals`, issues |
| Porter | Ports each golden-adapter (Mantine) release to the other adapters, one capped job per adapter        | One PR per target adapter, from a job            |

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

- **Compose needs both files.** `setup-host.sh` writes `COMPOSE_FILE=compose.yml:compose.agents.yml` into `.env`, so a plain `docker compose up -d` in the CircleChat folder loads both. Without the second file, the api loses Docker access and new agents fail to install.
- **On WSL, keep WSL running.** It stops when no Windows program holds it open, taking every service with it. `setup-host.sh` prints the keep-alive task.

- **Use the UI's Install + link to create agents.** Never insert agent rows in Postgres or hand-write `bridge-config.json`. The bridge only reads `handle`, `token`, `hermesHome` from it; tokens come from the install.
- **Never `rm -rf hermes-homes`.** Each agent's real setup lives in `hermes-homes/.hermes-<handle>/`.
- **Each agent's gateway key lives in the agent's own home.** `setup-agent.sh` puts the key there. A cloud key never does: the model gateway holds every cloud key.
- **The route an agent asks for is in `.hermes-<handle>/config.yaml`,** not the label on the agent page. `setup-agent.sh` sets the agent's first route from `agents.<handle>.routes` in site.json. The gateway then picks a cluster model or the agent's cloud key for each request.
- **A review that finishes but never appears is `HERMES_TIMEOUT`.** The api drops replies that arrive later than it + 60 s. `setup-host.sh` sets 4000.
- **Don't `git checkout compose.yml`** — the port change (8080) lives there. `setup-host.sh` reapplies it.
- **`restart` doesn't reload `.env`.** Use `up -d --force-recreate`.
- **Edit files in WSL (`~/…`), not the Windows copy (`C:\Users\…`).** Docker reads the WSL one.
- **Docker Desktop can't mount symlinks.** Use real directories.
- **One turn per agent at a time.** Messages sent while an agent is busy are dropped (`agent_busy`), not queued. Big tasks get split into subtasks.
- **Files under `hermes-homes` are owned by the container.** Use `sudo` to read or edit them.
- `HERMES_HOME=undefined` in bridge logs means the agent's `hermesHome` is missing — i.e. it wasn't installed through the UI.
- A 502 right after `up` means the api is still starting. Wait 30 seconds.
