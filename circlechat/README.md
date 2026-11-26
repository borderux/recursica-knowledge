# The kit for the Recursica agents' cluster

A client's IT team installs the platform with `circlechat/INSTALL.md`. This README holds the details each part of the kit needs.

The kit runs the cluster around the Recursica agents, on Linux or macOS, on one computer or many:

- the model gateway, which holds every cloud key
- the job runners, which run port jobs
- Kev, and the app preview
- the scripts and jobs of the RecursicaChat 2.0 server, where the agents run
- the cluster's security services, and the update job

**The kit's folder keeps its old name, `circlechat/`.** The kit once ran CircleChat 1.x, a chat server, and no longer does. "CircleChat 1.x is gone" says what changed.

## What is yours, and what is the repo's

Nothing about a deployment lives in this repository. The stack's folder on the control machine,
`$CC_DIR`, holds all of it, outside any repo. `$CC_DIR` is `~/recursica-stack`, or `~/circlechat` on a
computer that a person has not moved yet ("Moving a computer off CircleChat 1.x's names"):

| File                     | Holds                                                                                                                 | Example                        |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------- | ------------------------------ |
| `$CC_DIR/site.json`      | Machines, how to reach them, what each runs, model routes, cloud keys' names, the app                                 | `circlechat/site.example.json` |
| `$CC_DIR/.env`           | Secrets other than cloud keys, such as `KEV_ENGINE_KEY` and `SLACK_BOT_TOKEN`                                         | —                              |
| `$CC_DIR/model-keys.env` | The cloud model keys, as `MODEL_KEY_<NAME>` lines. Root owns the file on Linux. Only the model gateway reads the file | —                              |

Each agent on the RecursicaChat 2.0 server gets a gateway key of its own from `rc-sync.sh`. No agent holds a cloud key.
Each extra machine keeps the secrets its services need in `~/.recursica-node.env`.

## Machines

`site.json` lists every machine as a **node**, as many as you have. Exactly one is the
**control** node: it runs the model gateway, the app preview and the RecursicaChat 2.0 server's jobs. Any node can
serve models and a Kev-engine. `address` is how the control machine's containers reach it: a
Tailscale or other VPN address, or `host.docker.internal` for the control machine itself.

**Routes** are the names agents ask for. Each maps to an ordered list of the cluster's models
(`<node>/<server id>/<model id>`); the gateway tries them in order, so put the fallback last. A cloud model
never joins a route: cloud models come from `model_keys`, as "Cloud models and the model gateway" describes. Kev-engines are tried best-first by `priority`, and Kev moves on by itself when one
is unreachable. Add a machine by adding a node and rerunning `setup-host.sh`.

**A rerun restarts only the services that change.** `setup-host.sh`, `setup-node.sh` and `install-cluster.sh` rewrite each service's systemd unit or launchd plist. A running service restarts when the service's command or settings change, such as a new `--host`. A change to a settings file, such as the secrets file, restarts the service too. A new kit release restarts each service that runs the kit's code: jobd, the token service and the cluster agent. Every other service keeps running. Each rerun prints `<service> changed: restarted` or `<service> is running and unchanged`. A change to a unit's description alone, such as `(agent cluster kit)`, reloads systemd and restarts no service.

### Model servers

**A computer can run more than one model server.** List each server under the node's `servers`, with the models the server serves. The kit supports two kinds of server:

- `ollama`: Ollama, on a Mac or a PC. One Ollama server can serve several models. The kit installs and runs Ollama on a Mac control computer and on a Linux helper computer, as "Ollama on a Linux helper computer" describes.
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

**An Ollama server the kit runs can set five of Ollama's own settings.** The kit runs Ollama on a Mac control computer and on a Linux helper computer. The kit's Ollama service runs with each setting the server sets. A setting left out keeps Ollama's default.

| Setting in `site.json` | Ollama's setting           | What the setting sets                                                                       |
| ---------------------- | -------------------------- | ------------------------------------------------------------------------------------------- |
| `context_length`       | `OLLAMA_CONTEXT_LENGTH`    | The context length, in tokens, for each request                                             |
| `parallel`             | `OLLAMA_NUM_PARALLEL`      | The requests each model answers at once                                                     |
| `keep_alive`           | `OLLAMA_KEEP_ALIVE`        | How long a model stays loaded: `"-1"` keeps each model loaded, or a time, such as `"30m"`   |
| `kv_cache_type`        | `OLLAMA_KV_CACHE_TYPE`     | The working memory's number format: `"f16"`, or `"q8_0"` or `"q4_0"` to compress the memory |
| `max_loaded_models`    | `OLLAMA_MAX_LOADED_MODELS` | The models loaded at one time                                                               |

A compressed working memory, `"q8_0"` or `"q4_0"`, needs Ollama's flash attention. The kit then turns on `OLLAMA_FLASH_ATTENTION` too.

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

**An Ollama server with `max_loaded_models` keeps only that many models loaded.** For such a server, the config check counts only the server's largest `max_loaded_models` models. For example, a server lists two models of 5 GB and 3 GB, with `max_loaded_models` at 1. The check counts 5 GB for the server. Ollama unloads one model to load the other, so the first request to the other model waits for the load.

**Name a model as `<node>/<server id>/<model id>`,** such as `machine-2/mlx/large-mlx`, in a route or in an agent's routes. Pull or download each model on its server first: the kit does not.

### Ollama on a Linux helper computer

**`setup-node.sh` installs and runs Ollama on a Linux helper computer** that has a server of kind `ollama` in site.json. A helper computer is a node without `"control": true`. The kit runs one Ollama server on each helper.

```json
{
  "name": "machine-3",
  "os": "linux",
  "address": "100.64.0.9",
  "model_memory_gb": 6,
  "servers": [
    {
      "id": "ollama",
      "kind": "ollama",
      "port": 11434,
      "listen": "127.0.0.1",
      "context_length": 8192,
      "parallel": 2,
      "keep_alive": "-1",
      "kv_cache_type": "q8_0",
      "max_loaded_models": 1,
      "models": [{ "id": "judge-small", "model": "qwen3:4b", "memory_gb": 5 }]
    }
  ]
}
```

`listen` is the address the server listens on. The setting takes one of two values:

- `"127.0.0.1"`, for a trial on the computer itself. The control computer's gateway can't reach the server. So the gateway gets no entry for the server's models, and the config check refuses a route or an agent that names one of the models.
- The computer's address in site.json, such as its Tailscale address, once the gateway uses the server. Without `listen`, the server listens on the computer's address.

Each firewall on the computer already refuses every source outside Tailscale. Ollama's API can download and delete models. In the tailnet's policy file, let only the control computer reach the server's port.

`setup-node.sh` takes four steps for the server, in `kit/setup-ollama.sh`:

1. **The pinned release.** The script downloads Ollama's Linux archive, version 0.40.15. The script checks the archive's SHA-256 against the hash pinned in `kit/ollama.mjs` before unpacking the archive. A different hash stops the script, and nothing is installed. The release goes to `/opt/recursica-ollama/<version>`, owned by root. Version 0.40.15 supports NVIDIA's GeForce RTX 50 series (Blackwell) with driver 550 or newer.
2. **The account.** A system account, `recursica-ollama`, has no login shell. The account owns `/var/lib/recursica-ollama`, mode 700, which holds the models. No other account can write there. On a computer with the `video` or `render` group, the account joins the group, so the account can use the GPU.
3. **The service.** The systemd service `recursica-ollama` runs `ollama serve` as the account, on `listen` and the port, with the server's settings. The service can write only to the account's folder.
4. **The models.** The script pulls each model the server lists, when the server lacks the model. The script removes no model, including a model site.json no longer lists.

**The script stops, and changes nothing, beside another Ollama.** Another Ollama is an `ollama.service` from Ollama's own installer, or another program on the server's port. The message names the commands that retire the other service. The script also needs `curl` and `zstd`, and names the command that installs a missing tool.

**The config check refuses models that don't fit.** The models of a helper's server must fit in the computer's `model_memory_gb`, as on every computer. On a PC, `model_memory_gb` is the GPU's memory left beside other programs, such as a Kev-engine.

To move to a newer Ollama, change the version and both hashes in `kit/ollama.mjs`, from the release's `sha256sum.txt`. Then run `setup-node.sh` on each helper.

**An older `site.json` keeps working.** A node may still list `models`, each with its own port, and name each model `<node>/<model id>`. The gateway counts port 11434 as an Ollama server named `ollama`.

### Comparing models

**Give each agent the server and model to compare.** An agent's `routes` can name a route or one cluster model:

```json
"agents": {
  "betty": { "routes": ["machine-2/ollama/large-local"] },
  "barb": { "routes": ["machine-2/mlx/large-mlx"] }
}
```

To move an agent to another server or model, change `site.json` and rerun `setup-host.sh`. The spend log then records the agent, the server and the model for each request, so runs compare by agent, server and model.

## Install, in order

1. **Control machine:** clone this repo to `~/recursica-knowledge` (see "The kit checkout" below).
   Write `~/recursica-stack/site.json` from `circlechat/site.example.json`, and add secrets to
   `~/recursica-stack/.env`.
2. `~/recursica-knowledge/circlechat/setup-host.sh`. It validates `site.json`, and stops before
   changing anything when `site.json` is wrong. Then it sets up the shared workspace,
   `~/recursica-workspace`, and its checkouts, copies Kev, and starts the app preview and the model
   gateway. It also installs the start-at-boot and hourly jobs (systemd or launchd).
3. **Every other machine:** copy `site.json` over (it holds no secrets), put its services'
   secrets in `~/.recursica-node.env`, and run `./circlechat/setup-node.sh <node name>`.
   **On each Windows computer**, also run `install-wsl-boot.ps1` once, as "WSL at boot on Windows" describes.
4. **The app preview's address:** `setup-host.sh` runs `tailscale serve` for the preview, as "Addresses on the tailnet" describes. With `site.proxy` set to `other`, point an HTTPS reverse proxy on the control computer at `127.0.0.1:<site.preview_port>`.
5. **The agents** run on the RecursicaChat 2.0 server. "Agents on RecursicaChat 2.0" describes how `rc-sync.sh` sets them up.

### WSL at boot on Windows

**On Windows, WSL starts only when someone signs in.** After an unattended restart, such as a 4 a.m. update, the cluster's services in WSL stay down until someone signs in. WSL also shuts down when idle. Run `circlechat/cluster/windows/install-wsl-boot.ps1` once on each Windows computer, in an Administrator PowerShell, as the account that owns the WSL distro:

```powershell
powershell -ExecutionPolicy Bypass -File \\wsl.localhost\<distro>\home\<you>\recursica-knowledge\circlechat\cluster\windows\install-wsl-boot.ps1 -DryRun
powershell -ExecutionPolicy Bypass -File \\wsl.localhost\<distro>\home\<you>\recursica-knowledge\circlechat\cluster\windows\install-wsl-boot.ps1
```

`-DryRun` prints the task, the change to `.wslconfig` and the old task's removal, and changes nothing. The script finds the distro from the script's own path. Pass `-Distro <name>` for another distro.

The script sets up the task, the idle settings and the removal of the old task:

1. **The task `AgentClusterWSL`** starts at boot, before anyone signs in, as the distro's owner. The task's logon type is S4U ("Do not store password"), so Windows stores no password. The task runs `keep-wsl.ps1` from `C:\ProgramData\AgentCluster\wsl`. The script holds the distro open, and starts the distro again whenever the distro stops. Only an administrator can change the script, and the owner can change only the `logs` folder. Each start and stop goes to `logs\wsl-keeper.log`.
2. **The idle settings** in the owner's `%UserProfile%\.wslconfig`, so WSL never shuts down when idle. A copy of the old file stays as `.wslconfig.agentcluster-backup`.
3. **The old task `Start-WSL-K3s-Ollama`** goes, but only after `AgentClusterWSL` runs and holds the distro open. Until then, the old task stays.

| Setting                            | What `-1` does                          | Needs                                                                     |
| ---------------------------------- | --------------------------------------- | ------------------------------------------------------------------------- |
| `[wsl2] vmIdleTimeout=-1`          | The WSL VM never shuts down when idle.  | WSL 2.5.8 or later, on Windows 11. Microsoft's docs name Windows 11 only. |
| `[general] instanceIdleTimeout=-1` | Each distro never shuts down when idle. | WSL 2.5.8 or later.                                                       |

WSL's source has both settings from 2.5.8, the first open-source release. The source has no older history, so the kit asks for 2.5.8. In both, a negative value sets no idle timer. With an older WSL, the script leaves `.wslconfig` alone and names the update: `wsl --update`.

**The idle settings take effect at the next WSL restart.** WSL reads `.wslconfig` only when WSL starts, and the script never stops WSL. Until the next restart of Windows or of WSL, the task alone keeps the distro running.

The script starts the task at once. WSL is already running, so the task joins the running distro, and nothing restarts.

**On the RustDesk server's computer, add `-RustDeskServer`.** The script then also writes `[experimental] hostAddressLoopback=true`, so the computer's own RustDesk client reaches the server by ID. "The server's own computer" under "The RustDesk server" explains why. The setting has three requirements. On a computer that misses one, the script stops before any change:

| Needs                                    | Source                                                                             |
| ---------------------------------------- | ---------------------------------------------------------------------------------- |
| `networkingMode=mirrored` under `[wsl2]` | Microsoft's docs: the setting applies only to mirrored networking.                 |
| Windows 11 version 22H2 or later         | Microsoft's docs.                                                                  |
| WSL 2.5.8 or later                       | WSL's source, from 2.5.8, the first open-source release. The docs name no version. |

Like the idle settings, `hostAddressLoopback` takes effect at the next WSL restart.

### Files in the agents' workspace

**An agent can change any file in the shared workspace, symlinks included.** A plain `cp -r`, `tee`
or `chmod -R` there would follow a symlink an agent put there, and change a file anywhere on the
computer. So the kit keeps three rules:

- **Every file the kit copies there comes from the kit checkout,** `~/recursica-knowledge`, never
  from the workspace's checkout, which an agent can change. Kev's files are such a copy.
- **Every write there goes through `circlechat/kit/safe-files.mjs`.** A symlinked folder on the way
  to a file is refused, and nothing is written there. Each file is written as a new file, then
  moved into place, so a symlink at the file's own name is replaced and the file the symlink names
  never changes. A read never follows a symlink. The Kev data push follows the same rules when the
  push reads the review notes from the workspace, before the notes go to a branch.
- **The key check never follows a symlink.** The check skips each symlink, never reads the file
  the symlink names, and names each skipped symlink in the report.

### The cluster's own stack's name

**`site.stack_name` names the cluster's own stack, the stack with no `site.tenant`.** The name is the stack's GitHub environment, and the stack's name in backups, Slack messages and logs. With no `stack_name`, the stack is named `cluster`. A client or demo stack takes its name from `site.tenant` instead, and the stack's environment is `client-<name>`.

- Set `stack_name` once, before the stack's first backup. A new name starts a new backup history and needs a GitHub environment with that name.
- The name is lowercase letters, digits and hyphens, and never starts with `client-`.

### The kit checkout

**Clone this repo to `~/recursica-knowledge`, and run each kit command from that checkout.** Root runs the kit's scripts. Kev, the app and the knowledge checkouts sit in the agents' workspace, `~/recursica-workspace`. An agent could change a checkout inside the workspace, and root would then run the change.

Each script below checks the kit checkout first, with `circlechat/kit/check-kit.sh`:

- `setup-host.sh`, which installs the stack's jobs
- `deploy/install-secrets-helper.sh`, and the secrets helper, `agent-stacks-apply`
- `tenant/setup-pc.sh`, which installs `agent-stacks-disk`
- `cluster/install-cluster.sh`, and the cluster agent and the update job at each start

The check refuses a checkout in three cases:

- The checkout sits inside an agents' workspace: `~/recursica-workspace`, the older `~/circlechat-workspace`, or `~/tenants/<client>/workspace`.
- The group or other accounts can change the checkout, or a folder above the checkout. Fix the checkout with `chmod -R go-w ~/recursica-knowledge`, and a folder above the checkout with `sudo chmod go-w <folder>`.
- Another account owns a file or folder in the checkout. Fix the checkout with `sudo chown -R <owner> ~/recursica-knowledge`.

The refusal names the file and the command that fixes the checkout.

**The update job posts each refusal in the cluster's channel,** with the reason and the command that fixes the checkout. The post goes out once. The post repeats for a new reason, or 24 hours after the last post. The job then stops, and no update runs on the computer until the checkout passes. The job posts from the job's own file, and loads no other module from the refused checkout.

A root-owned folder with the sticky bit, such as `/tmp`, passes above a checkout. Other accounts cannot rename or delete the owner's folder there.

**The workspace keeps its own checkouts,** such as `~/recursica-workspace/recursica-knowledge`, which Kev reads, and the app the preview serves.

**No kit script runs git in the workspace, as the owner or as root.** An agent can change each checkout there, the checkout's git settings and hooks included, and git runs the hooks and the filters a checkout's settings name. So:

- `setup-host.sh` clones each checkout once, when nothing is at the checkout's path, and never runs git in a checkout after that.
- A release upgrade moves only the kit checkout, `~/recursica-knowledge`, to each release. The job runs the setup from that checkout.
- With `updates.follow` set to `"main"`, the update job moves only the kit checkout, to each verified commit on main.

**The check finds a checkout that agents or other accounts could change.** The check cannot find a file that was changed before the check ran.

To move an existing install, clone this repo to `~/recursica-knowledge`. Then rerun each command below from the new checkout:

- `setup-host.sh`, once for each stack
- `install-secrets-helper.sh <runner account>`
- `install-cluster.sh <computer>`
- `setup-pc.sh`, on Linux or in WSL

### Colima and Ollama on a Mac

**On a Mac, `setup-host.sh` runs Colima and Ollama as LaunchDaemons that run as the owner.** A LaunchDaemon starts at each start-up, before anyone logs in. Homebrew's services (`brew services`) are LaunchAgents, which start only when the owner logs in. The script stops each Homebrew service for Colima and Ollama and removes the service.

- **Colima:** the daemon runs the VM of the current Docker context, `colima` or `colima-<profile>`. A stopped VM has no Docker context, so with no Colima context, and no other Docker that answers, the profile is the folder `~/.colima/<profile>` that holds `colima.yaml`. With two or more such folders, the profile is the one the kit's daemon already runs. Otherwise `setup-host.sh` stops and asks for the stack's VM to be started with `colima start --profile <profile>`. The daemon runs `circlechat/kit/colima-service.sh`.
- **Colima, right after the install:** the daemon first stops a VM that runs outside the daemon, such as a VM started by hand, and that VM answers Docker until the VM stops. So `setup-host.sh` waits for the daemon's own `colima start`, then for Docker on the VM's own context. Docker answering alone proves nothing. When launchd stops the daemon, the script runs `colima stop`, then ends `colima start -f`. `colima start -f` keeps running after the VM stops. Without that step, the daemon never exits.
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

#### The ports the stack's VM forwards to the Mac

**The stack's VM forwards a port to the Mac only on `127.0.0.1`, and never a port below 1024.** Without a rule, Colima forwards a port a container publishes with no address, such as `docker run -p 8080:80`, to every address of the Mac, and so to every network the Mac is on. `kit/lima-override.yaml` holds the same two rules as the RecursicaChat 2.0 server's VM (`recursicachat/lima-override.yaml`), and a test keeps the two the same:

- Ports 1 to 1023, on any address in the VM: never forwarded. The VM's sshd (22) and DNS server (53) are among them.
- Ports 1024 and up that the VM opens on every address: to `127.0.0.1` only.
- A port the VM opens on `127.0.0.1` still goes to `127.0.0.1`, by Colima's own rule. The gateway publishes each of its ports there, and `tailscale serve` passes the Tailscale ports to those local ports, so the gateway's ports don't change.

`kit/lima-override.sh` installs the file as the owner, never as root, at `~/.colima/_lima/_config/override.yaml` (under `$COLIMA_HOME` when set), mode 600. `setup-host.sh` runs it before it installs Colima's daemon. A link, changed text or a wrong mode installs the file again, through a new file renamed over the old one, so a link is replaced, never followed. Lima reads the file at each start of a VM in that folder. The script never restarts the VM. A client stack's VM keeps its own `COLIMA_HOME` in the client's disk image, and gets no rules.

To apply it on a Mac set up before the file existed:

1. **Install the file,** as the owner, from the kit's checkout once it holds this change:

   ```sh
   circlechat/kit/lima-override.sh
   ```

2. **Restart the VM, at a time when no run needs the gateway.** Every container of the stack stops while the VM restarts, and each one with a restart policy starts again with the VM:

   ```sh
   sudo launchctl kickstart -k system/io.recursica.colima
   ```

3. **Check the forwards.** Each line the VM's forwarder opens on the Mac must be `127.0.0.1`, at port 1024 or above, and the gateway must answer as before:

   ```sh
   lsof -nP -iTCP -sTCP:LISTEN | awk '$1 == "ssh" || $1 == "limactl"'
   curl -s http://127.0.0.1:<site.gateway_local_port>/health    # {"ok":true}
   curl -s -o /dev/null -w '%{http_code}\n' "http://$(tailscale ip -4):<site.gateway_port>/health"   # 401: served, and a key is needed
   tailscale serve status    # unchanged
   ```

4. **Check a bare publish.** A container published with no address must reach `127.0.0.1` only:

   ```sh
   docker run -d --rm --name forward-check -p 18080:8080 node:22 node -e 'require("http").createServer((q, s) => s.end("ok")).listen(8080)'
   sleep 5; lsof -nP -iTCP:18080 -sTCP:LISTEN    # 127.0.0.1:18080, not *:18080
   docker rm -f forward-check
   ```

## The job runners and port jobs

A port is too long and too heavy for an agent turn, so each port runs as a **job** on a **job
runner** (`circlechat/jobd`): one container per job, capped at the node's `jobs.memory_gb`, at most
`jobs.slots` at once. A port goes to the first job runner with room, best first by
`jobs.priority`. `agents/porter/runtime/hermes.md` explains the design.

1. **Give Porter a GitHub App** with Contents and Pull requests on the target adapters only
   (`porter.targets`), and no merge rights, as "GitHub access for agents" describes. Protect
   `main` on each target with a ruleset whose bypass list is empty. The app's bot identity keeps
   the pull requests reviewable by the whole team.
2. **On each job-runner machine** (a node with `jobs`), put these in `~/.recursica-node.env`:
   `JOBD_TOKEN` (copied from the control machine's `.env`), and, when a webhook takes the job's
   result, `PORTER_HOOK_URL` and `PORTER_HOOK_SECRET`. The file holds no cloud key and no GitHub
   token. The machine's user needs Docker access. Then run `setup-node.sh <node>`: it builds the
   `recursica/porter-job` image and starts the job runner on `jobs.port`. On the control computer,
   run `setup-host.sh` first, so the gateway exists.

A job runner only runs the porter job type for the repositories in `porter.targets`, so a
request cannot run an arbitrary command. The job's secrets reach the container by name, never on
a command line. Each job sends the job's model requests to the control computer's gateway, with
the gateway key for the job's task, and asks for the `coder` route, never a model ("Agents"). A job that runs out of memory ends as `out_of_memory` and is
reported; the machine keeps running.

**A job's container sees only the job's work folder.** Each job has two folders in the job runner's job folder, such as `~/.recursica-jobs`:

- `<job>/`, mode 700, holds the job runner's files: `meta.json`, `gateway.env` and `job.log`.
- `<job>/work/` is the container's `/work`, with `package.md` and the job's `report.md`.

The job runner reads `report.md` without following a link, up to 1 MB (`JOBD_REPORT_MAX_BYTES`). A larger report gets a 413 answer. A link or a named pipe at `report.md` counts as no report.

**A job runner listens on `127.0.0.1` and the computer's Tailscale addresses, never on the office network.** `setup-node.sh` reads the Tailscale addresses with `tailscale ip`. Without Tailscale, the job runner listens on `127.0.0.1` only, and other computers cannot reach the job runner. The control computer's job runner listens at the control computer's `tailnet_address`. On Linux, `host.docker.internal` is Docker's bridge address, where no job runner listens.

**On the control computer, port jobs reach the gateway as `cc-gateway`, on the jobs' closed network, `jobs-egress`.** `setup-host.sh` connects the gateway to that network whenever the network exists, before the gateway starts.

## Clients: one isolated stack each

**Give each client, and each demo, a separate stack.** A stack is one client's workspace, secrets, Slack channel, model gateway and job runner. A client's stack shares no data with the cluster's own stack or another client's stack. Several stacks can run on one computer. A demo stack (`site.kind` `"demo"`) follows the same rules as a client stack, including the recorded permission for cloud models.

### The stack's computers

**Pick the computers for each stack:** one computer from the cluster's site.json, such as one PC or one Mac, or the whole cluster.

- **One computer:** that computer is the stack's control computer. The computer runs the stack's gateway in the stack's own Docker VM.
- **The whole cluster:** the cluster's control computer runs the stack's gateway, in the stack's own Docker VM.

The stack's site.json records the choice in `site.computers`, `["<computer>"]` or `"cluster"`, and lists only the picked computers. The stack's agents, jobs, local models and Kev's model then use only those computers. `setup-host.sh` checks the stack's computers and ports against the cluster's own site.json, `~/recursica-stack/site.json`.

**Write the stack's site.json with `circlechat/kit/stack-site.mjs`:**

```bash
node circlechat/kit/stack-site.mjs ~/recursica-stack/site.json acme demo machine-2 > site.json
node circlechat/kit/stack-site.mjs ~/recursica-stack/site.json acme client cluster > site.json
```

### Cloud keys for a demo

**Setting up a demo always asks:** "Give this demo cloud model keys, such as Claude or Grok, with billing attached? [y/N]". Each cloud key comes with billing, so a demo needs a recorded permission, the same as a client stack.

- **No**, the default: the demo gets no `model_keys` and no cloud route, and runs on local models only. site.json records `"cloud_models": { "allowed": false }`.
- **Yes:** the script asks for each provider and model, such as `anthropic:claude-sonnet-5-5,xai:grok-4`. Then the script asks who granted the permission and who pays. The script records the answers in the demo's `site.cloud_models` and `model_keys`. The first key is the key named `default`, which every agent uses. Each other key is named for the key's provider: name the key's agents in site.json. Add an Azure or Bedrock key to site.json by hand.

**Without a person at the keyboard, such as from Claude Code, give the answer as an option.** The script then stops unless the command has `--cloud-keys`, and never answers yes without the option:

```bash
node circlechat/kit/stack-site.mjs ~/recursica-stack/site.json acme demo machine-2 --cloud-keys none > site.json
node circlechat/kit/stack-site.mjs ~/recursica-stack/site.json acme demo machine-2 \
  --cloud-keys anthropic:claude-sonnet-5-5 --granted-by "Person A" --payer operator > site.json
```

**Add the key values yourself, outside Claude Code,** with `circlechat/deploy/set-model-keys.sh <site.json> <owner/private repo>`. The script asks for each key's value at the keyboard and shows nothing on the screen. The script saves each value as a `MODEL_KEY_<NAME>` secret in the stack's GitHub environment, through `gh`. The script refuses to run without a terminal, or inside a Claude Code session. Then run the "Deploy secrets" workflow for the stack.

The script copies the picked computers, their routes and the agents from the cluster's site.json. The script gives the stack the first ports that no stack in `~/tenants` uses. Check `repos` before the first setup.

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
2. **Write the stack's site.json** at `~/tenants/<client>/stack/site.json` with stack-site.mjs. The script sets these fields:
   - `site.tenant`: the stack's short name, in lowercase.
   - `site.kind`: `"client"` or `"demo"`.
   - For a demo, `site.cloud_models` and any `model_keys`, from the answer about cloud keys.
   - `site.docker_context`: the stack's Docker context, `colima-<client>`.
   - `site.computers`: the picked computers.
   - `site.port`, `site.preview_port` and `site.gateway_port`: three ports no other stack uses, and each job runner's `jobs.port`. `site.port` was CircleChat 1.x's port. The config check still keeps the port apart from the others.
3. **For a client stack, ask the client whether the agents may send the client's data to a cloud model provider.** Until the client says yes, the stack runs local open-weight models only. When the client says yes, record the permission in `site.cloud_models`:

   ```json
   "cloud_models": { "allowed": true, "granted_by": "Person A, acme.com", "granted_on": "2026-10-20", "payer": "client-byok" }
   ```

   `payer` says who pays. `operator` means the company that runs the cluster pays, with a virtual card made for the client. `client-byok` means the client supplies the client's own key. The older value `border-ramp` means the same as `operator`, and still passes.

4. **Put the stack's secrets,** including the Slack app's `SLACK_BOT_TOKEN`, in the stack's GitHub environment, as "Secrets in GitHub" describes.
5. **Run every kit script with `TENANT=<client>`**, such as `TENANT=<client> ~/recursica-knowledge/circlechat/setup-host.sh`. Use the same prefix for `setup-node.sh` on each picked computer that runs jobs.
6. **The stack's address:** `setup-host.sh` gives the stack's app preview `https://<host>:<site.preview_port>`, as "Addresses on the tailnet" describes.

With `TENANT=<client>`, the stack lives in `~/tenants/<client>/`: the stack's folder, `~/tenants/<client>/stack`, and the workspace, `~/tenants/<client>/workspace`. A stack set up while CircleChat 1.x ran keeps `~/tenants/<client>/circlechat` until a person moves the folder. The stack's containers, Docker network, ports and background jobs all carry the client's name. The stack's job runner reads secrets from `~/tenants/<client>/node.env`.

The config check refuses a client or demo stack in these cases:

- The stack has no `site.tenant`.
- The stack has no `site.docker_context`.
- `site.computers` picks one computer, and the stack lists another computer, or the picked computer is not the control computer.
- `site.computers` is `"cluster"`, and the stack leaves out a computer of the cluster, or names another control computer.
- The stack uses a port of the cluster's own stack.

The config check also refuses a client stack that sets `data.repo`. Review data from a client's code stays in the client's stack. With no recorded permission in `site.cloud_models`, the config check also refuses a `model_keys` block, every cloud route and Porter on a client or demo stack. The secrets helper refuses to deploy a cloud key to the stack.

A stack with no `site.tenant` keeps the names a single install uses.

## Encrypted client stacks

**Keep each client stack in an encrypted disk image with the client's own key.** The image holds the client's whole stack in `~/tenants/<client>`. The stack holds the stack's folder, the workspace, the job folder, the secrets file and the logs. The client's Docker VM lives inside the image too, in `~/tenants/<client>/colima`. Each client stack runs on the Docker engine in the stack's own VM, never on a shared Docker engine.

| Computer                   | Disk image                                           | Docker VM                                     |
| -------------------------- | ---------------------------------------------------- | --------------------------------------------- |
| A Mac                      | An encrypted APFS sparse bundle in `~/tenant-images` | A Colima profile, with Apple's virtualization |
| Linux, or Windows with WSL | A LUKS image file in `/var/lib/agent-stacks/images`  | A Colima profile, with QEMU and KVM           |

1. **On Linux or in WSL, prepare the computer once.** Run `~/recursica-knowledge/circlechat/tenant/setup-pc.sh` as the account that owns the stacks. The script installs QEMU, Lima, Colima and cryptsetup, and adds the account to the `kvm` group. The script also installs `agent-stacks-disk`, the part of `disk-image.sh` that runs as root. The hourly update job replaces `agent-stacks-disk` after the kit changes `disk-helper.sh`, as "Updates" describes. Rerun the script when the kit changes the version of Lima or Colima. The update job posts each new Lima or Colima release in Slack, as "Updates" describes.
2. **Create the key in the password manager,** at least 24 random characters. Add the key to the client's GitHub environment as `STACK_DISK_KEY`.
3. **Create the image before the client's Docker VM:** pipe the key into `./circlechat/tenant/disk-image.sh create <client> 200g`. The image grows as the stack grows, up to the size given. On Linux and in WSL, `sudo` asks for the owner's password, so run the command in a terminal.
4. **Create the Docker VM** with `./circlechat/tenant/disk-image.sh vm <client> <CPUs> <memory GiB> <disk GiB>`, such as `vm acme 8 32 100`. The VM mounts `~/tenants/<client>` and no other folder. The VM never becomes the current Docker context, so a plain `docker` command never reaches a client's VM.
5. **Copy `circlechat/deploy/unlock-stack.yml`** to `.github/workflows/unlock-stack.yml` in the private repo of stacks.

After every restart of the computer, the client's image stays closed. Run the "Unlock stack" workflow with the stack and the computer. The workflow passes `STACK_DISK_KEY` to the secrets helper, which opens the image and starts the Docker VM. On Linux and in WSL, the secrets helper opens the LUKS image as root. The owner's account then starts the VM. Docker then starts each container of the stack. The key never touches the disk. Run the same workflow with `lock` to stop the VM and close the image.

**Check the stack's isolation** with `./circlechat/tenant/isolation-check.sh <client>`, while the stack is open. The pass/fail table covers the stack's Docker context and Docker engine, containers, volumes, networks, folders, VM mounts and ports.

**Give each `colima` command the client's Colima folder,** such as `COLIMA_HOME=~/tenants/<client>/colima colima status --profile <client>`. Without `COLIMA_HOME`, Colima looks in the folder for VMs outside any image.

**WSL needs nested virtualization** for the Docker VMs. Windows 11 turns nested virtualization on by default, and `ls /dev/kvm` in WSL shows the device. When `/dev/kvm` is missing, add `nestedVirtualization=true` under `[wsl2]` in `%UserProfile%\.wslconfig`. Set `memory=` in the same file high enough for every stack's VM, plus the services outside the VMs. Then run `wsl --shutdown` in PowerShell and reopen Ubuntu.

Deleting the image and the key makes the client's data unreadable for good.

## Addresses on the tailnet

**The app preview listens on `127.0.0.1` only, and `tailscale serve` gives the preview an HTTPS address on the tailnet.** The full setup, `setup-host.sh` with no option, runs the rule when `site.proxy` is `tailscale`, the default:

```bash
tailscale serve --bg --https=<site.preview_port> http://127.0.0.1:<site.preview_port>
```

- **Only the tailnet reaches the address.** The setup never turns on Tailscale Funnel, which opens a port to the internet.
- **The setup checks the rule** in `tailscale serve status`. The setup stops when the rule is missing, when the rule passes to another port, or when Funnel serves the port. The message names the port and the fix.
- **Without Tailscale on the computer,** the setup prints the command to run after Tailscale is installed.
- **With `site.proxy` set to `other`,** the setup leaves `tailscale serve` alone. Point an HTTPS reverse proxy on the computer at the preview's port.
- **The setup never removes a rule.** `tailscale serve reset` would clear every rule, the gateway's too. CircleChat 1.x's rule stays until a person removes the rule, as in `tailscale serve --https=443 off`.
- **Offboarding a client** turns off the client's rules.

## Secrets in GitHub

**Keep each stack's secrets in GitHub, in the private repo that holds the stacks' site.json files.** GitHub records each change, and more than one person can update a secret. GitHub never shows a secret again after the secret is saved. Keep a copy of each secret in a password manager.

1. **Create one GitHub environment per stack** in the private repo. Name each client stack's environment `client-<name>`. Name the cluster's own stack's environment after `site.stack_name` in the cluster's site.json, or `cluster` when site.json sets no name.
2. **Require an approval** in each environment's settings, under "Required reviewers", where the GitHub plan offers the setting. A workflow then waits for the approval before the workflow reads the environment's secrets. On a plan without required reviewers, a run reads the secrets at once.
3. **Add the stack's secrets to the environment**, with the names in the table below. Add cloud key values with `circlechat/deploy/set-model-keys.sh`, in your own terminal, outside Claude Code.
4. **Copy `circlechat/deploy/deploy-secrets.yml`** to `.github/workflows/deploy-secrets.yml` in the private repo.
5. **Install a GitHub self-hosted runner on each computer**, for the private repo only, under a separate account. Give the runner a label with the computer's name from site.json.
6. **Run `~/recursica-knowledge/circlechat/deploy/install-secrets-helper.sh <runner account>`** on each computer, as the account that owns the stacks. The runner's account can then run one command as root: the helper that writes the secrets. The hourly update job replaces the helper after the kit changes `apply-secrets.sh`, as "Updates" describes.
7. **Run the "Deploy secrets" workflow** with the stack and the computer. The workflow writes each secret to the file that reads the secret. With "restart" on, the workflow then restarts each service that reads a changed value.

**A deploy restarts a service only for a changed value, and never restarts kev-engine.**

- A secret with the same value as the file's line stays as the line is, and the log says `<name> unchanged`.
- With "restart" on, a service restarts only when a value that the service reads changed. jobd reads `JOBD_TOKEN`, `PORTER_GIT_NAME`, `PORTER_GIT_EMAIL`, `PORTER_HOOK_URL` and `PORTER_HOOK_SECRET`. Each service in site.json reads the service's `secret_env`.
- kev-engine never restarts from a deploy, on any computer. When a value kev-engine reads changes, the deploy writes the value. The deploy then posts in the cluster's channel that kev-engine needs a restart by a person. A key rotation is the one exception. See "Rotate the shared tokens".
- A changed value in the control computer's `.env` restarts nothing. Each program reads `.env` at each run. The model gateway reads only its own copy of `KEV_ENGINE_KEY`, `kev-engine.key` in its state folder, which the deploy writes beside `.env`, and the gateway reads the copy at each request.
- The log names the real result for each service: `restarted <service>`, `<service> is not installed`, `<service> failed to restart`, or a restart and then a stop. A failed restart fails the workflow.

**A deploy needs no password-free sudo for the account that owns the stacks.** The runner's account runs the helper as root, and the helper takes each step that needs root itself. The owner's account runs only the Docker steps. After a deploy that changes a control computer's cloud keys, the helper takes two steps:

1. **As root:** the helper writes the gateway's state folder and LiteLLM's master key. On a Mac, the owner owns each one, so Colima's VM can mount the files. The helper refuses a symlinked state folder, and a secrets file with a symlink or a second hard link.
2. **As the owner:** `setup-host.sh --secrets-only` recreates the model gateway in Docker.

The helper finds the stack's folder the way the kit does: `~/recursica-stack`, or `~/circlechat` before a person moves the folder.

The helper starts in `/`, so no command the owner runs prints `getcwd` errors from the runner's work folder. Never add a `NOPASSWD` sudo rule for the owner's account.

The node secrets file is `~/.recursica-node.env`, or `~/tenants/<client>/node.env` for a client or demo stack.

| Secret in GitHub                                | File the helper writes                                                                               | Read by                                                                                          |
| ----------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `MODEL_KEY_<NAME>`, such as `MODEL_KEY_DEFAULT` | `model-keys.env` on the control computer                                                             | The model gateway, and nothing else                                                              |
| `SLACK_BOT_TOKEN`                               | `.env` on the control computer, for each stack                                                       | The stack's scripts, through the cluster's Slack app                                             |
| `KEV_ENGINE_KEY`                                | `.env` on the control computer                                                                       | The copy of `KEV_API_KEY` for a program that calls kev-engine: the model gateway, for a program's `gateway.kev` (`gateway-state/kev-engine.key`) |
| `JOBD_TOKEN`                                    | `.env` on the control computer, and the node secrets file                                            | Each job runner. No program sends a port job today                                               |
| `PORTER_HOOK_URL`, `PORTER_HOOK_SECRET`         | `.env` on the control computer, and the node secrets file                                            | Each job runner, which sends each job's result to the webhook                                    |
| `APP_KEY_<AGENT>`, such as `APP_KEY_ALAN`       | `/var/lib/agent-stacks/github-apps/<environment>/<agent>.pem` on the control computer, owned by root | The GitHub token service, and nothing else. See "GitHub access for agents"                       |
| `KEV_API_KEY`                                   | The node secrets file                                                                                | Kev's model                                                                                      |

The workflow passes every `MODEL_KEY_<NAME>` secret in the environment, with no list to keep. The helper still accepts `ANTHROPIC_API_KEY` as the older name of `MODEL_KEY_DEFAULT`. The helper never writes a cloud key to `.env` or to a node secrets file. The workflow passes every `APP_KEY_<AGENT>` secret in the environment too. The Kev notes push's key is `APP_KEY_KEV_DATA`, written to `kev-data.pem` in the same folder. `CC_CHECK_PASSWORD` belonged to CircleChat 1.x's agent check: the helper writes nothing for the secret, and asks for the secret's removal.

**Limit write access to the private repo.** A person who can edit a workflow can read the secrets of each environment the workflow uses. The required approval in step 2 keeps a changed workflow from reading secrets without an approval.

## Rotate the shared tokens

**Rotate the cluster's three shared tokens with `circlechat/deploy/rotate-tokens.sh`.** The tokens are `CLUSTER_TOKEN`, `JOBD_TOKEN` and `KEV_API_KEY`. Run the command in a terminal on any computer with `gh` and Node:

```sh
circlechat/deploy/rotate-tokens.sh --repo <owner>/<stacks repo> --site <stack folder>/site.json
```

- `--check` runs the checks and changes nothing.
- `--only cluster`, `--only jobd` or `--only kev` rotates only the named token. Repeat `--only` for two tokens.

**The command asks for a one-day GitHub token, and the token never shows on the screen.** Paste the token at the prompt. Make a fine-grained personal access token with these settings:

| Setting           | Value                                                       |
| ----------------- | ----------------------------------------------------------- |
| Resource owner    | The organization that owns the repo of stacks               |
| Expiration        | Custom: the next day                                        |
| Repository access | Only select repositories: the repo of stacks                |
| Actions           | Read and write: the command starts and reads the runs       |
| Environments      | Read and write: the command saves the environment's secrets |
| Metadata          | Read-only, which GitHub always sets                         |

Leave every other permission at "No access". Delete the token after the rotation. The command starts each run on `main`, so the token needs no Contents permission.

**The command changes one token at a time, and deploys each token before the next one.** Each Deploy secrets run writes every secret in the environment. Changing all three tokens at once would switch all three in the first run.

1. **Checks.** The command checks the token's permissions. Next, a check run on each computer with a kev-engine checks that Barb isn't running. The run also checks that the engine is idle. A check run writes nothing. When a check fails, the command stops, shows why, and changes nothing.
2. **`CLUSTER_TOKEN`.** The command saves a new value, then starts every computer's run at once. Each cluster agent restarts.
3. **`JOBD_TOKEN`.** The command saves a new value. The command then starts at once the runs of each computer with jobd and of the control computer. Each jobd restarts.
4. **`KEV_API_KEY` and `KEV_ENGINE_KEY`.** The command saves one new value in both secrets. The command then runs one computer at a time, the best engine first, as `kev.priority` orders the engines. Each run checks again, then restarts kev-engine once, with the new key. The run waits until the engine answers to the new key.

**Each value is 32 random bytes. No value is ever shown, written to a file or put on a command line.** `gh` gets the one-day token in `GH_TOKEN`, and each value on stdin.

**kev-engine stops only for a key rotation, and only while Barb isn't running and the engine handles no request.** The rotation is the only program that restarts kev-engine. A rotation's run passes `kev_rotation` to the secrets helper, with the SHA-256 of the new key as proof. The helper restarts kev-engine only when the proof matches the new key and the key changed. The helper checks two things before writing anything:

- **Barb isn't running.** The control computer's cluster agent reads Barb's state from the RecursicaChat server's database, and reports the state in `/status`. No agent named Barb passes. A Barb with no message queued or in a turn, and no service request open, passes too. A database the agent can't read fails the check.
- **The engine is idle.** The helper reads the engine at the `--host` in the kev-engine service's command in site.json. With no `--host`, or with 0.0.0.0, the helper reads the engine at 127.0.0.1. The helper takes three readings over 10 seconds. No connection is open to the engine's port at any reading. The engine's `GET /v1/models` shows nothing queued, and the same count of answered requests at the first and last readings.

When a check fails, the run writes nothing and fails. The engine keeps running with the key in the engine's file. A connection that opens between the checks and the restart puts the old key back and fails the run.

**After a failed kev-engine run, run the command again with `--only kev` before any other Deploy secrets run.** GitHub then holds the new key, and the failed computer's file holds the old key. Another run would write the new key without a restart. The engine would then hold a different key from the engine's file.

**Each switch stops the token's users for a short time:**

| Token           | What stops, and for how long                                                                                                                                                                                                                                                            |
| --------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `CLUSTER_TOKEN` | Each agent refuses the other's checks and button actions between the two restarts. The gap lasts a few seconds to about a minute. The cluster posts a computer as down only after 3 minutes without an answer. The Slack app reconnects in a few seconds after the Slack app's restart. |
| `JOBD_TOKEN`    | Each jobd stops for a few seconds while jobd restarts. No program sends a port job today, so no caller has to switch.                                                                                                                                                                   |
| `KEV_API_KEY`   | Each engine stops while the engine loads the model again, one engine at a time. Kev moves on to the next engine when one engine doesn't answer or refuses Kev's key. No program calls kev-engine today, so no caller has to switch.                                                     |

**The command knows the callers of kev-engine and jobd.** Barb and Porter called the two services from CircleChat 1.x, which was retired on November 21, 2026. No program calls kev-engine or jobd today. When a new program calls kev-engine or jobd, add the program to the callers list at the top of `rotate-tokens.sh`. Then make the rotation write the program's key.

## GitHub access for agents

**Each agent that pushes to GitHub has a GitHub App of the agent's own,** such as Porter. An app replaces a personal access token. An app's token lasts at most one hour, covers only the agent's repos, and never depends on one person's account.

**The app's private key never leaves root's file on the control computer.** The token service holds the key and gives each agent only a token:

1. **The secrets helper** writes `APP_KEY_<AGENT>` to `/var/lib/agent-stacks/github-apps/<environment>/<agent>.pem`. Root owns the file, with mode 600. The file sits outside the stack's folder, so no agent, container, `.env` file or backup holds the key.
2. **The token service,** `github-tokens` on the control computer, runs as root (`circlechat/github/token-service.mjs`). The service makes an installation token for each agent. Each token covers the agent's repos and permissions in site.json.
3. **A port job on another computer** asks the token service for a token over Tailscale. The service's port is `site.github_token_port`, 4010 when unset. The job shows the job's task key from the gateway. The token covers only the job's repo, which must be one of Porter's repos. The job asks for a new token after 45 minutes.

**Commits use the app's bot identity.** The bot's name is `<app-slug>[bot]`, with the bot's noreply email address. A port job sets the identity in git's settings.

**A stack with no `github_apps` block keeps working, with no push access.** The setup installs no token service, and no agent gets a token. The Kev notes push has an app of the push's own, in `data.github_app` (see "Kev's review data"). With `data.github_app` alone, the token service makes only the push's token.

### Set up each app

1. **Print the manifests:** `node circlechat/github/manifest.mjs`. Each agent's manifest names the app, the permissions and no webhook. Alan's app adds Issues.
2. **Create each app** from the organization's settings, under Developer settings, GitHub Apps. Follow the steps the script prints.
3. **Install each app** on only the agent's repos.
4. **Generate a private key** for each app. Save the key's text as `APP_KEY_<AGENT>` in the stack's GitHub environment. GitHub refuses a secret name that starts with `GITHUB_`, so the name starts with `APP_KEY_`.
5. **Add the `github_apps` block** to site.json. Each agent's entry holds the app ID, the installation ID, the slug, the repos and the permissions:

   ```json
   "github_apps": {
     "alan": { "app_id": 1, "installation_id": 2, "slug": "acme-alan", "repos": ["acme/knowledge"],
               "permissions": { "contents": "write", "pull_requests": "write", "issues": "write" } }
   }
   ```

6. **Deploy the secrets,** then run `setup-host.sh`.

**The personal access tokens are retired.** The helper writes no `ALAN_GITHUB_PAT`, `BETTY_GITHUB_PAT` or `PORTER_GITHUB_PAT`, and removes each one from the node secrets files. Delete the three secrets from each GitHub environment, and revoke each token on GitHub.

**The key check also finds private keys,** such as in a backup.

## Repo settings on GitHub

**Set up each new repo the way the plan repos are set up,** with `circlechat/github/protect-repo.sh`:

```bash
bash circlechat/github/protect-repo.sh acme/recursica-app acme/recursica-docs
```

The script changes only the repos on the command line. For each repo, the script sets these settings:

| Setting                     | What the setting does                                                                                         |
| --------------------------- | ------------------------------------------------------------------------------------------------------------- |
| Ruleset "Protect main"      | No deletion and no force push on the default branch. Each change arrives in a pull request.                   |
| Ruleset "Only admins merge" | Only a repo admin merges a pull request into the default branch. Nobody pushes to the branch.                 |
| Secret scanning             | On, with push protection: GitHub refuses a push that holds a known kind of secret.                            |
| Dependabot                  | Alerts and security updates on.                                                                               |
| Workflow token              | Read-only, and unable to approve a pull request.                                                              |
| Branch deletion             | On: GitHub deletes a pull request's branch after the merge.                                                   |
| Forking                     | Off, for a private repo. A public repo keeps GitHub's setting.                                                |
| `dependabot.yml`            | A pull request that adds the file, for the repo's package systems, when the repo has no `dependabot.yml` yet. |

A ruleset with the same name, in any case, is updated in place, so a second run adds no copy. The `dependabot.yml` checks daily, with a 7-day cooldown and one pull request for each package system, like this repo's file. A second run reuses the open pull request.

**The token.** The script asks for a GitHub token with a one-day expiry, and keeps the token only in `GH_TOKEN`. gh gets an empty settings folder for the run, so gh never reads or saves this computer's gh login. A fine-grained token needs these permissions on each repo:

- Administration, Contents and Pull requests: read and write.
- Secret scanning alerts: read.

Run the script in a separate terminal, and revoke the token after the run.

**The table.** The script reads each setting back from GitHub, and prints one row for each repo and setting. A setting that GitHub refused shows as `FAILED`, and the script ends with an error. For example, secret scanning on a private repo needs GitHub Secret Protection on the organization's plan.

## Outgoing filter

**Each stack's port jobs reach only the sites on the stack's allowlist.** A job runner starts each job on a closed Docker network, `jobs-egress`, with no route out. The only exit is the stack's filter, `cc-jobs-egress`: Squid from Ubuntu's LTS packages.

The allowlist holds GitHub, the npm and Python package registries, and the stack's other computers. The sites in `egress.allow` in site.json join the list. No cloud model provider is ever on the list. Port jobs reach cloud models only through the model gateway. The config check refuses a cloud model provider in `egress.allow`.

**The filter opens five ports and never a model server's port.** The five ports are:

- 80 and 443, for websites
- 7400, for the job runner
- 8009, for Kev's model
- `site.gateway_port`, 4000 by default, for the model gateway

A model server's own API can delete or download a model, such as Ollama's API on port 11434. Only the model gateway reaches a model server. The gateway's LiteLLM container sits on the gateway's Docker network, which has a route out. LiteLLM reaches each model server directly, without the filter. The filter leaves out every port that site.json gives a model server, such as an mlx-lm server's port. The config check refuses a model server on one of the five ports.

**A refused site gets a Slack alert, with no buttons,** because a job cannot wait. To allow a site for good, add the site to `egress.allow` in the stack's site.json through a pull request. Then rerun `setup-node.sh` on each computer that runs jobs. Set `"egress": { "enabled": false }` only for a stack with no port jobs.

**The filter's image, `recursica/egress:<hash>`, is built once for each version of `circlechat/egress`.** The tag carries a hash of the folder's files, so `setup-host.sh` and `setup-node.sh` use the same image. After a build, each script recreates each filter container that runs another image, with the container's mounts and networks.

CircleChat 1.x's agents had a filter of their own, `cc-egress`, with "Allow once" buttons in Slack. That filter and the buttons are gone. A button left in an old Slack post answers "unknown action".

## Privacy rules for agents

**The model gateway removes personal information before a request reaches a cloud model.** Presidio, Microsoft's open-source masking service, finds names, email addresses, phone numbers and similar details. The gateway replaces each one before the request leaves. Presidio's analyzer and anonymizer run as `cc-presidio-analyzer` and `cc-presidio-anonymizer`, on the gateway's network. Masking is on by default for a client stack with cloud models. Set `"privacy": { "mask_pii": false }` in site.json only when the client asks. Masking is a separate setting for each stack: with masking on or off, every request passes the gateway.

**A client stack gets no GitHub App for Alan while the stack uses the public knowledge repo.** The config check refuses `github_apps.alan` on such a stack.

## Cloud models and the model gateway

**Every agent and every port job sends each model request to the stack's model gateway.** The cluster's own models answer by default. A cloud model answers only when the task's "Cloud models" setting allows a cloud model. No cloud key leaves the gateway.

**No task source runs today, so the cluster's models answer every request.** CircleChat 1.x was the gateway's task source, with each task's "Cloud models" setting. With 1.x gone, each request is outside a task, and the gateway calls no cloud model. The cloud keys stay in place for a later task source (`createGateway`'s `db` in `gateway/router.mjs`).

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

**Keep each key's value in the stack's GitHub environment,** as `MODEL_KEY_<NAME>`: `MODEL_KEY_DEFAULT` for `default`, and `MODEL_KEY_ACME_GROK` for `acme-grok`. A Bedrock key's value is `<access key id>:<secret access key>`. The secrets helper writes each value to `model-keys.env` on the control computer. On Linux, root owns that file. Only the gateway reads the file. The gateway reads each key from the file when the gateway starts, never from an environment variable. `docker inspect` then shows no key. The job containers, the `.env` files and the backups hold no cloud key. Keep each provider's spend limit in the provider's console.

**On a Mac, the stack's owner can read the cloud keys, and the agents still cannot.** Docker on a Mac runs in a VM, such as Colima's. The VM reads the Mac's files as the stack's owner, never as root. The stack's owner therefore owns `model-keys.env` and the `gateway-state` folder, with the same modes as on Linux. Every program that runs as the owner can read the keys. Only the gateway's LiteLLM container mounts `model-keys.env`, so no job container can read the file. The owner's account controls Docker on Linux too, so root ownership never kept the keys from the owner.

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

**An agent never names a model.** It asks for a route by its role, and site.json maps each route to models. The roles are `coder`, `judge`, `general`, `fast`, `reasoning` and `vision`. A route lists the cluster's local models, so a request stays local unless the task's setting and the stack allow the cloud. The gateway sends a name that is not one of the agent's routes to the agent's first route.

**Porter's port jobs ask for the `coder` route.** A stack with `porter` needs a `coder` route, and when `agents.porter.routes` is set, the list must include `coder`. The config check refuses either one missing. A local-only stack runs Porter on its local `coder` model.

**Each agent has the agent's own gateway key.** `rc-sync.sh` makes the key for each RecursicaChat 2.0 agent, as "Agents on RecursicaChat 2.0" describes. The gateway keeps only a hash of each key. A gateway key reaches only the agent's routes, and works only from the stack's own containers and computers. No agent holds LiteLLM's master key. To revoke one agent's key, run `sudo node circlechat/gateway/keys.mjs revoke <CC_DIR>/gateway-state <handle>`. The other agents keep working. The next run of `rc-sync.sh` gives the agent a new key.

### Which model answers

**The task's setting decides, for each request.** The gateway reads the setting from the task source, and keeps a copy for at most one minute. The task source is the RecursicaChat 2.0 server, whose tasks have a "Model use" setting ("Model use on RecursicaChat 2.0" below). Without a RecursicaChat 2.0 server, no task source runs, and every request uses the cluster only.

| Setting            | Model use on RecursicaChat 2.0             | Who answers                                                                                                                           |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- |
| Cluster only       | Local only, the default                    | A cluster model, every time                                                                                                           |
| Cloud after a wait | Local, then cloud if significantly delayed | A cluster model, unless the cluster gives the task no answer for the stall, 15 minutes by default. Then the agent's cloud key answers |
| Cloud now          | Cloud from the start                       | The agent's cloud key, from the first request, so the work runs beside the cluster's other work                                       |

- **The stack's permission comes first.** With no permission for cloud models (a client or demo stack without `site.cloud_models.allowed`), with the agent's cloud switch off, or with no cloud key for the agent, every request uses the cluster, whatever the task's setting says.
- **A request waits for the cluster as long as the cluster needs.** A busy or failing cluster is never a reason to call a cloud model. The gateway tries the cluster again until the cluster answers.
- **The task's clock starts at the gateway's first request for the task.** The stall counts from the first request, and ends at the cluster's first answer. There is no time to finish: once the cluster has answered, a long task stays on the cluster. A changed setting starts the clock again, so a task turned from Cloud from the start to Local, then cloud tries the cluster again for a fresh stall.
- **An unknown setting, or a task source that does not answer, means the cluster only.**
- **A request outside a task uses the cluster only,** such as a chat mention or a heartbeat.
- **The gateway finds the task from the agent's running turn,** which the task source records. A port job's gateway key names the job's task.
- **When the gateway cannot tell a request's task, the request uses the cluster only.** An agent can have more than one running turn, or a turn outside a task. Every move to the cloud shows on one task, so a request the gateway cannot place in one task never goes to the cloud, whatever the settings say. The spend log gives the reason "the request could not be placed in one task". Such a request starts no task's clock.
- **A stack with no cluster model fails a Cluster only task.** The gateway posts a comment on the task that says why, once per task.

### What reaches the gateway

**The gateway passes on model requests only:** `POST /v1/chat/completions`, `/v1/completions` and `/v1/messages`. Every other path gets a 404, even with a valid gateway key. LiteLLM's own endpoints, such as key and model management, stay out of reach.

**The gateway listens on two ports.**

- Port 4000 inside the stack's Docker networks: the port jobs on the control computer, through `jobs-egress`.
- `site.gateway_port`, 4000 unless site.json sets another port: the port for port jobs on other computers. `setup-host.sh` opens this port on the control computer's Tailscale address only. The port takes only a task key, for every request, `/health` included.

With the outgoing filter off, the control computer's own port jobs use `site.gateway_port` on `127.0.0.1`.

**`site.gateway_local_port` adds the agents' port on `127.0.0.1`, for a RecursicaChat 2.0 server on the control computer.** RecursicaChat 2.0 runs outside Docker and calls each agent's model through the server's model proxy, so the server, not the agent's container, reaches the gateway. With the setting, `setup-host.sh` publishes the router's port 4000 on `127.0.0.1:<site.gateway_local_port>`, with the outgoing filter on too, and never on another address.

- **The port takes an agent's gateway key,** as port 4000 does inside Docker. The key reaches only the agent's routes in site.json, with the agent's cloud switch. `rc-sync.sh` gives the agent's key to RecursicaChat as a provider's key.
- **The router's address check admits the server.** A connection to a port Docker publishes reaches the router from the gateway address of the router's own Docker network, in Colima's VM or on Linux. That address is in the network's range, which the router allows (`allowedSources` in `gateway/router.mjs`). Every program on the computer can reach `127.0.0.1`, so the key, not the address, decides.
- **Only the cluster's own stack sets the port.** The config check refuses the setting on a client or demo stack, and refuses a port another setting uses: `site.port`, `site.preview_port`, `site.gateway_port`, `site.gateway_port + 1`, `site.github_token_port`, the filter's ports, and each computer's model servers, job runner and Kev-engine. A new client or demo stack's ports avoid the setting's port.
- **`setup-host.sh` stops when a check of the port fails.** The port must answer `/health` on `127.0.0.1`, answer 401 to a model request with no gateway key, and answer on no other address of the computer, Tailscale's included.
- **Leave the setting out** for a stack with no RecursicaChat 2.0 server. With the filter on, the agents' port then stays inside Docker.

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

**The gateway's Docker network is `gateway-models`,** or `gateway-models-<client>` for a client or demo stack. LiteLLM, the router and the masking services join the network, and nothing else. The router starts on the network and publishes its ports there. A computer set up while CircleChat 1.x ran keeps 1.x's networks, `circlechat_default` and `circlechat_models`, until a person runs `migrate-off-1x.sh` ("Moving a computer off CircleChat 1.x's names"). Every setup uses those networks while they exist, and moves nothing. The gateway reads no database.

### The spend log

**The gateway writes one line per request to `<CC_DIR>/gateway-logs/spend.jsonl`.** Each line holds these fields:

- the time, the task and the agent
- the key's name, or `cluster` for a cluster model
- the route, and the server and model that answered: `server` is `<node>/<server id>` for a cluster model, or the provider for a cloud model
- `backend`: the model's name in `site.json`, such as `machine-2/mlx/large-mlx`
- `asked`: the name a request gave when it named no route, such as a model's name, cut to 80 characters. The request went to the agent's first route. An agent asks for a route by its role and never names a model, so `asked` shows an agent or a tool that still does.
- the status and the token counts
- `switch`: `{ "n": <n>, "reason": "stalled" | "cloud_from_start" }` on the request that moved its task to the cloud, the task's n-th move
- where the request's time went, in milliseconds:
  - `gateway_wait_ms`: from the request's arrival to the send of the try that answered it. It holds the gateway's retries and back-offs while the cluster is busy or down.
  - `upstream_ms`: from that send to the answer's end, the model server's wait and work together.
  - `server_wait_ms`, for a cluster model: the request's estimated wait for a free slot at the model server, part of `upstream_ms`. `ahead` is the place in that queue, when the request waited.
  - `tries`: the tries the gateway sent, the cloud's included.

The log holds no prompt and no answer.

**The model server's wait is an estimate.** LiteLLM's answer drops Ollama's own timings, so the gateway counts the requests it sends to each cluster model. A model has the slots of its server's `parallel` in site.json, and an mlx-lm server has one. A request sent while every slot is busy waits until the oldest request ahead of it ends. A request to a route counts on the route's first cluster model. Requests that reach the server some other way, such as a bench, don't count, so the estimate is a floor. A server with no `parallel` in site.json uses its own default, which the gateway can't see, so its requests log no `server_wait_ms`.

### The key check

**The test restores run the key check, `circlechat/gateway/key-check.mjs`.** The check fails when a cloud key is in a backup. The check finds a key by the exact values in `model-keys.env` and by the shapes of the providers' keys. The report names each place and the kind of key, never the key. Remove each key the check finds, and rotate the key in the provider's console.

**A private key counts only with its body.** The check finds a private key in PEM form, such as a GitHub App's, by a `-----BEGIN … PRIVATE KEY-----` line followed by at least 40 base64 characters of key body. The body's lines may be split by real line breaks or by `\n`, as in an `.env` file, JSON or a database dump. A key with no END line, such as one cut off in a log, still counts. The BEGIN line alone does not: code and help text name it too. npm's help for its `key` setting shows `-----BEGIN PRIVATE KEY-----\nXXXX\nXXXX\n-----END PRIVATE KEY-----`, and Node's compile cache holds that text after npm runs. The compile cache stays in the scan, so a cache built from code that holds a real key is still caught. A GitHub App's key is also found by the exact first line of its body, with or without the PEM lines.

## Backups

**Two nightly backups keep the stack's data, each encrypted on the computer before the backup leaves the computer.** "The RecursicaChat 2.0 server's service, backup and restore test" describes the server's own backup, and "The stack's own files: site.json and the workspace" describes the backup of `site.json` and the workspace. restic encrypts each backup, and rclone uploads each backup to the backup remote. Both tools are open source.

1. **Install restic and rclone** on the stack's control computer: `sudo apt install restic rclone` on Linux, or `brew install restic rclone` on a Mac.
2. **Create a Google Drive folder for the backups,** such as `agent-backups`.
3. **Set up an rclone remote** for the folder with `rclone config`, as the account that owns the stacks. Pick Google Drive, the `drive.file` scope, and the folder's ID as the root folder. With the `drive.file` scope, rclone reaches only the files rclone creates.
4. **Add a `backup` block to site.json:**

   ```json
   "backup": { "remote": "gdrive-backups:agent-backups" }
   ```

   `backup.time` set the time of CircleChat 1.x's backup. Nothing reads `backup.time` now.

On a Mac, launchd gives a job no `HOME`. Each job that runs as root, such as a backup and a test restore, gets `HOME=/var/root`, root's home folder. restic keeps the restic cache there.

**CircleChat 1.x's backup is gone.** The `backup` and `restore-test` jobs read 1.x's database, file store and agent homes. A held step in `setup-host.sh` removes both jobs, as "A kit that follows main" describes. 1.x's last backup stays in the backup remote until someone deletes the backup.

## Security services

`~/recursica-knowledge/circlechat/cluster/install-cluster.sh <computer>` installs the security services on one computer. Run the script on each computer, after `setup-host.sh` or `setup-node.sh`. The script installs five parts:

- **Firewall rules:** each new incoming connection is refused, except from the computer itself, Tailscale, Docker's internal networks and allowed sources. The rules load at every start-up. On macOS the guard's rules sit in the `agentguard` anchor, and they apply only while the main pf rules use that anchor. A macOS update replaces `/etc/pf.conf` with Apple's own, which doesn't use it, so each start-up builds the main rules again from `/etc/pf.conf` with `firewall/pf-main.sh`. Each minute the guard checks that the main rules use the anchor, and posts one loud alert when they don't. On Linux, the rules delete the `agentguard` table and make the table again, which empties the blocked and allowed sets. So `install-cluster.sh` and the start-up job load the rules with `firewall/nft-load.sh`, which adds each set's addresses back in the same `nft -f`, and a rerun unblocks nothing. The start-up job runs a root-owned copy in `/var/lib/agent-cluster`, made when a person applies the firewall rules, so a kit update changes it only then. On Windows, run `circlechat/cluster/windows/install-windows-guard.ps1` once in an Administrator PowerShell, after Tailscale is up.
- **Decoys:** OpenCanary runs a fake SSH login, FTP server and web page on ports 2222, 2121 and 8088. Nobody legitimate touches a decoy, so any touch starts a lockdown. The fake SSH login's host keys live in `/var/lib/opencanary`, a folder only root reads, each key mode 600. `install-cluster.sh` moves keys an earlier install left in `/var/tmp` (`cluster/canary-keys.sh`), so the decoy keeps the decoy's fingerprint.
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
| Linux    | `tailscale0`                                         | `iifname != "tailscale0" ip saddr 100.64.0.0/10 drop`, before the Tailscale accepts                  |

macOS has no interface groups, and Tailscale takes the first free `utun` number, so the rule lists 32 `utun` numbers. On Windows, Windows accepts a packet for a Tailscale address only on the Tailscale adapter. Rerun `install-windows-guard.ps1` after the computer's Tailscale address changes. On Linux, the nftables rules refuse a Tailscale address on every interface but `tailscale0`, in the input chain and in the forward chain that Docker's published ports use, then pass the address. In WSL the nftables rules check only the address: Tailscale runs on Windows, and its packets reach WSL on a mirrored interface, never on `tailscale0`.

**In WSL with mirrored networking, loopback traffic arrives on `loopback0`, not on `lo`.** WSL sends `127.0.0.1` and `::1` through `loopback0`, by way of Windows' own loopback. Windows' loopback traffic, such as `tailscale serve`, arrives on `loopback0` too. So the nftables rules accept `loopback0` right after `lo`, and only from `127.0.0.0/8` and `::1`. Every kit service on `127.0.0.1` needs the rule in WSL, such as RustDesk's console, the job runner and the cluster agent. CircleChat and the app preview behind `tailscale serve` need the rule too. The lockdown rules let the same loopback traffic leave on `loopback0`. Without the rule, a connection to `127.0.0.1` in WSL times out, and `tailscale serve` answers 502.

### Remote access

**Reach each computer only through Tailscale, with RustDesk.** RustDesk is an open-source remote desktop for Linux, macOS and Windows. A cluster with the RustDesk server below connects every computer through that server. Until then, set each computer's RustDesk this way:

- Turn on "Direct IP access", so connections go straight from computer to computer over Tailscale.
- Set the ID server to `127.0.0.1`, so RustDesk never contacts RustDesk's public servers.
- Set a permanent password, and turn on RustDesk's two-factor sign-in.

The firewall rules let RustDesk's port open only to Tailscale addresses. A RustDesk connection from the office network starts a lockdown.

### The RustDesk server

**One computer can run RustDesk Server Pro for the whole cluster, reachable only over Tailscale.** People then sign in to RustDesk with Google, each with their own Google two-factor, and every session runs through the server's relay. The server is Pro's two programs, `hbbs` (the ID server and the web console) and `hbbr` (the relay), in Docker, from one image pinned by digest. Both keep the server's key in one volume. `hbbs` makes the key on the first start. `hbbr` starts only once the key exists. Without the key, `hbbr` runs as a public relay that any client may use. `setup-rustdesk.sh` stops the server when `hbbr`'s log says "PUBLIC RELAY MODE". `hbbs` names the relay, `<Tailscale address>:21117`, with `-r`, so each client gets the relay's address from `hbbs`.

**`hbbs` and `hbbr` run in the host's network, because RustDesk's license needs host networking.** On Docker's own network, each new container counts as a new machine. The kit recreates both containers at each new image or Compose change. The license then failed each time, and `hbbr`'s log said "License already in use by another machine". In the host's network, each RustDesk port listens on every address of the computer. The three firewalls below are the guard on each port.

| Port            | What it is                   | Who reaches the port                                                     |
| --------------- | ---------------------------- | ------------------------------------------------------------------------ |
| 21114/tcp       | The web console and its API  | Tailscale and loopback. `tailscale serve` gives the console HTTPS on 443 |
| 21115/tcp       | The NAT type test            | Tailscale and loopback                                                   |
| 21116/tcp + udp | ID registration and requests | Tailscale and loopback                                                   |
| 21117/tcp       | The relay                    | Tailscale and loopback                                                   |
| 21118, 21119    | RustDesk's web client        | Tailscale and loopback. Nobody once `remote_access.direct_ip` is false   |

**Run the server on Linux, or on Windows in WSL with mirrored networking.** On a Mac, Docker runs in Colima's VM. The VM's network holds no Tailscale address of the Mac, so the host's network in Colima is the wrong network. The config check refuses a `rustdesk` block on a Mac. In WSL with mirrored networking, WSL shares Windows' addresses, Tailscale's included.

**Three firewalls refuse TCP 21114 to 21119 and UDP 21116 from every source except Tailscale and loopback:**

- **nftables**, on Linux and in WSL: the input chain and the forward chain refuse the ports. No agent container and no allowed source reaches the server.
- **Windows Firewall and the Hyper-V firewall**, on Windows: `install-windows-guard.ps1 -RustDeskServer` adds block rules for TCP 21114 to 21119 and UDP 21116. The rules block every address outside Tailscale and loopback. A block rule wins over every allow rule. Loopback stays open, because Tailscale on Windows reaches the console in WSL at `127.0.0.1`.

**The rules cover the web client's ports, 21118 and 21119, too.** In the host's network, `hbbs` and `hbbr` open both ports on every address.

**The server's computer keeps 21118 and 21119 free for `hbbs` and `hbbr`.** `hbbs` opens its port plus 2, 21118, and `hbbr` opens its port plus 2, 21119. Neither program can move the port or turn the port off. Each program stops when the port is taken. A RustDesk client's direct IP access uses 21118 by default. WSL in mirrored networking shares each port with Windows. So the server and the computer's own client can't both use 21118. `setup-rustdesk.sh` refuses to start the server on any of these:

- A program other than `hbbs` or `hbbr` listens on 21118 or 21119, in Linux or in Windows.
- The computer's RustDesk client has direct IP access on 21118 or 21119. The script reads the client's `RustDesk2.toml`: the signed-in user's and the RustDesk service's.
- WSL can't read Windows' listeners on the ports.

A computer with direct IP access can still run the server. Set the client's `direct-access-port` to another port, such as 21120. Or turn off direct IP access on that client.

**`setup-rustdesk.sh` starts the server only when each of the three firewalls holds the RustDesk rule.** The script reads each rule and checks the ports, the action and that the rule is on. nftables may print a set's members in another order, so the script compares each set by the set's members. A firewall whose rules can't be read also stops the setup, with a message that names the firewall. Reading the Windows Firewall and Hyper-V firewall rules from WSL needs no admin rights.

**Tailscale's access rules decide which tailnet devices reach the ports.** `circlechat/rustdesk/tailnet-policy.example.hujson` holds the rules to add to the tailnet's policy file. The kit never changes the policy file.

**Set it up in this order.** Each step's command runs on the server's computer, except the policy change.

1. In site.json, give the computer a `rustdesk` block, and set the computer's `address` to its Tailscale IPv4 address:

   ```json
   "rustdesk": {
     "image": "docker.io/rustdesk/rustdesk-server-pro@sha256:<digest>",
     "console_host": "machine-2.example.ts.net",
     "backup_time": "03:30"
   }
   ```

   `image` must name the digest: the config check refuses a tag alone. Read the digest of the release to run from Docker Hub. A new release is a site.json change, after the release has been out for 7 days. `backup_time` is the nightly backup's time, 03:30 when unset. site.json also needs `backup.remote`.

2. Add `RUSTDESK_RESTIC_PASSWORD` to the cluster's GitHub environment: a new random secret, used only for this backup. Run the "Deploy secrets" workflow for the computer. The secrets helper writes the secret to the computer's `~/.recursica-node.env` only. The computer then holds no key to the stack's other backups.
3. On Windows, in an Administrator PowerShell: `install-windows-guard.ps1 -RustDeskServer`. To see the rules first, with no change, run the same command with `-DryRun`. Then run `install-wsl-boot.ps1 -RustDeskServer` the same way, as "WSL at boot on Windows" describes, and restart WSL at a planned time.
4. `install-cluster.sh <computer>`, for the nftables rules.
5. `setup-node.sh <computer>`. The setup runs `circlechat/rustdesk/setup-rustdesk.sh`, which stops before the server starts on any of these:

   - WSL networking is not mirrored.
   - A firewall lacks the RustDesk rule.
   - The web client's ports, 21118 and 21119, would break the computer's direct IP access.
   - The node's address is not the computer's Tailscale address.
   - The backup's secret is missing.

   The script then starts the server, checks that each port listens, runs `tailscale serve --bg --https=443 http://127.0.0.1:21114`, and checks that Funnel is off. The script checks that the console answers on `127.0.0.1:21114`, and only then installs the nightly backup and reports success. On Windows, `tailscale serve` may need an Administrator PowerShell; the setup prints the command.

6. Add the access rules from `tailnet-policy.example.hujson` to the tailnet's policy file.
7. Run the first backup, and check that it holds the key: `sudo systemctl start rustdesk-backup.service`.
8. Open the console at `https://<console_host>` from an admin's device. Change the default admin password, and turn on two-factor sign-in for that account. Keep it as the one local account, for when Google sign-in fails.
9. Enter the license in the console's settings. A Pro license is bound to the machine that activates the license.
10. Add Google as the OIDC provider in the console, with a Google OAuth client of type Internal. Use the redirect address the console shows. Internal limits sign-in to the Google Workspace's own accounts. Enforce 2-Step Verification in the Workspace's admin console, so every account has two-factor.
11. Point every RustDesk client at the server. Use the console's strategy settings or a custom client: the ID server and the relay at the computer's Tailscale address, the API server at `https://<console_host>`, and the key from the console. Lock these settings on each client: "Direct IP access" off (`direct-server`), always relay (`force-always-relay`), and no changes on the device.
12. Once every computer uses the server, set `"remote_access": { "direct_ip": false }` in site.json. Run `install-cluster.sh` on each computer, and `install-windows-guard.ps1 -BlockRustDeskDirect` on each Windows computer. Each firewall then refuses RustDesk's direct-address ports, 21118 and 21119, from everywhere.

**The backup runs each night as root, from `circlechat/rustdesk/backup-rustdesk.sh`.** The containers pause for the copy, so the database is copied whole, and each connection stays open. restic encrypts the copy with `RUSTDESK_RESTIC_PASSWORD` and sends it to `<backup.remote>/<stack>-rustdesk`. The backup checks that the copy holds the server's key, `id_ed25519`, and posts in Slack when any step fails. A lost key means every client must be set up again.

**Each run backs up the same file, `/var/lib/rustdesk-backup/rustdesk.tgz`.** restic groups snapshots by computer and path. One fixed path puts every run in one group, and each new snapshot builds on the snapshot before. The run deletes the file afterward, because the file holds the server's key. After each backup, restic keeps one snapshot for each of the last 7 days, 4 weeks and 6 months. restic removes every other snapshot. The keep policy groups snapshots by computer and tag, not by path. The policy then also covers the snapshots from before the fixed path. Each of those snapshots came from a new temp folder and sat in a separate group. So the policy never removed an old snapshot.

**The server's own computer needs `hostAddressLoopback` in WSL.** The computer's own RustDesk client runs on Windows, and reaches the server at the computer's Tailscale address. In mirrored networking, WSL holds the same address. So WSL keeps each reply from the server, and the reply never reaches Windows. The client shows online in the console, and a connection to the client by ID fails with "Failed to connect via rendezvous server". `hostAddressLoopback=true` sends that traffic through Windows and back, the way mirrored networking already sends `127.0.0.1`. The three firewalls stay unchanged. A second address for the client, such as `127.0.0.1`, can't work. A client gives a controller the client's own relay address, and the controller dials that address.

**Move the license once to the server in the host's network.** A server that ran on Docker's own network holds the license for an old container. In RustDesk's license portal, move the license to the new server, then enter the license in the console again. After the move, a new container in the host's network keeps the license.

**A restore test proves the backup each month.** On the 1st, one hour after the backup, root runs `circlechat/rustdesk/restore-test-rustdesk.sh`. The test restores the newest snapshot into a temp folder only root opens. The test then checks four facts:

- The archive holds the server's key pair, `id_ed25519` and `id_ed25519.pub`, and the public key belongs to the private key.
- The archive holds the server's database, `db.sqlite3` or `db_v2.sqlite3`, as a SQLite file.
- The restored public key matches the public key of the running server, `rustdesk-hbbs`. The test compares the fingerprints of the two keys.
- The newest snapshot is under 2 days old.

The test posts pass or fail in the cluster's Slack channel, with the date of the newest snapshot. A pass also gives the fingerprint of the public key. The test never prints a key, and deletes the restored files at the end, after a failure too. The test only reads the backup repository. To run the test by hand:

```sh
sudo systemctl start rustdesk-restore-test.service && sudo journalctl -u rustdesk-restore-test -n 20
```

**To restore,** restore the newest snapshot with that password, and unpack `rustdesk.tgz` into the `rustdesk_data` volume before the server starts. In the restore folder, the archive sits at `var/lib/rustdesk-backup/rustdesk.tgz`.

**Tagging a device changes who owns it.** A device with a tag belongs to the tag, not to a person, so rules that name a person or a group no longer apply to it. Tag only the computers the cluster owns. A person's own laptop or phone stays untagged; a rule that names the person's group reaches it instead. A computer that already has a tag, such as `tag:cluster`, keeps every tag it has: add the new tag next to the old one in the admin console. `tailscale up --advertise-tags` with only the new tag removes the old tag, and every rule for the old tag with it.

### Lockdown

An incoming connection that no rule allows, or a touch on a decoy, starts a lockdown. A connection is incoming when a listener holds the computer's side of it: the same port, on the same address or on every address. The port alone is not enough. An outgoing connection's temporary port can equal the port a listener holds on another address, such as Tailscale's listener on the tailnet address. The lockdown runs these steps:

1. The computer seals first: each client stack's disk image closes, and each secrets file becomes unreadable.
2. For 10 minutes, tcpdump records the source's packets. A snapshot records the connections, programs, signed-in users and sign-in logs, and a lookup records the source's network owner and country.
3. Slack gets the alert, with five buttons: "Cut off now", "Keep watching 30 min", "Shut down", "Release lockdown" and "Allow this source".
4. After 10 minutes, the computer cuts off every connection except Tailscale and HTTPS on port 443. The guard loads the lockdown rules, blocks each source, and then reads the firewall back. When the lockdown rules or a blocked source aren't in place, the cut-off counts as failed, never as done. Slack gets one loud alert with the reason and three buttons: "Cut off now", "Shut down" and "Release lockdown". The computer stays sealed, and the guard tries again each minute.
5. Each evidence file gets a SHA-256 fingerprint and a UTC time in `manifest.json`. The evidence is encrypted to `security.evidence_recipient`, an age public key, and uploaded to the backups remote. The private key stays in the password manager.

"Release lockdown" and "Allow this source" need a 6-digit authenticator code. Three wrong codes lock both buttons for an hour. The guard records only traffic to the cluster's own computers, and never acts against the source.

### The Slack app

1. Create a Slack app with Socket Mode on. Give the app-level token the `connections:write` scope. Give the bot the `chat:write` and `chat:write.customize` scopes. `chat:write.customize` lets each message name the computer or stack that sent it. CircleChat 1.x's notifier needed `im:write` too, and nothing needs the scope now. Invite the bot to the cluster's channel, `SLACK_CHANNEL_ID`, and to each client's channel.
2. Enroll each approver: `node circlechat/cluster/enroll.mjs <name>`, then scan the QR code with an authenticator app.
3. Add the cluster's secrets to the GitHub environment of the cluster's own stack, then deploy them to each computer:
   - `SLACK_APP_TOKEN`, `SLACK_BOT_TOKEN` and `SLACK_CHANNEL_ID`, from the Slack app.
   - `CLUSTER_TOKEN`, a new random value.
   - `APPROVERS`: Slack user IDs and names, such as `U012=person_a,U034=person_b`.
   - Each approver's `TOTP_SECRET_<NAME>`, from `enroll.mjs`.
4. Set `site.slack_channel_id` in each stack's site.json, so uptime alerts reach the stack's own channel.

**Only the control computer gets the Slack app's token and the approvers' secrets.** The deploy writes the cluster's secrets to `/etc/agent-cluster.env` on each computer:

| Secret                                                    | Computers                                                                                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID`, `CLUSTER_TOKEN`    | Every computer. The cluster agent, the update job and the RustDesk backup read the secrets.                        |
| `SLACK_APP_TOKEN`, `APPROVERS`, each `TOTP_SECRET_<NAME>` | The control computer only. Only the Slack app reads the secrets, and only the control computer runs the Slack app. |

An approver's TOTP secret makes valid approval codes, so the secret stays off every helper. A deploy to a helper removes each control-only line from the helper's file. The deploy's log names each removed line.

**Each Slack message names the computer or the stack that sent it.** The sender's name replaces the app's name on the message:

| Sender                                                                           | Name on the message                                                               | Icon                        |
| -------------------------------------------------------------------------------- | --------------------------------------------------------------------------------- | --------------------------- |
| The cluster agent, the Slack app's replies, the update job and the uptime checks | The computer's name in site.json, such as `machine-1`                             | The computer's `slack_icon` |
| The backups, the upgrade job and the image refresh, about a whole stack          | The stack's name: `site.tenant`, or `site.stack_name` for the cluster's own stack | The app's icon              |

`slack_icon` is an optional emoji for each computer in site.json's `nodes`, such as `:desktop_computer:`. Rerun `install-cluster.sh` on the computer after a change to `slack_icon`.

Slack shows the name and the icon only when the bot has the `chat:write.customize` scope. Without the scope, Slack ignores both and posts as the app, so nothing breaks. Add the scope in the Slack app's settings, under "OAuth & Permissions", then reinstall the app to the workspace.

### Updates

One job, `cluster-updater`, runs each hour on each computer, with one rule:

- **Recursica's own software**, on a stack with `upgrade.auto`:
  - Each new kit release, a release of the knowledge repo: only after an approver approves the release in Slack. "Kit releases" describes the approval. A new major version asks in Slack first.
  - With `updates.follow` set to `"main"`, the kit checkout on every computer follows main instead. "A kit that follows main" describes the steps.
- **Everything else** (operating system packages and container images): after 7 days. A fix for a flaw on CISA's Known Exploited Vulnerabilities list goes in at once.
- **An update that needs a reboot** asks for a time in Slack: "4 a.m.", "Tonight", "Pick a time" or "Skip".
- **An update that interrupts work** waits, after its 7 days, until RecursicaChat 2.0 on the computer is quiet. "Updates that interrupt work" describes the wait.

#### Updates that interrupt work

**Four Homebrew updates and every image pin that moves wait until RecursicaChat 2.0 on the computer is quiet.** Each one interrupts work:

| Update                  | What it interrupts                                               |
| ----------------------- | ---------------------------------------------------------------- |
| `tailscale`             | The update job reinstalls `tailscaled`, which restarts Tailscale |
| `ollama`                | The kit's Ollama service restarts, and the model reloads         |
| `colima`, `lima`        | The tools that run the Docker VMs change                         |
| An image pin that moves | `setup-host.sh --upgrade` recreates the gateway, with held steps |

**Quiet means no agent work.** An open web app and a person online don't count. The update job reads the server's database as root, read-only, each hour (`cluster/quiet.mjs`). Agent work is either:

- **An agent turn, running or queued:** a message waits for an agent or sits in a running turn.
- **A service's run:** a service account drives an agent, and the service has a request open. An open request is pending or taken, and not yet done or declined. The service closes the request when the service's run ends.

A request unchanged for more than a day counts as abandoned, so a service that crashed can't hold every update for good. A server too old to have service requests has no service runs. A database that can't be read counts as busy. A computer with no `recursicachat` block in site.json runs no server, and is always quiet.

**The cluster's channel, `SLACK_CHANNEL_ID`, hears about each update that waits**, with the reason, such as one agent message in a turn. The post goes out once, then every 24 hours while the update waits. The update installs at the first quiet hour, and the usual "Installed" post follows. Every other Homebrew update installs as before. The 7-day wait and the rule for CISA's list come first. A waiting image refresh runs again each hour, not each day.

#### Kit releases

**A new kit release installs only after an approver approves the release in Slack.** The approval takes an approver and a 6-digit authenticator code.

1. Each hour, the update job on the cluster's control computer looks for a new release with the kit's first number.
2. The job posts the release once in the cluster's channel, `SLACK_CHANNEL_ID`. The post holds the version, a link to the release notes and an "Install" button.
3. An approver presses "Install" and enters an authenticator code. The Slack app sends the approval to the cluster agent on every computer in the cluster.
4. At the next hourly check, each computer installs the approved release on each stack with `upgrade.auto`.

Until an approval, every computer holds the release, and nothing installs. The job posts a reminder once a day. A newer release with no approval gets a post of its own. An approved older release still installs. The Slack app's reply names each computer that recorded the approval. A computer that did not answer missed the approval. Press "Install" again once the computer answers.

**A new major version still asks first.** The post names the version, with "Upgrade now" and "Skip this version". "Upgrade now" needs an authenticator code too, and counts as the release's approval on that computer.

**Each computer logs each approval.** Each line of `/var/lib/agent-cluster/release-approvals.log` names the release, the approver, the time and the computer. Each press of "Install" or "Upgrade now" adds a line. `release-approvals.json` in the same folder keeps the first approval of each release. Root owns both files, with mode 600.

**A run of `kit/upgrade.mjs <tag>` by hand, in a terminal, installs the release without an approval.** A run with no tag installs only an approved release.

Every other update keeps the rules above. Such updates include images, Ollama and the operating system.

#### A kit that follows main

**`updates.follow` in the cluster's own site.json picks how the kit checkout moves.** The setting has two values:

| `updates.follow`          | How the kit checkout moves                                                          |
| ------------------------- | ----------------------------------------------------------------------------------- |
| `"releases"`, the default | Only to an approved kit release, as "Kit releases" describes                        |
| `"main"`                  | To each new commit on main, on every computer, the control computer and each helper |

A helper computer hosts no stack, so with `"releases"` the update job never moves a helper's kit checkout. With `"main"`, each helper follows main too. Copy the changed site.json to `~/recursica-stack/site.json` on each computer, or to `~/circlechat/site.json` on a computer a person has not moved yet.

**With `"main"`, the update job takes six steps each hour, as root, on each computer** (`cluster/follow-main.mjs`):

1. The kit checkout's `origin` must name the kit's repo, `KIT_REPO` in `/etc/agent-cluster.conf`, as "The kit's repo" describes. The job then fetches `origin/main` into the kit checkout, as the owner. Each of the job's git commands runs with umask 022, so no file git writes is writable by the group. With no new commit, the job stops here.
2. GitHub must show each new commit as verified. One commit that GitHub doesn't verify stops the whole update, and the kit checkout stays where the checkout was. The cluster's channel, `SLACK_CHANNEL_ID`, gets one alert for each such commit.
3. The update waits until RecursicaChat 2.0 is quiet, as "Updates that interrupt work" describes. The channel hears about each update that waits once, then again every 24 hours while the update waits. A helper runs no RecursicaChat server, so a helper never waits.
4. The kit checkout fast-forwards to the new commit. After the fast-forward, the job removes group and other write in the checkout (`chmod -R go-w`), so the next hour's kit check passes. A checkout on a release tag moves to the `main` branch first. A checkout on another branch, or with commits main lacks, stays, and the channel gets one alert.
5. The job runs each setup the change touches again, as the owner, without the setup's network steps. A change touches a setup when the change edits a kit file the setup reads. The table below lists the setups.
6. The channel gets one line with the computer, the old and new commit, and the result. A network change that waits for a person gets one post of its own.

| Setup                | Where the setup runs                                         |
| -------------------- | ------------------------------------------------------------ |
| `setup-host.sh`      | The control computer, once for each stack the computer hosts |
| `setup-node.sh`      | Each computer, for the computer's own entry in site.json     |
| `install-cluster.sh` | Each computer, for the computer's own entry in site.json     |

The job never runs `rc-deploy`. A new RecursicaChat 2.0 server still waits for `sudo rc-deploy` by hand.

**A setup runs again only when the owner has password-free sudo.** Each of the three setups calls sudo as the owner. Without password-free sudo, the channel's line names each command to run by hand. On the control computer, `setup-host.sh --upgrade` still runs, with root's own steps, as in an upgrade. The line asks for the full `setup-host.sh` only when the change adds or removes a service or a job.

#### The kit's repo

**GitHub's checks ask the kit's repo in root's own file, `/etc/agent-cluster.conf`** (`KIT_REPO`, `cluster/kit-repo.mjs`). The owner can change the kit checkout's `origin` and the stack's site.json. An `origin` at another repo could then pass GitHub's checks with that repo's own verified commits. So the update job reads the repo's name only from root's file.

- `install-cluster.sh` writes `KIT_REPO` as root, from `repos.knowledge` in site.json. Without `repos.knowledge`, the setting is `borderux/recursica-knowledge`.
- A fork on GitHub gets the fork's own repo, such as `acme/recursica-knowledge`. The fork's computers then follow the fork, and the helpers come from the fork's verified commits.
- A fork off GitHub gets an empty `KIT_REPO`. GitHub can verify no commit there, so the kit steps stop, as the next paragraph describes.
- The update job refuses a `/etc/agent-cluster.conf` that root doesn't own, or that the group or other accounts can change.
- A file from before the setting has no `KIT_REPO` line. Until `install-cluster.sh` runs again, the job uses `borderux/recursica-knowledge`.

**An `origin` that names another repo stops the update job's kit steps.** The checkout moves to no new commit, and no root-owned helper is replaced. The same stop holds for a `KIT_REPO` off GitHub and for a file the job refuses. The cluster's channel gets one alert, then again for another reason or after 24 hours. The alert never shows the `origin` address, which can hold a token. The follow step alerts each hour the step runs. The helper step alerts only when a helper differs from the kit checkout's commit.

**To change the kit's repo, set `repos.knowledge` in site.json, and rerun `install-cluster.sh`.** To keep the repo, set `origin` back with `git remote set-url origin https://github.com/<owner>/<name>.git` in the kit checkout.

#### Kit services after an update

**Each hour, the update job restarts each kit service whose own code changed since the service started** (`cluster/restarts.mjs`). A running service keeps the code the service started with. Without a restart, the service runs old code after a fast-forward. A service's own code is the service's entry file and each file the entry imports, followed through every import. The job compares each file's change time with the service's start time. git writes each changed file anew, at the fast-forward.

| Service                  | The service's own code                                                                     | Restarts                    |
| ------------------------ | ------------------------------------------------------------------------------------------ | --------------------------- |
| The cluster agent        | `cluster/agent.mjs` and the agent's imports, the network check included                    | At once                     |
| The cluster's Slack app  | `cluster/bot.mjs` and the app's imports                                                    | At once                     |
| jobd                     | `jobd/jobd.mjs`                                                                            | At once                     |
| The GitHub token service | `github/token-service.mjs` and the service's imports                                       | At once                     |
| The model gateway        | The copy of `gateway/*.mjs` and `gateway/package.json` in the stack's `gateway-app` folder | When RecursicaChat is quiet |
| LiteLLM                  | `gateway/start-litellm.py`                                                                 | When RecursicaChat is quiet |
| kev-engine               | None in the kit: kev-engine runs from the engine's own checkout                            | Never for a kit change      |

- The model gateway runs a copy of the router's files. When the copy differs from the kit's files, the job copies the kit's files into `gateway-app` and restarts the gateway.
- Quiet means no agent turn running or queued and no service run open, as "Updates that interrupt work" describes. The channel hears once that the heavy services wait, then again every 24 hours.
- Each restart posts one line in the cluster's channel, with the service and the kit's commit. A failed restart posts the last lines of the output.
- The job leaves alone a service that isn't installed, isn't running, or has no known start time. On Linux, the start time comes from systemd. On a Mac, the start time comes from the job's process. A container's start time comes from Docker.
- The job never runs a setup this way. The job never restarts these services:
  - RecursicaChat, or a RecursicaChat job
  - the firewall's start-up job
  - the decoys
  - Ollama
  - the update job

**A failed setup leaves the kit checkout at the new commit for a person to look at.** The channel's line ends with the last lines of the setup's output. Text that looks like a key or a token is hidden. The job runs no other setup after the failed one. The next update waits for a newer commit on main, such as a fix. That update runs the failed setup again, with each setup the newer change touches.

**The job never applies a change that can cut remote access or interrupt running work.** A held step, a "network step" in the kit's markers, is a setup step of either kind:

- **A step that can cut remote access** changes the firewall rules, the `agentguard` anchor, `/etc/pf.conf`, nftables, Tailscale's settings or the guard's lockdown rules.
- **A step that can interrupt running work** moves the stack's files or Docker networks, or removes the stack's jobs.

The job runs each setup with `KIT_HOLD_NETWORK=1`, which skips the setup's held steps and runs every other step. A setup run by hand, with no `KIT_HOLD_NETWORK`, runs every step. The held steps are:

| Setup                | Network step                                                                                                                                                                  |
| -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `install-cluster.sh` | The firewall rules: on Linux `/etc/agentguard.nft`, `nft -f`, the guard's lockdown copy and the start-up job; on a Mac the pf rule files, `/etc/pf.conf` and the start-up job |
| `setup-host.sh`      | `tailscale serve` for the gateway's port for port jobs, on a Mac with Colima; removing CircleChat 1.x's jobs; and `tailscale serve` for the app preview                       |
| `setup-node.sh`      | `tailscale serve` for the RustDesk console, through `rustdesk/setup-rustdesk.sh`                                                                                              |

**A network change waits for a person, and the channel hears once a day while the change waits.** A network change edits a file in `circlechat/cluster/firewall/`, or a line between `# network-step begin` and `# network-step end` in a setup's script. The post names the computer, the commits, each waiting step and the command to run by hand on that computer:

- On a Mac, with `circlechat/cluster/firewall/pf-apply-tailnet.sh` in the kit checkout: `sudo <kit>/circlechat/cluster/firewall/pf-apply-tailnet.sh`. The script loads the new rules and puts the old rules back after 5 minutes. Within the 5 minutes, open a new RustDesk or SSH session over Tailscale, and run the script with `--confirm` there.
- On Linux, with `circlechat/cluster/firewall/nft-apply-tailnet.sh` in the kit checkout: the same, with that script. The kit has no such script yet.
- Otherwise: the setup itself, such as `<kit>/circlechat/cluster/install-cluster.sh <computer>`. The setup has no automatic undo.

The job posts again only for a newer network change, with every change that still waits. A change that moves the hold itself, such as `network_held` in `kit/lib.sh`, runs none of the setups that read the file. A network command added outside a network step does the same. Such a setup waits whole for a person.

**A kit from before the hold runs no setup.** A kit whose `kit/lib.sh` has no `network_held` can't skip a network step. So each setup that such a change touches waits whole for a person, and the post says why. The kit checkout still fast-forwards.

**An edit to network code waits for a person too.** Network code runs in a network step but sits outside the steps, such as the job installer in `kit/lib.sh`, which writes the firewall's start-up job. It sits between `# network-code begin` and `# network-code end`. An edit there changes what `install-cluster.sh` applies on its next run by hand, so the post asks for that run. The apply scripts don't load it, so new rule files don't clear it.

**The release upgrade and the image refresh hold the same steps.** A stack with `upgrade.auto`, and "Upgrade now", run `setup-host.sh --upgrade` with `KIT_HOLD_NETWORK=1` (`cluster/root-steps.mjs`). The image refresh does the same (`cluster/images.mjs`). A held step there waits for `setup-host.sh` run by hand.

**Removing CircleChat 1.x's jobs is a held step.** The step in `setup-host.sh` removes the `circlechat-boot`, `backup`, `restore-test`, `release-watch` and `agents-sync` jobs. Removing a job can stop work that runs, so the update job skips the step and posts it. A run of `setup-host.sh` by hand removes the jobs. A job that is already gone needs no sudo.

**The waiting change clears once a person applies the change.** A setup run by hand with no hold writes the kit's commit to `~/.recursica-kit/network-applied/<setup>` as the setup's last step. The job clears the setup's waiting change once that commit holds the change. For the firewall rules, the job also clears the change when the installed rule files change, as `pf-apply-tailnet.sh --confirm` installs them: `/var/lib/agent-cluster/pf-base.conf` and `pf-lockdown.conf` on a Mac, `/etc/agentguard.nft` and `/var/lib/agent-cluster/nft-lockdown.nft` on Linux.

**A kit that follows main installs no release.** The control computer posts no new release, and "Upgrade now" installs nothing.

#### Root's steps in an upgrade

**A release upgrade needs no password-free sudo for the account that owns the stacks.** The upgrade, `kit/upgrade.mjs`, runs as the owner's account. The root process that starts the upgrade takes each step that needs root: `cluster-updater` each hour, or the cluster agent for the "Upgrade now" button in Slack (`cluster/root-steps.mjs`):

1. **Before the upgrade, as root:** the gateway's state folder and LiteLLM's master key, as the secrets helper writes them ("Secrets in GitHub").
2. **The upgrade, as the owner:** `setup-host.sh --upgrade` takes only the Docker steps.

An older stack's `ANTHROPIC_API_KEY` in `.env` moves to the gateway's secrets file at the next full setup or secrets deploy. A run of `upgrade.mjs` by hand, in a terminal, uses sudo as before.

Each reboot time is in the cluster's time zone, `site.timezone` in the cluster's site.json, such as `Europe/Berlin`. Without `site.timezone`, each computer uses the computer's own time zone. Rerun `install-cluster.sh` after a change to `site.timezone`.

**Each Colima VM on a Mac stops cleanly before each restart the kit starts.** A VM still running when macOS restarts can lose writes to the VM's disk. Before the restart, the cluster agent takes three steps:

1. Boot out Colima's LaunchDaemon, so launchd never starts the VM again.
2. Run `colima stop` for each VM, including each unlocked client stack's VM.
3. Wait until `colima list` shows each VM stopped, for up to 2 minutes.

**After Homebrew upgrades tailscale on a Mac, at a quiet hour, the update job runs `tailscaled install-system-daemon` again.** The tailscale daemon runs a copy of the `tailscaled` binary in `/usr/local/bin`. The upgrade replaces only Homebrew's binary. The daemon keeps the old version until the copy is made again.

**A new kit reaches the two commands that are root-owned copies of kit files.** Root owns each copy. The account that runs the command cannot change the command.

| Command                             | Copy of                   | Computers                   |
| ----------------------------------- | ------------------------- | --------------------------- |
| `/usr/local/bin/agent-stacks-apply` | `deploy/apply-secrets.sh` | Every computer              |
| `/usr/local/bin/agent-stacks-disk`  | `tenant/disk-helper.sh`   | Linux, and Windows with WSL |

Each hour, after the kit step, the update job takes five steps for each installed copy (`cluster/root-copies.mjs`):

1. Root reads the kit file at the kit checkout's commit with `git show <commit>:<path>`, as the owner. Root never copies a file from the checkout, because the owner can edit the checkout's files.
2. Root checks the commit, each folder and the file against the ids in the commit. The owner can edit git's own folder too, so a changed object stops the copy.
3. A copy with the same bytes as the kit file needs nothing.
4. For a copy that differs, the kit checkout's `origin` must name the kit's repo, as "The kit's repo" describes. GitHub must show the commit as verified and on main in the kit's repo. GitHub is asked once for each commit. A commit GitHub doesn't verify replaces no copy, and the cluster's channel gets one alert.
5. The new copy replaces the old copy in one rename. The copy keeps the old copy's path, owner, group and mode. The cluster's channel gets one line for each copy the job replaced.

The job replaces only a copy a person installed. A computer without the copy gets none. The firewall's copies in `/var/lib/agent-cluster` wait for a person, as "A kit that follows main" describes.

**Lima and Colima on Linux and WSL come from each project's GitHub releases, outside apt.** `setup-pc.sh` installs each one at a pinned version and checksum. The update job reads each installed version each hour. A new release waits 7 days, then posts once in Slack. To take the release, move `LIMA_VERSION` or `COLIMA_VERSION` and the checksum in `circlechat/tenant/setup-pc.sh` by pull request. Then rerun `setup-pc.sh`. On a Mac, Homebrew installs Colima, and the Homebrew updates cover Colima.

Operating system packages are checked each hour, and each stack's container images once a day. Every image the kit starts runs at an exact version from the stack's `images.lock`: LiteLLM, the router, the app preview, Kev's install and Presidio's two services (`KIT_PINS` in `cluster/images.mjs`). A pin moves after the newer version has been out for 7 days. Then `setup-host.sh --upgrade` recreates the gateway on the new pins. When the `--upgrade` fails, every pin goes back, the failed versions are never used again, and Slack gets a message. `images.lock` can still hold the pins of CircleChat 1.x's images. Those pins never move, and the refresh pulls no 1.x image. macOS installs its own system updates overnight, and Windows waits 7 days before installing a quality update.

### Uptime

**Each computer's cluster agent asks every other computer's agent for a report every minute.** The agent asks at the other computer's Tailscale address: the node's `tailnet_address` in site.json, or the node's `address`. The control computer's `address` is often `host.docker.internal`, which only the control computer's containers can reach, so give the control computer a `tailnet_address`. The config check warns about a computer that no other agent can reach.

A computer silent for 3 minutes gets one alert in the cluster's channel and in each affected stack's channel. One more alert follows when the computer answers again.

**Each stack's own control computer checks the stack, on that computer.** The stack is up when the stack's RecursicaChat 2.0 server answers at `recursicachat.url`, `http://127.0.0.1:3100` by default. The stack's model gateway must answer at `127.0.0.1:<site.gateway_local_port>` too. Only the control computer lists the stack in the computer's report. A helper keeps a copy of site.json and runs none of the stack's services. So a helper lists no stack. Every other computer learns the stack's state from the control computer's report. No computer checks another computer's stack across Tailscale, because the computers reach only each other's agent there.

A stack down for 3 minutes gets one alert in the stack's channel, and one more when the stack is back. A client stack counts as locked while the stack's disk image is closed. A locked stack gets one reminder in the cluster's channel.

**An agent from before the services report checks CircleChat 1.x's port for each stack.** So the agent reports a stack as down whenever 1.x is gone. A watching computer skips the stacks in such a report. The cluster's channel hears once that the agent needs a restart, with `install-cluster.sh` on that computer.

**Each report also lists the state of the computer's own kit services.** A watching computer posts in the cluster's channel when a service has been down for 3 minutes. The computer posts once more when the service answers again:

| Service                          | Up when                                                                                             |
| -------------------------------- | --------------------------------------------------------------------------------------------------- |
| `kev-engine`                     | The node's `kev` port answers, on `127.0.0.1` or the computer's Tailscale address                   |
| `jobd`                           | The node's `jobs` port answers, on `127.0.0.1` or the computer's Tailscale address                  |
| `rustdesk-hbbs`, `rustdesk-hbbr` | The container runs, and the container's port answers on `127.0.0.1`: 21116 for hbbs, 21117 for hbbr |
| `ollama`                         | The node's Ollama server answers, once a route names one of the server's models                     |

A trial Ollama server that no route names isn't watched. The report holds each service's name and state, `up` or `down`, and nothing else. The report never holds a key, a setting's value or a log line. A watching computer drops any name or state outside that list. So a report can't put other text in a post.

**A kit service that restarts more than 3 times in an hour gets one post** in the cluster's channel. The computer itself posts. The count comes from systemd's `NRestarts`, launchd's `runs` or Docker's `RestartCount`. After the count of the last hour drops back to 3 or fewer, a new run of restarts posts again.

A running cluster agent keeps the agent's old code until the agent restarts. With `updates.follow` set to `"main"`, the update job restarts the agent after the agent's code changes, as "Kit services after an update" describes. `install-cluster.sh` restarts the agent too, and so does a new kit release.

**Each computer checks the computer's own network every 5 minutes.** The check posts in the cluster's channel, `SLACK_CHANNEL_ID`:

| Check              | Posts when                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------------------ |
| The router         | The computer's default route leads to a router other than `router` for the computer in site.json |
| github.com         | github.com resolves to an address outside the `web` addresses that `api.github.com/meta` lists   |
| The office address | The computer's address on the office network changes, and once at the first check                |

- A wrong router or a wrong github.com address posts once when the problem starts. A second post says when the problem ends. Another router can read and change the computer's traffic outside Tailscale. A changed name lookup can send the computer's GitHub traffic to another server.
- The check keeps the last list of GitHub's addresses, and fetches a new list once a day. A changed name lookup that also breaks the fetch is still checked.
- On a Mac, FileVault unlocks over SSH at the office address after a restart, before Tailscale starts. The office address post gives the address to use.
- The office address is the computer's address on the default route. In WSL, the check reads the router and the office address from Windows.

Set `router` for each computer in site.json's `nodes`, such as `"router": "192.0.2.1"`, then rerun `install-cluster.sh` on the computer. Without `router`, the check skips the router.

## Offboarding a client

1. **Open the client's stack** with the Unlock stack workflow.
2. **Archive:** pipe a new archive key, made in the password manager, into `./circlechat/tenant/offboard.sh archive <client>`. The script writes a final encrypted archive, then test-restores the archive. Nothing is deleted unless the archive restores cleanly.
3. **Move the archive folder** into the Archive folder in Google Drive, by hand.
4. **Remove:** run `./circlechat/tenant/offboard.sh remove <client>` on each computer picked for the stack. The script lists those computers. The script destroys the client's disk image, with the Docker VM inside the image, and the stack's job runner. The shared model servers and Kev's model stay, because the cluster's own stack owns them.
5. **Check:** run `./circlechat/tenant/offboard.sh check <client>` on each of those computers, for a pass/fail table. The table also checks that the cluster's own stack runs as before on the computer: each model server, Kev's model, the job runner and each service, and the gateway on the control computer.
6. **Remove the client's access:** delete the client's GitHub environment, Tailscale shares, keys and tokens, and archive the client's Slack channel.

## Privacy

`site.example.json` is the only deployment-shaped file here, and it holds placeholders.
Don't commit a real `site.json`, an `.env`, a machine name, an address or a key.

### Kev's review data

A design review writes Kev disagreement notes to `reviews/kev-disagreements.md` in the workspace. The notes name rules and file paths, and can quote the application's code. The notes never go to this repo or to any other public repo. A person reviews each change before Kev trains on it.

With `data.repo` in `site.json`, such as `your-org/recursica-kev-data`, the setup installs two jobs on the control computer:

| Job              | When       | What it does                                                                                                                                                                                                                        |
| ---------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `kev-data-push`  | Each hour  | Pushes new notes to a new `kev-notes/<date>-<time>` branch of the repo, and opens a pull request into `main`. The new pull request holds every note, and it closes the job's older open pull requests. The job never pushes `main`. |
| `kev-notes-pull` | Each night | The first step of Kev's training. It writes the notes on the repo's `main` branch to `$CC_DIR/kev-reviewed/kev-disagreements.md`. It reads no other branch, so notes that wait for review never reach training.                     |

Without `data.repo`, neither job runs. An earlier setting, `data.kev_disagreements_branch`, pushed the notes to a branch of this public repo. The config check now refuses it.

**Before each push, the job checks the repo's visibility through GitHub's API.** The job refuses a public or internal repo, and the knowledge repo under any name. The nightly job makes the same check before each read. The config check also refuses a `data.repo` that names the knowledge repo, and a client stack that sets `data.repo`.

To turn on the jobs:

1. Make a private repo with a first commit on `main`, such as a README.
2. Protect the repo's `main` branch with `bash circlechat/github/protect-repo.sh <owner>/<repo>`. The "Only admins merge" ruleset lets only a repo admin merge, so the push's app can never merge a pull request.
3. Create the push's GitHub App. `node circlechat/github/manifest.mjs kev-data` prints the app's manifest and the steps. The app has Contents and Pull requests, both read and write, and Metadata read. Install the app on the notes repo only.
4. Save the app's private key as `APP_KEY_KEV_DATA` in the stack's GitHub environment. Send the key to `gh secret set` on stdin, never on a command line or on screen. Then delete the downloaded key file with `shred`.
5. Set `data.repo` and `data.github_app` in `site.json`. `data.github_app` holds the app's `app_id`, `installation_id` and `slug`.
6. Deploy the secrets (see "Secrets in GitHub"), and rerun `setup-host.sh`.

**The push's token covers only `data.repo`, and lasts at most one hour.** The token service (see "GitHub access for agents") makes the token, with Contents and Pull requests only. site.json can't add a permission. The service writes the token to `$CC_DIR/kev-data.env` as `KEV_DATA_GITHUB_TOKEN`, with mode 600, and renews the token 15 minutes before the token ends. No agent, container or other job reads that file. The jobs give the token to git in the environment, never on a command line or in the clone's settings. Each notes commit uses the app's bot identity, `<app-slug>[bot]`.

An earlier setup used a personal access token, `KEV_DATA_GITHUB_PAT`. The secrets helper now removes the token from `kev-data.env`, and asks to delete the secret.

## The agents

**The agents run on the stack's RecursicaChat 2.0 server.** "Agents on RecursicaChat 2.0" describes how `rc-sync.sh` sets each agent up from the kit and site.json.

**Each agent's instructions are the built file `portable/recursicachat/agents/<handle>/INSTRUCTIONS.md`**, made by `npm run agents:build` from `agents/<handle>/SKILL.md` and `agents/<handle>/platform/recursicachat.md`. So a change to how an agent works goes in `agents/<handle>/SKILL.md`, and a change to how it runs on the server goes in its `platform/recursicachat.md`.

Never paste `agents/<handle>/SKILL.md` in directly. It still holds unfilled
`<!-- platform:NAME -->` markers, and pasting it silently drops whole passages — Barb once lost
her identity line, her intake paragraph and her write fence that way.

## RecursicaChat 2.0

The kit sets up, checks and backs up the stack's RecursicaChat 2.0 server and the agents on the server. The sections below describe each part.

CircleChat 1.x's agent check, `check-agent.sh`, and its check account are gone, with `site.check_account` and `CC_CHECK_PASSWORD`.

### Checking an agent on RecursicaChat 2.0

`./circlechat/rc-check-agent.sh <handle>` checks one agent on a RecursicaChat 2.0 server, the same
four ways, through the server's own API (`kit/rc-agent-check.mjs`). Run it by hand, as the owner, on
the computer that runs the server. The check is the harness's: nothing of it runs inside the server.

1. **A request that arrives during a running turn still gets answered.** The second request waits
   in the agent's queue (`GET /api/agents/:id/activity`), and no turn fails.
2. **A question gets asked once, then waits.** An open request gets at most one question, then
   nothing more through a quiet window (`CHECK_QUIET`, 120 seconds). After the check's reply, the
   agent acts. RecursicaChat 2.0 wakes an agent only for a message, a hand-off or a builder's
   trigger, so the quiet window stands in for 1.x's heartbeats.
3. **A settled task stays untouched.** A task in the chat, set to done, keeps its status and update
   time through another turn of the agent.
4. **A transcript arrives as an attached file.** The agent attaches one `.txt` file with
   `attach_files`, and a formatted `.md` copy beside the `.txt` is fine. The check downloads the
   `.txt` with its own session. The file must open with `CHECK_BANNER`'s lines when the setting is
   given (with `\n` between lines), hold at least `CHECK_MIN_WORDS` words (1,500), and carry speaker
   lines whose timestamps only move forward and end within `CHECK_MINUTES` (15). The agent's reply is
   one short line with no transcript in it. Nothing may follow the reply, and the agent may call no
   tool but `attach_files` in the chat during the check.

**The check signs in as its own account, a member or a builder.** Set `RC_CHECK_EMAIL` to the
account. The server's CLI, run as root, gives the account a session of at most an hour and prints
only the token. The wrapper pipes the token straight into the check: no argument, environment
variable, file or output holds it. The check sends it as a Bearer header, never a cookie. On every
way out, a failure or Ctrl-C included, the wrapper ends every session of the account with the CLI's
`end-sessions`. The CLI refuses an owner or an admin.

**The CLI runs with a Node the owner's account can run** (`RC_NODE`, the `node` on the owner's
`PATH` by default), never the server's own Node, which only the server's account can run. The other
settings: `RC_URL` (`http://127.0.0.1:3100`), `RC_APP` (`/opt/recursicachat/app`) and `RC_DATA`
(`/opt/recursicachat/data`), plus the `CHECK_*` settings in `kit/rc-agent-check.mjs`.

The check works in a throwaway chat with the agent. A member cannot archive a chat in RecursicaChat
2.0, so at the end the agent leaves the chat and the chat's name ends in "(finished)".
`CHECK_KEEP=1` leaves both. Each check is a real model turn, so a run can take tens of minutes.

### Agents on RecursicaChat 2.0

**`circlechat/rc-sync.sh` sets each agent's settings on the stack's RecursicaChat 2.0 server from the
kit and site.json, through the server's API.** Nobody pastes an agent's instructions by hand. The
sync sets five settings, the agent's starters and a model key for each agent with
`agents.<handle>.recursicachat` in site.json:

| Setting        | Source                                                                                        |
| -------------- | --------------------------------------------------------------------------------------------- |
| Instructions   | `portable/recursicachat/agents/<handle>/INSTRUCTIONS.md`, built from `agents/<handle>/`       |
| Autonomy       | `agents/<handle>/runtime/recursicachat.json` in the kit                                       |
| Sandbox        | `agents/<handle>/runtime/recursicachat.json` in the kit                                       |
| Model          | `gw-<handle>:<route>`, with the route from `agents.<handle>.recursicachat.model` in site.json |
| Monthly budget | `agents.<handle>.recursicachat.budget_usd` in site.json, in US dollars                        |
| Starters       | `"starters"` in `agents/<handle>/runtime/recursicachat.json` in the kit                       |

- **`setup-host.sh` runs the sync once, then installs the hourly job `rc-sync`.** The job runs as
  root, because only root may run the server's CLI. The sync itself runs as the owner.
- **Each agent is managed on the server.** The sync marks the agent managed (`cli.ts manage`), so
  the server's API refuses changes to the five settings from every session, the owner's included,
  and the web app shows them read-only, set by the repository. Change them in the kit or site.json.
- **The sync writes through the server's root-only CLI, and signs in to nothing.** The five settings
  go to `cli.ts agent-set` as JSON on stdin. The CLI sets only the settings that differ. The server
  restarts an agent before its next turn when the model or the sandbox changed, so an hourly run with
  nothing to change restarts nothing.
- **Starters are the suggestions an empty chat with the agent shows,** one tap each. List up to 8,
  each one line of up to 200 characters. With none, the server shows its generic ones. A starter with
  `[placeholders]` in square brackets opens a fill-in dialog, one field per placeholder, instead of
  sending. A server too old to keep starters prints none in `cli.ts agent-get`: the sync then sets the
  other settings and notes that the starters wait for a newer RecursicaChat.
- **The sync never adds an agent.** Add the agent in RecursicaChat first, with the agent's handle
  from site.json. Until then, the sync fails for that agent, and the other agents still sync.
- **No account is needed.** Earlier kits signed in as a builder account made for the sync. The sync
  no longer uses `recursicachat.account`, and says so while site.json still names the account: remove
  the line, and remove the account in RecursicaChat.
- **The model is one of the agent's routes, through the agent's own gateway handle.** The config check
  refuses another model, because a provider outside the gateway could be a cloud provider's.
- **Each agent has a gateway handle of its own, `rc-<handle>`, never a 1.x agent's handle.** The
  handle gets the routes and cloud switch of `agents.<handle>`. The `rc-` names keep the RecursicaChat
  agents' keys apart from the keys of CircleChat 1.x's agents, which the gateway's state may still
  hold. The config check keeps `rc-` names for RecursicaChat agents.
- **The sync sets each agent's key itself, as root, before the settings.** The server's
  provider for the agent is `gw-<handle>`, at `http://127.0.0.1:<site.gateway_local_port>/v1`. When the
  provider's stored key is the key the gateway records for `rc-<handle>`, the sync only refreshes the
  provider's address and models. Otherwise the sync issues a new key, checks that the gateway serves
  the agent's model and nothing outside the agent's routes, and pipes the key into the server's CLI
  (`kit/rc-gateway-key.mjs`, `cli.ts set-provider`). Nobody pastes, sees or copies a key: no argument,
  environment variable, file, clipboard or output line holds the key. A key that fails the check is
  revoked at once.
- **Only the provider's own agent may use the provider.** The sync warns about any agent on the server
  whose model names no provider, because the server then gives the agent the first provider of its
  kind. The sync also warns about an agent whose model names another agent's `gw-` provider.
- **`./circlechat/rc-sync.sh --check`** lists what would change, and changes nothing.

The `recursicachat` block in site.json:

| Setting            | Default                   | What the setting sets                                                |
| ------------------ | ------------------------- | -------------------------------------------------------------------- |
| `app`              | `/opt/recursicachat/app`  | The server's app folder                                              |
| `data`             | `/opt/recursicachat/data` | The server's data folder, `CIRCLECHAT_DATA`                          |
| `vault_key_file`   | none                      | The server's vault key, when the key sits outside the data folder    |
| `node`             | the owner's `node`        | A Node 24 or newer for the server's CLI, outside the server's folder |
| `public_url`       | none                      | The https address people open the app at, `CIRCLECHAT_PUBLIC_URL`    |
| `google_client_id` | none                      | The Google client ID for sign-in. The secret stays in its own file   |
| `google_domain`    | none                      | The domain whose accounts sign in with Google                        |

**The vault key reaches the CLI only through root.** The CLI opens the server's database, which
needs the vault key. With `vault_key_file`, root reads the file and hands the key to the CLI in
`CIRCLECHAT_MASTER_KEY`, never in an argument (`kit/rc-cli.sh`). `rc-check-agent.sh` takes the same
file as `RC_VAULT_KEY_FILE`.

**A gateway key for a handle site.json does not list reaches no model.** The gateway fails closed: such
a key gets no route and no cloud model, and the router refuses the key outright, whatever an older
`gateway.json` holds. Before, the key got every route, with the cloud switch on.

**Each Hermes agent keeps only the bundled skills its settings name.** Hermes seeds every agent's
home with dozens of bundled skills (apple, email, social media, devops and more), and each one sits
in the agent's prompt. The hourly sync's fourth step removes each bundled skill an agent's
`agents/<handle>/runtime/recursicachat.json` doesn't list in `"skills"`, such as
`"skills": ["github"]`. With no `skills`, the agent keeps none.

- **What stays:** Hermes's own `hermes-agent`, which Hermes never lets go, and every skill that
  isn't bundled, such as one the agent learned. Hermes lists its bundled skills in
  `skills/.bundled_manifest`, and never seeds a deleted one again.
- **When:** only while the server is quiet (`cluster/quiet.mjs`): no agent turn running or
  queued, and no service run open. Otherwise the sync says so and tries again the next hour.
  Nothing restarts: the agent's engine sees the change at its next start.
- **How:** two short containers on the server's own Docker, from Hermes's own image, with no network.
  One reads the agent's skills folder, read-only. The other removes the folders `kit/rc-skills.mjs`
  names, each a plain path inside the skills folder. `rc-sync.sh --check` lists what it would remove.
- **To give a skill back,** add its name to `"skills"`, then remove its line from the agent's
  `.bundled_manifest`: Hermes seeds it again at the engine's next start.

### Model use on RecursicaChat 2.0

**Each task on the server has a "Model use" setting.** The task's creator or an admin picks one of three choices on the task: Local only, the default; Local, then cloud if significantly delayed; or Cloud from the start. The model gateway reads the choice for each request of the task's agent, and "Which model answers" above says what each choice does. The server knows only the setting's name and choices, from a file the kit writes. The gateway does the rest.

- **The stall is `site.cloud_models.stall_minutes`, 15 minutes unless site.json sets another whole number from 1 to 1440.** The cluster's own stack can set it alone, as `"cloud_models": { "stall_minutes": 20 }`. The gateway and the server's text about a stalled task use the same number.
- **The server offers the setting from `/etc/recursicachat/task-settings.json`.** `recursicachat/install.sh` writes it from site.json (`taskSettings` in `kit/render.mjs`).
- **The gateway asks the server on a listener of the server's own, at `127.0.0.1:3101` on the control Mac.** The listener serves only the gateway's four routes and takes only the gateway's key. The gateway's container reaches the Mac's `127.0.0.1` at `host.docker.internal`, as LiteLLM reaches the Mac's Ollama. `gateway.json`'s `recursicachat_tasks` block names the address, the key file and each agent's handle on the server: the gateway's `rc-<handle>` is the server's `<handle>`.
- **One key, made once.** `setup-host.sh` makes the key in the gateway's state folder, `<CC_DIR>/gateway-state/rc-tasks.key`, with the same owner and mode as LiteLLM's master key there. `recursicachat/install.sh` copies it to `/etc/recursicachat/gateway.key`, `root:_recursicachat`, mode 440. The server reads the key at its start. Without the key file, `run.sh` starts the server with no task settings and no listener.
- **The gateway tells the server about each move to the cloud.** The first request of a task that goes to the cloud since the cluster last answered the task is a switch. The gateway raises the task's switch count in `clocks.json` and sends the switch to the server, which posts a line in the task's chat. A report that fails waits in `clocks.json`, and the gateway sends it again each minute. The server keeps one row per switch, so a second report changes nothing.
- **A server without the listener keeps every task on the cluster.** The gateway's question fails, and each request counts as outside a task, as before the setting existed.
- **`sudo rc-clear` empties the task's settings, their changes and its switches with the task** (`task_settings`, `task_setting_changes` and `task_cloud_switches`).

**To turn the setting on,** after the kit change reaches root's kit checkout and `setup-host.sh` has made the key:

```bash
sudo circlechat/recursicachat/install.sh   # task-settings.json, gateway.key and run.sh
sudo rc-deploy                             # a server with the listener; it starts with the new run.sh
```

With the server already at the latest commit, restart it instead: `sudo launchctl kickstart -k system/io.recursica.recursicachat`.

### The RecursicaChat 2.0 server's service, backup and restore test

**`circlechat/recursicachat/` holds the server's own scripts and launchd jobs, for the control Mac.**
This is the start of phase 5: the kit installs the server that rc-sync.sh already configures.

| File                                                                   | What it does                                                                            |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------- |
| `run.sh`, `io.recursica.recursicachat.plist`                           | Checks the setup, waits for Docker, starts the server as `_recursicachat`               |
| `io.recursica.recursicachat-colima.plist`                              | The server's own Colima VM, through `kit/colima-service.sh`                             |
| `backup.sh`, `io.recursica.recursicachat-backup.plist`                 | The nightly backup, as root, at 03:30                                                   |
| `restore-test.sh`, `io.recursica.recursicachat-restore-test.plist`     | The monthly test restore, as root, on the 1st at 05:00                                  |
| `stack-backup.sh`, `io.recursica.stack-backup.plist`                   | The nightly backup of the stack's own files, as root, at 04:00                          |
| `stack-restore-test.sh`, `io.recursica.stack-restore-test.plist`       | Its monthly test restore, as root, on the 1st at 05:30                                  |
| `rc-deploy.sh`, linked as `/usr/local/bin/rc-deploy`                   | Puts the latest commit of the server's branch into service                              |
| `rc-clear.sh` with `rc-clear.mjs`, linked as `/usr/local/bin/rc-clear` | Empties the server's work, and keeps a copy of what it removes                          |
| `build-pdftext.sh`                                                     | Builds the PDF text reader's image for people's uploads, and records its ID             |
| `lima-override.yaml`                                                   | The ports the server's Colima VM forwards to the Mac: `127.0.0.1` only, none below 1024 |

**Install them from root's kit checkout, with `sudo circlechat/recursicachat/install.sh`.**
`render.mjs` fills each template from site.json (`recursicachat.public_url`, `google_client_id`,
`google_domain`, `node` and `services`) and from the installing account (its home folder, this kit and `$CC_DIR`). The
installer then copies only the files that changed. It loads a changed backup or restore-test job at
once. It never restarts the server or its VM: it prints the command for that. It never touches the
data, the vault key, the Google secret or the restic password.

**The backup leaves out each agent's engine settings.** The server writes them at every engine start
(`server/src/agents/engines.ts`), with the agent's model proxy token in them: Hermes's `.env` and
`config.yaml`, OpenClaw's `openclaw.json` and OpenCode's `opencode.json`. The token is a stand-in, not
a provider key, and it lasts only while that engine runs. A restore loses nothing, because the next
start writes the files again. The guard then checks what is left, unchanged: no file named like a
key, and neither the vault key nor the restic password anywhere in the contents. The test restore
fails if a backup holds any of those settings.

**`build-pdftext.sh` builds the image that reads a PDF's text, and records its image ID, as the Hermes
image's ID is recorded.** People upload PDF, `.txt` and `.md` files to the server, and the server reads
a PDF's text in a container with no network, never in the server itself. The image is the app's
`images/pdftext`: `poppler-utils` from Alpine's own packages, on the official Alpine image pinned by
digest. The script refuses a base image that is not pinned by digest. It builds on the server's own
Colima VM, checks that `pdftotext` and `pdfinfo` run with no network, and writes the ID to
`/opt/recursicachat/pdftext.image-id`. After that, `run.sh` refuses to start the server unless the
image matches the ID, and hands the server the ID, so the server runs exactly that image. Before the
first build, the server starts, and a PDF's text reads as unavailable. Run it after an `rc-deploy`
that adds or changes `images/pdftext`:

```bash
sudo /opt/recursicachat/bin/build-pdftext.sh
sudo launchctl kickstart -k system/io.recursica.recursicachat
```

**`sudo rc-deploy` puts the latest commit of the server's branch into service, and puts the previous
one back on any failure.** It prints one summary line; each step's output goes to
`/var/log/recursicachat/rc-deploy.log`.

1. **Build, as the owner, never as root.** It clones the branch and repository the running app's
   `REVISION` names, and builds with the owner's Node (`recursicachat.node`): `npm ci --ignore-scripts`,
   so no dependency's install script runs, both type checks, the web build, and `npm prune --omit=dev`.
   The stage gets a new `REVISION` and a SHA-256 manifest of every file. The branch's tests ran in
   its pull requests' checks. The same commit as the running one changes nothing.
2. **Swap.** It stops the server, keeps the running app as `app.prev`, and copies the stage in,
   root-owned, with no write for the group or others.
3. **Check** the copy file by file against the manifest.
4. **Start and check.** `/healthz` must answer `ok` within 3 minutes, and the new start must print the
   same sign-in and tools lines as the last start did.

A failure after the server stopped moves the new copy to `app.bad`, puts `app.prev` back, starts it and
checks `/healthz`. It makes no backup first: run the backup job before it when the data matters.

**`sudo rc-clear` empties the server's work, for a fresh start while agents are built.** It prints one
summary line, with the counts of what stays and the path of the copy. Each step's output goes to
`/var/log/recursicachat/rc-clear.log`.

- **The work:** every chat with its members and read marks, messages, tasks and plans with each
  task's progress line, the person who last set its status and its comments, files and the text read from them, deliveries, service requests, approvals, engine sessions, chat memories and
  trigger runs.
- **The work outside the database:** each agent's Watch view and working folder. The server keeps an
  agent's Watch view in `agents/<id>/session.log.jsonl` in its data folder, and reads the view back
  from that file after a restart, so a clear that left it would show the earlier runs again. An
  agent's working folder is `agents/<id>/home/work`.
- **Each Hermes agent's history,** in its Docker volume (`cc-<id>-hermes`): its conversations
  (`state.db` with its `-wal` and `-shm`), `sessions`, `logs`, `pending_messages`,
  `runtime/active_sessions.json`, its own boards and projects (`kanban`, `kanban.db`,
  `projects.db`), past scheduled runs (`cron`) and its caches. `rc-clear.mjs` lists them in
  `HERMES_HISTORY`. Its settings (`config.yaml`, `.env`, `SOUL.md`), skills, the curator's copies,
  memories, plugins and Hermes's runtime files (`state/`, the gateway's files) stay, in
  `HERMES_KEPT`. An entry on neither list stays too, with a note in the log.
- **What stays:** people and their profiles, agents and the rest of their folders (an engine's
  settings), the vault, apps and access, service accounts, triggers, the tool log and the cost
  totals. `rc-clear.mjs` lists every table. No table is dropped.

1. **Check, before anything changes.** `rc-clear` refuses when a trigger, a bridge or a chat grant
   points at a chat, because each would then point at a deleted chat. It also refuses when the
   database has a table `rc-clear.mjs` does not list. A newer server made that table, and
   `rc-clear.mjs` must first list the table as work or as kept. The kit's CI catches such a table
   before a deploy: the `rc-clear tables` job reads every table the server's code creates on the
   fork's branch (`node rc-clear.mjs schema <server/src>`), on each kit pull request and each
   morning, and fails on a table neither list names. `sudo rc-deploy` runs the same check on the build it is about to
   install, and prints a warning naming each table before it swaps the app in. The deploy goes on.
2. **Stop** each program that drives an agent, then the server. Each agent's engine is a container
   the server started, and it stops with the server: `rc-clear` waits until none runs on the
   server's Docker, or starts everything again and deletes nothing.
3. **Copy** the database, the stored files, the agents' Watch views and working folders, each Hermes
   agent's history (`hermes-<volume>.tar`) and each program's state to `/var/root/rc-work-<time>/`,
   a folder only root opens. Then delete the copies
   older than 7 days.
4. **Delete the work's rows**, children first, in one transaction. The transaction checks that every
   kept table has the rows it had, and undoes itself otherwise.
5. **Remove** the stored files and the Watch views' files, empty each working folder and each Hermes
   agent's history (a folder stays, empty), and clear each program's state. Short containers from
   Hermes's own image, with no network, read and empty each volume; only the emptying one mounts it
   to write. A link in an agent's folder is never followed or removed.
6. **Start** the server, wait for `/healthz`, then start each program.

A failure before step 4 ends deletes no work: the server and the programs start again. A failure
after step 4 is in the summary line, with the copy's path.

**The programs come from `recursicachat.services` in site.json.** `rc-clear` stops and starts each
entry's `job`, and copies and clears each entry's `state` folder. An entry with no `job` keeps
running, with its state. Run `install.sh` again after a change to either setting.

**To put a copy back,** stop the programs and the server. Then, from the copy's folder:

- Copy `circlechat.db` over the server's database, owned by `_recursicachat`. Remove the `-wal` and
  `-shm` files beside the database.
- Copy `files/` into the data folder.
- Copy `agents/` into the data folder: each agent's Watch view and working folder.
- Unpack each `hermes-<volume>.tar` into that volume's `home/`, with the server stopped.
- Copy each `state-<name>/` into that program's state folder.

Then start the server and the programs.

### The stack's own files: site.json and the workspace

**`stack-backup.sh` backs up the stack's `site.json` and the agents' shared workspace each night.**
The workspace (`~/recursica-workspace`, or `~/circlechat-workspace` before a person moves the folder)
holds Kev's code, the app the preview serves and the knowledge checkouts. CircleChat 1.x's nightly
backup was their only backup, and that backup is gone. The server's own backup holds only the server's data.

- **Its own restic repository, `stack-files`,** on the same backup remote (`backup.remote` in
  site.json), with its own retention and its own restore test. Purging or rebuilding the server's
  repository never touches it.
- **The server's restic password,** `/etc/recursicachat/restic.password`: one password to keep for
  both repositories.
- **Left out:** each `node_modules` folder, which npm makes again, and each `.env` file. A file named
  like a key, or one that holds the value of the vault key or the restic password, stops the backup.
  restic keeps a link as a link and never follows one.
- **`stack-restore-test.sh`,** on the 1st of each month, restores the newest snapshot into a folder
  only root opens. It checks that every file came back, that `site.json` passes the kit's site
  check, that Kev and the app are there, and that no secret is in it. It posts the result in the
  stack's Slack channel.

To restore by hand: `restic restore --tag stack-files latest --target <folder>`, with
`RESTIC_REPOSITORY=rclone:<backup.remote>/stack-files` and the server's restic password.

### Posts, results and the morning summary

**Every post logs how it went.** Most jobs post only when something goes wrong, so a quiet channel
can't tell "all fine" from "posting is broken". Each post's result goes to the log of the job that
posted it, never to `/dev/null`:

- **A stack's own posts** (`kit/slack.mjs`, for the backups and restore tests): "slack: posted to the
  stack's channel (ts …)", or "slack: the post failed: <Slack's error>".
- **The cluster's posts** (`cluster/channel.mjs`, for the cluster agent, the updater, `post.mjs` and
  the reminders): "slack: posted info to the cluster's channel (ts …)", or Slack's error, or "no
  answer from Slack".

**Each backup and restore test also logs a success line and records its result** in
`/var/lib/agent-cluster/jobs/<job>.json` (`kit/job-status.mjs`): ok or failed, the time, and a short
detail such as the snapshot and the file count.

**Each morning, the updater posts a summary in the cluster's channel** (`cluster/daily-summary.mjs`),
at its first hourly run from 07:00 in the cluster's time zone: the night's two backups with their
snapshots and times, the last two restore tests, and each job that failed or didn't run on time. A
daily job is late after 27 hours, a monthly one after 31 days and 3 hours. A missing summary means
posting broke. Only the jobs installed on the computer are listed, so a computer without them posts
none.

To test each path with one post:

```sh
sudo bash -c 'set -a; . /etc/agent-cluster.conf; . /etc/agent-cluster.env; set +a; node "$KIT/circlechat/cluster/post.mjs" info ":test_tube: Test post through the cluster path"'
CC_DIR=~/recursica-stack node ~/recursica-knowledge/circlechat/kit/slack.mjs ":test_tube: Test post through the stack path"
```

### A session for a program outside the server

**A program that uses the RecursicaChat 2.0 server's API from outside gets a member session from
`circlechat/rc-session.sh`, never a password or an admin account.** The server has no API token for a
program. Its root-only CLI makes a session for a member account, at most 60 minutes long, and
refuses one for an owner or an admin. List each program in site.json:

```json
"recursicachat": {
  "sessions": [{ "email": "program@example.com", "account": "_program", "file": "/opt/program/run/session" }]
}
```

- **`setup-host.sh` installs the job `rc-session`, as root.** Every 45 minutes it makes a 60-minute
  session for each entry, so the file always holds a session that works.
- **The file belongs to the entry's account, mode 400, in a folder that belongs to root.** The job
  refuses a folder the program's account or anyone else could change, so root never writes through a
  link. The token goes from the CLI straight into a new file that then takes the old file's place in
  one step. No argument, variable or output line holds it.
- **A failure keeps the old file**, says why in the job's log, and the job tries again after a
  minute. The server refuses a session for an owner, an admin or a deactivated account.
- **The program reads the file again when the server answers 401**, and sends the token as
  `Authorization: Bearer <token>`, with no cookie.
- `rc-session.sh --once` makes each session once and stops.

### A program that drives an agent

**A program that decides what an agent is asked gets a service account, not a person's session.**
The server marks the agent as driven by that service. Then every message that would wake the agent,
from people, other agents and triggers, goes to the program instead, and only the program's own
messages reach the agent. The program works in any chat the agent is in, without being a member: it
posts one-line notes people see, sends the agent its instructions, and writes the detail in the
agent's Watch view. The agent's own instructions don't change, so the same agent works anywhere
without the program. List each program in site.json:

```json
"recursicachat": {
  "services": [{ "name": "example-service", "agents": ["designer"], "account": "_program", "file": "/opt/program/run/token" }]
}
```

- **`setup-host.sh` runs `circlechat/rc-service.sh` as root.** Through the server's root-only CLI it
  makes the service account, drives exactly the agents listed (an agent no longer listed answers
  for itself again), and writes the service's token into the file.
- **A token doesn't expire**, so the script makes one only when the file is missing or empty, or the
  server has no token for the service. `sudo OWNER=$(id -un) circlechat/rc-service.sh --rotate
<name>` makes a new one, and the old one stops working at once.
- **The file belongs to the entry's account, mode 400, in a folder that belongs to root**, written
  the same way as a session file: the token never passes through an argument, a variable or an
  output line.
- **The token works only on the server's `/api/service/*` routes, and only from the server's own
  computer**, straight to the server: never from a browser or through Tailscale. The service sees
  only the chats its agents are in.
- **An agent has at most one service.** To hand an agent back to the people who use it, take it out
  of the entry and run the script again. Revoking the service's token on the server (`cli.ts
service-revoke`) also stops the service driving its agents.
- **An entry may also name the program's `job` and `state`, for `sudo rc-clear` only.** `job` is the
  program's launchd job, such as `"job": "io.example.program"`. `state` is the folder that holds only
  the program's state, such as `"state": "/opt/program/home/state"`, and it belongs to the entry's
  account. `rc-clear` deletes everything in that folder, after copying it aside.

**A program that asks a model directly gets a gateway key of its own,** from a `gateway` block in the
program's entry. A program asks a model directly for a short check, such as a yes-or-no question about
an agent's answer, instead of running an agent turn:

```json
"recursicachat": {
  "services": [{
    "name": "example-service", "agents": ["designer"], "account": "_program", "file": "/opt/program/run/token",
    "gateway": { "routes": ["judge"], "max_parallel": 4, "daily_requests": 5000 }
  }]
}
```

- `routes`: the routes the program's key may use. Each route is one of site.json's `routes`, and
  lists cluster models only: the program's key never reaches a cloud model.
- `max_parallel`: the requests the key may have at once, from 1 to 64. Match the model server's
  parallel slots, such as an Ollama server's `parallel`.
- `daily_requests`: the requests the key may send each day, from 1 to 1,000,000. The day runs from
  midnight to midnight in the cluster's time zone, `site.timezone`, or the control computer's own
  time zone without `site.timezone`.
- The block needs `site.gateway_local_port`. The program asks the gateway at
  `http://127.0.0.1:<site.gateway_local_port>/v1`, with the key as `Authorization: Bearer <key>`.
- With a gateway block, the entry's name is at most 36 characters.
- `kev` (optional): the computers whose Kev-engine the program's key may reach, best first, such as
  `"kev": ["machine-2"]`. Each one is a node with `kev.port`, whose engine listens beyond the
  computer's loopback address: the gateway runs in Docker, so it can't reach an engine on
  `127.0.0.1`. The program sends Kev-engine's own requests to
  `http://127.0.0.1:<site.gateway_local_port>/v1/systemone` with its gateway key. The gateway sends
  each one to the first engine, with the engines' own key, `KEV_ENGINE_KEY`, in place of the
  program's key, and passes it to the next engine when one can't be reached or answers 429 or 5xx.
  So the program never holds the engines' key, and the program's two caps count these requests too.
  The spend log names the route `kev` and the engine, never a question or an answer. Kev itself
  (`tools/kev`) works this way with `KEV_ENGINE_URLS` set to that address and `KEV_ENGINE_KEY` set to
  the program's gateway key.

**A program that only asks models leaves `agents` out.** Such a program, an eval for one, drives no
agent, so the server gets no service and no token for it, and its `file` is its gateway key file:

```json
{ "name": "example-eval", "account": "person-a", "file": "/opt/example-evals/example-eval.gateway-key",
  "gateway": { "routes": ["judge"], "max_parallel": 4, "daily_requests": 5000, "kev": ["machine-2"] } }
```

- `rc-service.sh` writes the key to `file`, the entry's account's own, mode 400. The folder must
  belong to root, with no write for the group or others, as for a token.
- **To revoke the key,** remove the entry from site.json and rerun `setup-host.sh`. The gateway then
  has no handle `svc-<name>`, and refuses the key at once. To drop the key's record as well, run
  `sudo node circlechat/kit/rc-gateway-key.mjs revoke <gateway-state> svc-<name>`, and delete the
  file. Neither step touches another entry's key or token.

How the gateway key works:

- **The key's gateway handle is `svc-<name>`.** The gateway lists the handle beside the agents'
  handles in `gateway.json`. `GET /v1/models` with the key lists exactly the block's routes. A
  request with the key runs outside any task, so only the cluster answers it, and the key gets no
  task key. An agent's handle never starts with `svc-`.
- **`rc-service.sh` issues the key** and writes the key to `<name>.gateway-key`, in the folder of
  the entry's `file`: the entry's account owns the key file, mode 400, in the folder that belongs to
  root, written the same way as the token. The key never passes through an argument, an environment
  variable or an output line. Before the file takes a new key, the script checks the key on the
  gateway's `GET /v1/models`, which must list exactly the block's routes. A key that fails the check
  is revoked, and the old file stays.
- **A rerun keeps the key** while the file holds the key the gateway records for `svc-<name>`.
  `--rotate <name>` makes a new token and a new gateway key, and the old key stops working at once.
  Without a gateway block, a rerun revokes the key `svc-<name>` still has and removes the key file.
- **The gateway answers 429 at once past either cap,** and never queues the request. The JSON error's
  `type` is `too_many_at_once`, with a `Retry-After` of 1 second, or `daily_limit`, which lasts until
  midnight in the cluster's time zone. The program decides how to wait, and a held request never sits
  in the gateway where the program cannot see the request. A request in flight counts until the
  answer ends or the program closes the connection, including a request that waits for a busy
  cluster.
- **Each request counts toward the day once the gateway admits the request,** whatever the answer.
  The gateway writes the day's count to `service-counts.json` in the `gateway-state` folder before the
  request goes on, so a restart keeps the count. A refused request does not count.
- **The spend log gets a line for each request,** as for an agent: the handle, the route, the model,
  the status and the token counts. A refused request gets a line with status 429 and the cap as the
  reason. The log holds no prompt and no answer.
- **The gateway must know the handle before the key works.** Change site.json, run `setup-host.sh`,
  which renders `gateway.json` and restarts the gateway, and `setup-host.sh` then runs
  `rc-service.sh`. Run `rc-service.sh` alone only when the running gateway already lists the handle.

## CircleChat 1.x is gone

**The kit no longer runs CircleChat 1.x, the chat server the agents once ran on.** The agents run on RecursicaChat 2.0. The kit runs none of 1.x's parts:

- CircleChat's containers and Compose project, and its database role for the gateway
- the agents' Hermes homes, `setup-agent.sh`, `sync-skills.sh` and the hourly `agents-sync` job
- the agent check, `check-agent.sh`, and its account
- the Slack notifier and its events, and the cloud-model requests in Slack
- the agents' outgoing filter, `cc-egress`, and the "Allow once", "Stop" and "Resume" buttons
- 1.x's boot job, its backup and test restore, and the release watcher

These stay: the gateway and LiteLLM, the job runners and their filter, the port-job path, the app preview, Kev and Kev's jobs, the GitHub token service, the RecursicaChat 2.0 jobs, the backups of the server and the stack's files, the cluster's services and the update job.

**A site.json with 1.x's settings still loads.** The config check prints one warning for each such setting, and nothing reads the setting:

- `site.circlechat`
- `site.check_account`
- `cloud_approvers`
- `notify.slack`, `notify.events` and `notify.people`

`notify.details` stays: it still keeps task titles and names out of a client stack's Slack posts. A pull request in the private repo of stacks can drop the warned settings later.

## Moving a computer off CircleChat 1.x's names

**`circlechat/migrate-off-1x.sh` moves one computer off CircleChat 1.x's names, once.** Until a person runs the script, the kit keeps the old names in every unattended job: the update job, the image refresh, the secrets helper, the cluster agent, the job runners and the RecursicaChat 2.0 jobs. `kit/stack-paths.sh` and `kit/stack-paths.mjs` pick each folder: the new folder when the new folder exists, else the old folder when the old folder exists, else the new folder.

| CircleChat 1.x's name                      | New name                        |
| ------------------------------------------ | ------------------------------- |
| `~/circlechat`, the stack's folder         | `~/recursica-stack`             |
| `~/circlechat-workspace`                   | `~/recursica-workspace`         |
| `~/tenants/<client>/circlechat`            | `~/tenants/<client>/stack`      |
| `circlechat_models`, the gateway's network | `gateway-models`                |
| `circlechat_default`, `circlechat_agents`  | none: the gateway needs neither |

A client or demo stack's networks carry the stack's name, such as `cc-acme_models` and `gateway-models-acme`.

**The moves interrupt running work, so no update job makes them.** Run the script in a terminal, as the account that owns the stacks:

```bash
./circlechat/migrate-off-1x.sh --dry-run
./circlechat/migrate-off-1x.sh
TENANT=<client> ./circlechat/migrate-off-1x.sh
```

`--dry-run` prints each step and changes nothing. A second run finds each step done, and changes nothing.

**On the stack's control computer, the script takes eight steps:**

1. **The quiet check.** The script refuses while RecursicaChat 2.0 isn't quiet: agent work is queued, or a person is online (`cluster/quiet.mjs`). The check runs as root.
2. **The containers.** The script removes the gateway's containers, the app preview and 1.x's leftover containers. Model requests stop until step 5 ends.
3. **The folders.** The script moves the stack's folder and the workspace. A link at each old name points to the new folder, so a job installed before the move keeps working.
4. **The network.** The script makes the gateway's network, `gateway-models`.
5. **The setup.** The script runs `setup-host.sh` by hand, with no hold. The gateway starts on `gateway-models`, each job gets the new folders, and 1.x's jobs go.
6. **1.x's networks.** The script removes `circlechat_default`, `circlechat_agents` and `circlechat_models`, each one only when no container uses the network.
7. **The server's jobs.** On a Mac with a RecursicaChat 2.0 server, the script runs `recursicachat/install.sh`, so the server's backup jobs use the new folders.
8. **1.x's files.** The script lists 1.x's files left in the stack's folder, such as `compose.yml` and `hermes-homes`. The script removes none of them. Keep a copy if one is wanted, then remove them by hand.

A real folder at both the old name and the new name stops the script before any change. Keep one folder, then run the script again.

**On a helper computer, the script only moves the folder,** which holds only site.json. Then run `setup-node.sh <computer>` and `install-cluster.sh <computer>` when the update job asks for them.

**The order:** the control computer first, then each helper. After the script, run each setup the update job's post names, on each computer. The links at the old names can go once nothing reads the old names, such as a copy step in the private repo of stacks.

## Hard-won lessons (read before debugging)

- **On WSL, keep WSL running.** WSL stops when no Windows program holds WSL open, and every service stops with WSL. `install-wsl-boot.ps1` starts WSL at boot and keeps WSL running, as "WSL at boot on Windows" describes. A task that runs as SYSTEM can't do this: each distro belongs to the account that registered it.
- **The gateway allows a key from each network it has.** `setup-host.sh` attaches the router's networks before the gateway starts: the models' network, and `jobs-egress` when the network exists. A network attached later counts too: a request from an address outside every known network makes the gateway read its networks again, at most every 5 seconds, before it answers `outside_cluster`.
- **Edit files in WSL (`~/…`), not the Windows copy (`C:\Users\…`).** Docker reads the WSL one.
- **Docker Desktop can't mount symlinks.** Use real directories.
