# CircleChat setup for the Recursica agents

A client's IT team installs the platform with `circlechat/INSTALL.md`. This README holds the details each part of the kit needs.

Runs Betty, Barb and Alan (and optionally Loki) on a self-hosted
[CircleChat](https://github.com/tashfeenahmed/circlechat) with the Hermes runtime, all reading the
skills in this repo. Linux or macOS, on one machine or many.

## What is yours, and what is the repo's

Nothing about a deployment lives in this repository. Two files on the control machine, both
outside any repo, hold all of it:

| File                     | Holds                                                                                                            | Example                        |
| ------------------------ | ---------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `$CC_DIR/site.json`      | Machines, how to reach them, what each runs, model routes, cloud keys' names, the app                            | `circlechat/site.example.json` |
| `$CC_DIR/.env`           | Secrets other than cloud keys, such as `KEV_ENGINE_KEY` and `SLACK_BOT_TOKEN`                                    | —                              |
| `$CC_DIR/model-keys.env` | The cloud model keys, as `MODEL_KEY_<NAME>` lines. Root owns the file, and only the model gateway reads the file | —                              |

Each agent's gateway key and GitHub token stay in the agent's Hermes home (`setup-agent.sh` puts them there). No agent holds a cloud key.
Each extra machine keeps the secrets its services need in `~/.recursica-node.env`.

## Machines

`site.json` lists every machine as a **node**, as many as you have. Exactly one is the
**control** node: it runs CircleChat, the agents, the model gateway and the notifier. Any node can
serve models and a Kev-engine. `address` is how the control machine's containers reach it: a
Tailscale or other VPN address, or `host.docker.internal` for the control machine itself.

**Routes** are the names agents ask for. Each maps to an ordered list of the cluster's models
(`<node>/<model id>`); the gateway tries them in order, so put the fallback last. A cloud model
never joins a route: cloud models come from `model_keys`, as "Cloud models and the model gateway" describes. Kev-engines are tried best-first by `priority`, and Kev moves on by itself when one
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

## Clients: one isolated stack each

**Give each client a separate stack.** A stack is one client's CircleChat, agents, secrets, Slack channel, model gateway and job runner. A client's stack shares no part with Border UX's stack or another client's stack. Several stacks can run on one computer.

CircleChat's workspaces cannot keep clients apart. Inside one CircleChat, every agent shares one `/workspace` folder and one set of agent homes. The CircleChat api, worker and bridge also hold a Docker socket with root access to the computer.

1. **Create the client's encrypted disk image, then the client's Docker VM.** See "Encrypted client stacks" below. `disk-image.sh vm <client>` creates the Docker context `colima-<client>`.
2. **Write the client's site.json** at `~/tenants/<client>/circlechat/site.json`, with these fields:
   - `site.tenant`: the client's short name, in lowercase.
   - `site.kind`: `"client"`.
   - `site.docker_context`: the client's Docker context, such as `colima-<client>`.
   - `site.port`, `site.preview_port` and `site.gateway_port`: three ports no other stack uses.
3. **Ask the client whether the agents may send the client's data to a cloud model provider.** Until the client says yes, the stack runs local open-weight models only. When the client says yes, record the permission in `site.cloud_models`:

   ```json
   "cloud_models": { "allowed": true, "granted_by": "Person A, acme.com", "granted_on": "2026-10-20", "payer": "client-byok" }
   ```

   `payer` says who pays. `border-ramp` means Border UX pays, with a virtual card made for the client. `client-byok` means the client supplies the client's own key.

4. **Clone CircleChat** into `~/tenants/<client>/circlechat`. Put the client's secrets, including the Slack app's `SLACK_BOT_TOKEN`, in the client's GitHub environment, as "Secrets in GitHub" describes.
5. **Run every kit script with `TENANT=<client>`**, such as `TENANT=<client> ./circlechat/setup-host.sh`. Use the same prefix for `setup-agent.sh` and `setup-node.sh`.
6. **Give the stack an address** with `tailscale serve --bg --https=<port> http://127.0.0.1:<port>`.

With `TENANT=<client>`, the stack lives in `~/tenants/<client>/`. The stack's containers, volume, Compose project, ports and background jobs all carry the client's name. The stack's job runner reads secrets from `~/.recursica-node.<client>.env`.

The config check refuses a client stack in three cases:

- The stack has no `site.tenant`.
- The stack has no `site.docker_context`.
- The stack sets `data.kev_disagreements_branch`. Review data from a client's code stays in the client's stack.

With no recorded permission in `site.cloud_models`, the config check also refuses a `model_keys` block, every cloud route and Porter. The secrets helper refuses to deploy a cloud key to the stack.

Model servers that keep no data, such as Kev's model and a local model, can serve every stack. Declare each model server's service in one stack's site.json only. The other stacks list the same models and Kev ports, with no `services` entry. Give a client a separate model server when the client's contract requires one.

A stack with no `site.tenant` keeps the names a single install uses today. An existing install changes nothing.

## Encrypted client stacks

**Keep each client stack in an encrypted disk image with the client's own key.** The image holds the client's whole stack in `~/tenants/<client>`. The stack holds CircleChat, the agent homes, the workspace, the job folder, the secrets file and the logs. The client's Docker VM lives inside the image too, in `~/tenants/<client>/colima`. Each client stack runs on the Docker engine in the stack's own VM, never on a shared Docker engine.

| Computer                   | Disk image                                           | Docker VM                                     |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| A Mac                      | An encrypted APFS sparse bundle in `~/tenant-images` | A Colima profile, with Apple's virtualization |
| Linux, or Windows with WSL | A LUKS image file in `/var/lib/agent-stacks/images`  | A Colima profile, with QEMU and KVM           |

1. **On Linux or in WSL, prepare the computer once.** Run `./circlechat/tenant/setup-pc.sh` as the account that owns the stacks. The script installs QEMU, Lima, Colima and cryptsetup, and adds the account to the `kvm` group. The script also installs `agent-stacks-disk`, the part of `disk-image.sh` that runs as root. Rerun the script after the kit changes.
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
3. **Add the stack's secrets to the environment**, with the names in the table below.
4. **Copy `circlechat/deploy/deploy-secrets.yml`** to `.github/workflows/deploy-secrets.yml` in the private repo.
5. **Install a GitHub self-hosted runner on each computer**, for the private repo only, under a separate account. Give the runner a label with the computer's name from site.json.
6. **Run `./circlechat/deploy/install-secrets-helper.sh <runner account>`** on each computer, as the account that owns the stacks. The runner's account can then run one command as root: the helper that writes the secrets.
7. **Run the "Deploy secrets" workflow** with the stack and the computer. The workflow writes each secret to the file that reads the secret, then restarts the services that read the file.

The node secrets file is `~/.recursica-node.env`, or `~/.recursica-node.<client>.env` for a client stack.

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

When the filter refuses a site:

1. The agent gets an error page that names the filter and the rule. The agent uses an allowed site only when the allowed site is the genuine source of the same thing. The agent never reaches the blocked site another way.
2. With no genuine allowed source, the agent comments on the task, sets the task to blocked, and stops.
3. The stack's Slack channel gets one request with two buttons. "Allow once (15 min)" needs an authenticator code and opens the site for that stack for 15 minutes. "Deny" keeps the site closed.
4. After a decision, tell the agent on the task, so the agent retries or stops waiting.

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

**Keep each key's value in the stack's GitHub environment,** as `MODEL_KEY_<NAME>`: `MODEL_KEY_DEFAULT` for `default`, and `MODEL_KEY_ACME_GROK` for `acme-grok`. A Bedrock key's value is `<access key id>:<secret access key>`. The secrets helper writes each value to `model-keys.env` on the control computer. Root owns that file, and only the gateway reads the file. The gateway reads each key from the file when the gateway starts, never from an environment variable. `docker inspect` then shows no key. CircleChat, the agent homes, the agent and job containers, the `.env` files and the backups hold no cloud key. Keep each provider's spend limit in the provider's console.

**A stack with no `model_keys` block keeps working.** The cloud model in the stack's routes becomes the key named `default`, which every agent uses. `setup-host.sh` moves the stack's `ANTHROPIC_API_KEY` out of `.env` and into `model-keys.env` as `MODEL_KEY_DEFAULT`. Rename the GitHub secret to `MODEL_KEY_DEFAULT` after that move.

### Agents

**Set each agent's routes and cloud switch in `agents` in site.json:**

```json
"agents": {
  "betty": { "routes": ["local-large"] },
  "loki": { "routes": ["local-small"], "cloud": false }
}
```

- `routes`: the routes the agent's gateway key may use. The agent asks for the first route. An agent that `agents` leaves out may use every route.
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
- **A stack with no cluster model fails a Cluster only task.** The gateway posts a comment on the task that says why, once per task.

### The spend log

**The gateway writes one line per request to `<CC_DIR>/gateway-logs/spend.jsonl`.** Each line holds these fields:

- the time, the task and the agent
- the key's name, or `cluster` for a cluster model
- the route, the model that answered, the status and the token counts The log holds no prompt and no answer.

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

A test restore runs on the first day of January, April, July and October. The test unpacks the newest backup into a scratch folder, then checks the database dump, the file store and the agent homes. The result goes to the stack's Slack channel, and so does every failed backup. Run a test restore at any time with `FORCE=1`.

## Security services

`./circlechat/cluster/install-cluster.sh <computer>` installs the security services on one computer. Run the script on each computer, after `setup-host.sh` or `setup-node.sh`. The script installs five parts:

- **Firewall rules:** each new incoming connection is refused, except from the computer itself, Tailscale, Docker's internal networks and allowed sources. The rules load at every start-up. On Windows, run `circlechat/cluster/windows/install-windows-guard.ps1` once in an Administrator PowerShell.
- **Decoys:** OpenCanary runs a fake SSH login, FTP server and web page on ports 2222, 2121 and 8088. Nobody legitimate touches a decoy, so any touch starts a lockdown.
- **The cluster agent:** each minute, the agent checks incoming connections, the decoys and the other computers' stacks. The agent also runs each scheduled reboot.
- **The update job,** hourly: one job for every kind of update.
- **The Slack app,** on the control computer only.

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

Operating system packages are checked each hour, and each stack's container images once a day. Every image runs at an exact version from the stack's `images.lock`, and a failed health check moves the stack back to the old versions. macOS installs its own system updates overnight, and Windows waits 7 days before installing a quality update. A stack without `upgrade.auto` moves `@recursica/mcp` to a new version after 7 days. The version lives in `.recursica-mcp-version` in the shared workspace, and each agent turn reads it at start.

### Uptime

Each computer asks the other computers for the health of their stacks every minute. A computer silent for 3 minutes, or a stack that stops answering, gets one alert in each affected stack's channel.

## Offboarding a client

1. **Open the client's stack** with the Unlock stack workflow.
2. **Archive:** pipe a new archive key, made in the password manager, into `./circlechat/tenant/offboard.sh archive <client>`. The script writes a final encrypted archive, then test-restores the archive. Nothing is deleted unless the archive restores cleanly.
3. **Move the archive folder** into the Archive folder in Google Drive, by hand.
4. **Remove:** run `./circlechat/tenant/offboard.sh remove <client>` on each computer. The script destroys the client's disk image, with the Docker VM inside the image.
5. **Check:** run `./circlechat/tenant/offboard.sh check <client>` on each computer, for a pass/fail table.
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
