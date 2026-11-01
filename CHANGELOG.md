# @recursica/knowledge

## 0.13.0

### Minor Changes

- b83c195: CircleChat host kit: `circlechat/check-agent.sh <handle>` checks how one agent behaves on a running CircleChat. Run it on the stack's control computer, by hand, after `setup-agent.sh`, which prints the command and never runs it. It works in a private throwaway channel, on throwaway tasks, and archives them at the end. It checks four things:

  - A request that arrives during a running turn still gets answered. Its run waits in the agent's queue and never fails.
  - A question gets asked once, then waits through heartbeats until a reply, and the agent then acts.
  - A task moved to review gets no comment, status change or file from the agent.
  - A reply past the chat limit (2,000 characters, or 600 with `CHECK_DELIVERABLES_ONLY=1` for a deliverables-only agent) is posted as its opening paragraph, with the whole reply attached as `reply.md`.

  It prints one PASS, FAIL or SKIP line per check and exits 1 on any failure. Each wait has a time limit, set by a `CHECK_*` variable. The check needs the CircleChat fork's agent queue.

  The check signs in as its own CircleChat account, made only for the check, and signs out at the end. The account is a member of the agents' workspace and never an admin, and the check stops when the account has another role. The email is `site.check_account` in site.json, or `agent-check@<site.public_host>`. The password is the new `CC_CHECK_PASSWORD` secret in the stack's GitHub environment: the "Deploy secrets" workflow passes it, and the secrets helper writes it to `$CC_DIR/agent-check.env` only, mode 600, owned by the owner. `kit/check-account.mjs` makes the account inside CircleChat's api container, with CircleChat's own password hashing, and sets the role back to member when the role changed. The account is locked except while a check runs: locked, its stored password is the hash of a random secret nothing keeps, and its sessions are ended, so the delivered password signs in nowhere. The secrets deploy and the full setup leave it locked. `check-agent.sh` unlocks it, runs the check, and locks it again on every way out, a failed check, an error and Ctrl-C included. The password reaches the container on stdin and is never printed.

  A member sees no run's error text and no agent's deliverables-only setting, so check 1 fails on any failed run of the request, and check 4 takes the setting from `CHECK_DELIVERABLES_ONLY`.

  Tests run the check on GitHub against a stand-in CircleChat that gives a member only what CircleChat gives a member and refuses the admin-only routes, and a scripted stand-in agent. Other tests cover the account step, the password file and the workflow's list of secrets, and the smoke install makes the account against CircleChat's real database.

  The rules for reading a request are in CircleChat's prompt for every agent, not in Loki's persona: the person's newest comment is the request and the title is a label, a request that names its deliverable is clear, and an agent asks once, then waits. Loki's persona is unchanged, and a test checks that it never contradicts those rules.

- 545eb27: CircleChat host kit: each agent that pushes to GitHub has a GitHub App of the agent's own. The app replaces a personal access token. The agents are Alan, Betty and Porter, and later Otto.

  - **`github_apps` in site.json.** Each agent's entry holds the app ID, the installation ID, the slug, the repos and the permissions. Each app has Contents and Pull requests, and Alan's app adds Issues.
  - **The private key stays with root.** Each app's key is the GitHub environment secret `APP_KEY_<AGENT>`. The secrets helper writes the key to a root-owned file outside the stack's folder. No agent, container, `.env` file or backup holds the key.
  - **A token service on the control computer.** The service makes an installation token for each agent, for the agent's repos and permissions. Each token lasts at most one hour. The service makes a new token when the token has 15 minutes left.
  - **The agent gets only the token.** The token goes to the agent's `.env` as `<AGENT>_GITHUB_TOKEN`. A port job asks the service for a token over Tailscale, with the job's task key. The job's token covers only the job's repo.
  - **Commits use the app's bot identity,** `<app-slug>[bot]`, with the bot's noreply email address.
  - **A manifest for each app.** `node circlechat/github/manifest.mjs` prints each agent's manifest and the steps to create the app.
  - **The key check finds private keys.** The check fails when a private key is in CircleChat's database, an agent's home or a backup.

  A stack with no `github_apps` block keeps working, with no push access.

  ### Upgrading

  1. Create each agent's app, as "GitHub access for agents" in `circlechat/README.md` describes. Save each app's private key as `APP_KEY_<AGENT>`.
  2. Add the `github_apps` block to site.json.
  3. Copy `circlechat/deploy/deploy-secrets.yml` to the private repo again. The new workflow passes each app's key.
  4. Deploy the secrets, then rerun `setup-host.sh` and `setup-node.sh`. Rerun `setup-agent.sh` for each agent.
  5. Delete `ALAN_GITHUB_PAT`, `BETTY_GITHUB_PAT` and `PORTER_GITHUB_PAT` from each GitHub environment, and revoke each token on GitHub.

- 27a6620: ## CircleChat host kit changes since 0.12.0

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

- 381b057: CircleChat host kit: cloud-model requests in Slack. In CircleChat, a person who is not an approver asks to move a task off "Cluster only". An approver answers the request in the stack's Slack channel.

  - **`cloud_approvers` in site.json.** Each entry holds the person's CircleChat email and Slack user ID.
  - **A receiver on the stack's own network.** `cc-cloud-requests` takes CircleChat's request webhook and checks the webhook's signature. The receiver then posts the request in the stack's channel, with an Approve and a Deny button. The post mentions each approver. The receiver has no published port.
  - **Only a cloud approver presses either button.** "Approve" needs the person's authenticator code, like "Resume". "Deny" needs no code. The cluster agent on the stack's control computer checks the person again. The agent then calls CircleChat's answer API with the service token and the approver's email. The Slack app replies in the thread with the result.
  - **Two secrets in root-only files.** `setup-host.sh` makes `CLOUD_APPROVAL_TOKEN` and `CLOUD_REQUEST_WEBHOOK_SECRET` once, in `cloud-approvals/` in the stack's folder. CircleChat's api reads both from the files, and gets `CLOUD_APPROVERS` and `CLOUD_REQUEST_WEBHOOK_URL`.

  A stack with no `cloud_approvers` keeps working as before. The requests need the CircleChat fork's cloud-model requests.

  ### Upgrading

  1. Add `cloud_approvers` and `site.slack_channel_id` to the stack's site.json.
  2. Enroll each approver who is not on `APPROVERS`: `node circlechat/cluster/enroll.mjs <slack user id, lowercase>`. Save each secret as `TOTP_SECRET_<SLACK USER ID>`, and deploy the cluster's secrets.
  3. Rerun `setup-host.sh` in a terminal, so the setup can make the two secret files.

- 15ff792: CircleChat host kit: a new kit release installs only after an approver approves the release in Slack. The approval needs an authenticator code.

  - **One post per release.** Each hour, the update job on the cluster's control computer looks for a new kit release. The job posts the release once in the cluster's Slack channel, with the version, the release notes and an "Install" button.
  - **One approval for the whole cluster.** "Install" needs an approver and a 6-digit authenticator code, like "Resume". The Slack app sends the approval to the cluster agent on every computer. Each computer installs the release at the next hourly check.
  - **Held until approved.** Until an approval, every computer holds the release, and nothing installs. The job posts a reminder once a day.
  - **A new major version still asks first.** "Upgrade now" now needs an authenticator code, and counts as the release's approval.
  - **A log of each approval.** Each computer logs the release, the approver, the time and the computer in `/var/lib/agent-cluster/release-approvals.log`.

  Every other update keeps the same rules. Such updates include images, Ollama, the operating system and the CircleChat fork's commits.

  ### Upgrading

  The update job holds each kit release after this release. To install a release, an approver presses "Install" in the cluster's Slack channel. Each approver needs an authenticator code from `enroll.mjs`.

- 0f465a2: Loki now lives on CircleChat only. He makes exactly what a request asks for, such as one 15-minute transcript, with no study plan or answer key unless the request asks for one. He picks sensible values for anything left out and asks a question only when something is truly open. Each transcript is his reply: with his CircleChat agent set to deliverables-only, CircleChat saves a long reply as `reply.md` on the message or the task, so he calls no tool and writes no action to deliver it. This replaces the write, check and attach steps, which failed on gpt-oss. The synthetic banner, the made-up-names rule and the refusal to hand fake data into a real dataset stay. His Buzz prompt and settings, his Claude Code artifact, `nest/bin/deploy-loki.sh` and the Loki sandbox guide are removed; what they explained about the fence is in `agents/loki/PORTING.md`.
- de11f2d: CircleChat host kit: client stacks run on Linux and in WSL with the same isolation as on a Mac. Each stack gets its own Colima VM, with QEMU and KVM, and its own LUKS image file with the client's key. The Unlock stack workflow opens and closes the image. `setup-pc.sh` prepares the computer, and `isolation-check.sh` prints the isolation table.

  On every computer, the client's Docker VM now lives inside the disk image, including the disk that holds the containers and volumes. The VM mounts only the stack's folder, and never becomes the current Docker context.

- c24fe17: CircleChat kit: `circlechat/github/protect-repo.sh` sets up each repo on the command line the way the plan repos are set up.

  - **Two rulesets on the default branch.** "Protect main" stops deletion and force pushes, and each change arrives in a pull request. "Only admins merge" lets only a repo admin merge. A ruleset with the same name is updated in place.
  - **Secret scanning with push protection, Dependabot alerts and security updates.**
  - **A read-only workflow token,** unable to approve a pull request.
  - **Branch deletion after each merge, and forking off for a private repo.**
  - **A pull request that adds `dependabot.yml`,** for the repo's package systems, when the repo has none.

  The script asks for a one-day token with `read -rs`, and uses the token only through `GH_TOKEN`. The script changes only the repos on the script's command line. The script then prints a table of each setting, read back from GitHub.

- a934733: ## The knowledge MCP server replaces `@recursica/mcp`

  Betty and Barb now look up each adapter's names with the knowledge MCP server, which runs from this repository and serves this repository's skills. The old `@recursica/mcp` package is retired everywhere. That package kept a separate copy of the knowledge, which drifted from the skills. The package also recognized only the Mantine and MUI adapters, so the package found no adapter in a Beam project.

  - **A command to register the server.** `npm run mcp:install` registers the knowledge server in Claude Code for every project, or for one project with `--project <dir>`. `npm run mcp:install:check` reports the server's state and changes nothing. The command works without the agents, for anyone who installs only some agents or none.
  - **The agent install registers the server too.** `npm run agents:install` now runs the same step, and `agents:install:check` reports on the server. `--no-mcp` skips that step. Until now nothing registered a server on Claude Code, so Betty and Barb ran without one and no setup step said so.
  - **The old server is removed.** Both commands remove a registration of `@recursica/mcp` for every project and for each folder Claude Code knows. A registration in a project's committed `.mcp.json` is reported for the team to remove, not edited. The check fails while any remain. A test fails if any file in this repository starts the old package again.
  - **Betty and Barb use `component_api`.** The tool reads the adapter the project installs, so the lookup works for every adapter, Beam included. Betty's tool list also gets the knowledge server's skill tools, which her instructions already preferred over the manifest script. When the server is missing, both agents read the installed adapter's API instead.
  - **The skills name the knowledge server.** The 41 skills that told agents to get the theme's variants from the Recursica MCP server now name the knowledge MCP server and the server's `component_api` tool. No rule changed; each skill gets a patch version.
  - **Grok and CircleChat.** The Grok plugin starts only the knowledge server. A CircleChat host runs the knowledge server for Betty and Barb from the knowledge checkout, and no longer tracks or upgrades a version of the old package.

  ### Upgrading

  On Claude Code, pull and run `npm run agents:install`, or `npm run mcp:install` without the agents. On a CircleChat host, rerun `circlechat/setup-host.sh`. The setup switches Betty and Barb to the knowledge server and removes the old server's files from the shared workspace.

### Patch Changes

- 01355b6: CircleChat host kit: each GitHub App's private key is the secret `APP_KEY_<AGENT>`, such as `APP_KEY_ALAN`. GitHub refuses a secret name that starts with `GITHUB_`. The deploy workflow, the secrets helper and `circlechat/github/manifest.mjs` use the new name. Copy `circlechat/deploy/deploy-secrets.yml` to the private repo again.
- 06e2f0f: CircleChat host kit: `setup-agent.sh barb` sets Barb's limits from `agents/barb/runtime/hermes.md` on each run. The limits are `delegation.oneshot_max_children`, `delegation.max_concurrent_children`, `delegation.max_iterations` and `tool_loop_guardrails.loop_caps.max_subagents`, set inside the `delegation` block that Hermes's own default config already has. Before, the script added them only when no `delegation` block existed, so a fresh install never got them. The script also gives Barb her Kev-engine key from `$CC_DIR/.env` when none is given, and checks `HERMES_TIMEOUT`, printing only `HERMES_TIMEOUT ok` or the value it should be.
- 303a832: Betty on CircleChat: a plain request is enough for a prototype in the prototype repository. After her interview and design brief, which stay first, she imports every UI component from `@recursica/adapter-mantine-v8` and never from `@mantine/core`, looks each component up with the knowledge server's `component_api` tool, wraps each page in `<Prototype>` from `../../Prototype` as the demo prototype does, puts each page at `src/routes/prototypes/<slug>/index.tsx`, and writes each file with `write_file`. A prototype there is never pushed and gets no pull request; she checks the page and replies with the preview route first. A page built from `@mantine/core` without the wrapper had looked like stock Mantine. A test checks the built persona.
- 9228ae5: CircleChat host kit: the smoke install and the install guide use the CircleChat fork's renamed branch, `recursica/local-fixes`. The old name no longer exists, so the smoke install failed to clone CircleChat.
- b83c195: CircleChat host kit: the nightly backup saves CircleChat's stored files (uploads, task deliverables and long replies saved as files). CircleChat keeps them on disk at `STORAGE_DIR`, not in MinIO, so no backup held them. `backup.sh` now saves the stack's `storage` volume as `storage.tgz`, and logs a skip and writes `storage.none` when the stack runs a CircleChat without the volume. The restore test checks `storage.tgz`, or `storage.none` in its place. A new step, `kit/carry-storage.sh`, copies `/app/storage` out of the old api and worker containers onto the new volume once, before `setup-host.sh`, the upgrade job or the weekly image refresh recreates them. It merges the two, keeps the newer file for a name in both, and does nothing when compose names no `storage` volume, when no old container is left, or when the volume already holds files.
- b5c1e83: CircleChat host kit: the cloud-model requests' secret files work on a Mac with Colima. Since the last release, the setup made `cloud-approvals/` readable by root only. Docker in Colima reads the Mac's files as the owner, so Docker could not mount the approval token. CircleChat's api then did not start.

  - **The owner and mode of the stack's other secret files.** On a Mac, the owner owns `cloud-approvals/` (700) and both files (600), as with the gateway's state folder and `model-keys.env`. On Linux, root keeps both files, in a folder the owner can only pass through (711).
  - **Both files exist before `docker compose` runs,** in every mode. The secrets helper and the upgrade job make the folder and both files as root, before the owner's Docker steps. Neither writes through a link.
  - **A check of each mount before `docker compose`.** `setup-host.sh` reads each bind mount from `docker compose config`. On a Mac, the owner must be able to read each mount in the owner's home. On Linux, each mount must exist. A mount that fails stops the setup before any container changes, so CircleChat keeps running.
  - **The cluster agent reads the service token only from a plain file,** never through a link.

  ### Upgrading

  On a Mac with Colima, run `setup-host.sh` once in a terminal. The setup gives the owner the folder and both files. Then add `cloud_approvers` back to site.json, if the list came out.

- 688a9ba: Dependabot checks the repository's npm packages, GitHub Actions and Docker images each day. Dependabot opens one pull request per package system, for a version at least 7 days old.
- 9698524: CircleChat host kit: on a Mac, `give_home` no longer stops at a file in an agent's home that root owns on the Mac. Older kits copied `SOUL.md`, the skills and `knowledge-mcp` into each home with sudo, and Colima refuses to change those files, so `setup-agent.sh` failed with only `EPERM: operation not permitted, fchmod` and left the home part-changed. `give_home` now replaces each such entry with a copy it makes itself, with the same text, and sets the copy. An entry that still cannot be changed is named in the error, and every other entry is still set.
- 2a2bd9f: CircleChat host kit: `setup-agent.sh` turns off Hermes's model-catalog refresh and update checks for every agent. Hermes's gateway starts on each turn and, 30 seconds later, refreshed its model picker's lists from `hermes-agent.nousresearch.com`, `openrouter.ai` and `portal.nousresearch.com`, which the outgoing filter refuses, so each turn left three refusals in the filter's log. On each run, the script now sets `model_catalog.enabled: false`, `updates.check: false` and `plugins.auto_update_check_hours: 0` in the agent's `config.yaml` (`kit/hermes-lookups.mjs`), inside the blocks the file already has, and keeps every other key. Each change is printed by key name, and a second run changes nothing. Barb's limits and these settings share one YAML merge, `kit/yaml-keys.mjs`.
- 040f3f6: CircleChat host kit: each agent's file tools can write to the shared workspace. The pinned Hermes image lets `write_file` and `patch` write only under `HERMES_WRITE_SAFE_ROOT`, which it sets to the agent's home, `/opt/data`. The agent's terminal could already write to `/workspace`, but its file tools could not. Asked to build a page in the shared workspace, an agent's `write_file` calls were refused four times; it wrote the page inside its own home, reported it done, and the preview stayed blank. `setup-agent.sh` now writes `HERMES_WRITE_SAFE_ROOT=/opt/data:/workspace` to the agent's `.env` through the safe-files route, when the stack has a shared workspace. Hermes loads the `.env` over the image's setting, and a path outside both folders is still refused. A test checks the line is written once on reruns, the rest of the `.env` is kept, and a stack with no workspace gets no line.
- 011ffc2: CircleChat host kit: a rerun of `setup-host.sh`, `setup-node.sh` or `install-cluster.sh` restarts each service whose unit changes. Before, `setup-node.sh` rewrote kev-engine's systemd unit with a new `--host`, and kev-engine kept the old setting until a restart by hand.

  - **Linux and WSL:** a changed unit gets `systemctl daemon-reload` and `systemctl restart`. An unchanged unit is not written again, and the service keeps running.
  - **macOS:** an unchanged plist keeps the service running on every rerun. Before, each rerun restarted each service, changed or not.
  - **Settings files count as part of the unit.** A service's unit holds a fingerprint of the files the service reads at the start, never the files' contents. The secrets file restarts kev-engine and jobd. The kit's `package.json` restarts jobd, the token service and the cluster agent after a new release.
  - **Scheduled jobs** get the new schedule or command at the next run, and run nothing at once.

  ### Upgrading

  Rerun `setup-host.sh`, `setup-node.sh` and `install-cluster.sh` once on each computer. The first rerun adds the fingerprint to each unit that reads a settings file, so each such service restarts once.

- aa34c1d: CircleChat host kit: the smoke install clones only Border UX's CircleChat fork, `borderux/recursica-circlechat`. A failed clone now stops the smoke install, instead of falling back to the original CircleChat, which lacks the agents' network setting.
- ebcdf9a: CircleChat host kit: CircleChat's api, worker and bridge mount the shared workspace at `/workspace`, read-only, so an agent's attachment (`share_to_task`, `share_files`) and its context files (`BRIEF.md`, `knowledge/`, `projects/`) can be read. Before, `setup-host.sh` looked for `:/workspace` in `compose.agents.yml`, found CircleChat's comment that names the mount, and never added it, so every attachment failed with "not a regular file". `setup-host.sh` now writes `compose.workspace.yml` with the mount and adds it to `COMPOSE_FILE`, in every mode and every stack. It removes the read-write line an older kit added to `compose.agents.yml`. CircleChat's `project_note` action writes into `/workspace/projects` from the api, and now fails with an error.

## 0.12.0

### Minor Changes

- df1e400: CircleChat host kit: one isolated stack per client. Each client stack has its own CircleChat, Slack channel, keys, gateway and job runner, in its own Docker VM. The config check refuses a client stack that could share one of these parts.

  Secrets can live in GitHub: one environment per stack in the private repo of stacks, a `deploy-secrets` workflow, and a root-owned helper on each computer that writes each secret to the file that reads the secret. `setup-host.sh --secrets-only` recreates only the gateway and the Slack notifier after a secret changes.

### Patch Changes

- df1e400: CircleChat host kit: `setup-host.sh` now writes `COMPOSE_FILE` into `.env`, so a plain `docker compose up -d` loads the agents overlay too and agents keep installing.

## 0.11.0

### Minor Changes

- 9a0abb1: ## Porter

  Porter is a new agent. The Mantine adapter is the golden adapter. When the Mantine adapter publishes a release, Porter ports the change to the other Recursica adapters: MUI v7, Beam and Angular Material.

  - **One port per adapter.** Porter reads the release, builds a reference package for each target adapter, and sends one porter-adapter to each target. The porter-adapters run at the same time. Each porter-adapter follows `ADAPTER_AGENT_INSTRUCTIONS.md` in the `borderux/recursica` repository and opens a pull request on the target adapter.
  - **One summary.** Porter posts one summary with a pull request link for each adapter. Porter never changes the Mantine adapter and never merges.
  - **Runs in Claude Code and on CircleChat.** In a session, the user names the Mantine release to port. On CircleChat, a release watcher announces each new release once, and Porter starts from that announcement.
  - **A job runner for heavy work.** `circlechat/jobd` runs each port in a separate container with a memory cap. Each machine has a limit on how many ports run at once. Each job has a fixed type and an allowed list of repositories, so a request cannot run an arbitrary command. Secrets pass by name, and a signed message tells CircleChat when a job ends.
  - **Configured in `site.json`.** Each machine can list the jobs the machine runs. A Porter block names the release to watch, the target adapters and the person to mention with results.

  ### Upgrading

  Porter needs the CircleChat host kit. On a CircleChat host, add the jobs and Porter blocks to `site.json`, rerun `circlechat/setup-node.sh` on each machine that runs jobs, and rerun `circlechat/setup-host.sh`. Then install Porter in the CircleChat UI and run `circlechat/setup-agent.sh porter`.

- 9a0abb1: ## CircleChat host kit

  One CircleChat deployment can now run on any number of machines, set up from a single config file.

  - **One config file per deployment.** `site.json` lists the machines, what each one runs, and the model routes, with the app repository and notifications. It lives on the control machine, outside any repository, with secrets in a separate `.env`. `circlechat/site.example.json` is the template, and it holds placeholders only.
  - **Any machine can be the control machine.** A Mac or a PC of any size runs CircleChat, the agents and the model gateway. Windows runs it through WSL.
  - **Setup scripts for every machine.** `setup-host.sh` sets up the control machine: the model gateway, the Slack notifier, and services that start at boot. `setup-node.sh` sets up each other machine's own services. Both work on Linux and macOS.
  - **A model gateway with fallbacks.** Agents ask for a route by name. The gateway tries the route's models in order, and the last one is the fallback.
  - **Slack notifications.** Task changes, comments that need a person, agent posts that CircleChat rejected, and stalled tasks post to Slack.
  - **Kev failover.** Barb's first-pass reviewer, Kev, can use several engines, best first, and moves to the next when one is down.
  - **Agent setup.** Barb and Betty get the app repository from the deployment's setup. Loki gets concrete steps for each turn, pinned context sizes, and summaries that stay on his own model.

  ### Upgrading

  On a CircleChat host, copy `circlechat/site.example.json` to `site.json` on the control machine, fill it in, and run `circlechat/setup-host.sh`. Run `circlechat/setup-node.sh` on each other machine.

### Patch Changes

- 7292dd9: ## Janice joins the portable agents

  Janice reviews the research team's finished work against the agents' own session transcripts. She checks Claire, Stu and Claire's subagents, and reports each claim the evidence contradicts. Until now Janice existed only as a hand-written Buzz prompt.

  - **One source for every build.** Janice now lives in `agents/janice/`, like the other agents. The Buzz prompt is built from that source.
  - **A Claude Code build.** `portable/claude-code/agents/janice.md` runs Janice in a plain session. The user names the turn and the transcript, and Janice reports findings in the session.
  - **Read-only by design.** The Claude Code build gets Read, Grep, Glob and Bash, and no tools that write. Janice reports problems and never fixes them.
  - **Porting notes.** `agents/janice/PORTING.md` says what Janice needs: access to the transcripts, the review checklist, a signal to start, and a place to report. It also explains why there is no CircleChat build yet.
  - **Clearer wording.** Seventeen sentences used "it" or "them" without naming the noun. Each now names the noun, such as the checklist, the roster or the finding. No rule changed.
  - **Not installed automatically.** Like Claire, Stu and Loki, Janice works near client data, so `npm run agents:install` leaves her out. The README and AGENT.md say so.

  ### Upgrading

  Nothing changes for agents already installed through `npm run agents:install`. On Buzz, Janice's prompt picks up the wording fixes the next time prompts are synced. Her rules are the same.

## 0.10.0

### Minor Changes

- 91eb595: ## Recursica in Grok Build

  Recursica now installs in [Grok Build](https://x.ai/news/grok-build-cli), xAI's coding agent, as one marketplace plugin.

  ```bash
  grok plugin marketplace add borderux/recursica-knowledge
  grok plugin install recursica --trust
  ```

  The plugin holds all 66 skills, Betty the designer, Barb the design reviewer with her helpers Checker and Feisty, and two MCP servers: the Recursica knowledge server and `@recursica/mcp`. In Grok the agents carry the plugin's name, so Barb is `recursica:barb`.

  - `.grok-plugin/plugin.json` makes this repository a Grok plugin, and `.grok-plugin/marketplace.json` lists the plugin.
  - `npm run agents:build` has a new `grok` target that writes the agents to `portable/grok/agents/`. The target is opt-in, so an agent joins the public plugin only by naming `grok` in its `targets:` line.
  - A new test fails the build when a Grok agent's tool list names a tool Grok does not recognize. Grok gives such an agent every tool, so a typo in Barb's list would otherwise give the reviewer write access.

### Patch Changes

- 0107430: ## Skill versions

  Each skill now has a version that follows the skill's changes. Until now every skill stayed at 0.1.0, because changesets versions only the package.

  - **Every skill catches up for v0.9.0.** The five renamed skills move to 1.0.0. The other changed skills move up one minor version, such as 0.1.0 to 0.2.0. The new undo skill keeps 0.1.0.
  - **From now on, a script versions each skill.** `npm run skills:versions` compares each changed skill with `main` and records a major, minor or patch bump with a reason. A person checks each bump, and the release writes the new versions.
  - **Major** means a rename, a removed checklist item, or fewer rule words. **Minor** means an added checklist item, a changed description, or a changed heading, table or rule word. **Patch** means wording only.
  - CI fails when a pull request changes a skill and records no bump.

  ### Upgrading

  Anything that checks a skill's version sees the new numbers after this release. Nothing else changes.

## 0.9.0

### Minor Changes

- 43ace77: ## v0.9.0

  This release rewrites every skill a second time in plain language. It adds an undo skill and eight reference layout templates, and renames five skills. It also settles about 50 house rules that two skills used to state differently. The library now has 66 skills.

  ### Breaking: renamed skills

  Five skills are renamed so that each name says what the skill is about. Anything that loads a skill by name must use the new name. Examples are an agent prompt and a project's own notes.

  - `recursica-skill-defaults` → `recursica-skill-screen-starting-state`
  - `recursica-skill-responsive-behavior` → `recursica-skill-responsive-layout`
  - `recursica-skill-naming-terminology` → `recursica-skill-names-and-terms`
  - `recursica-skill-system-conventions` → `recursica-skill-design-system-conventions`
  - `recursica-skill-screen-scaffolding` → `recursica-skill-layouts-and-templates`

  ### New

  - **`recursica-skill-undo`** holds every undo rule in one place. The skill says when an action gets an undo instead of a confirmation, and where the undo goes. The rules used to be spread across seven skills.
  - **Layout templates.** `recursica-skill-layouts-and-templates` has eight reference layouts, each as four images: desktop, a tablet held sideways, a tablet held upright, and a phone. The templates are references, not requirements, and every region in a template still follows the region's own rules.
  - **Missing components.** The design router says what to do when the theme lacks a component. Check other names, use the code's own version, and file a defect on Theme Forge. Never build the missing component.
  - **Images from the knowledge MCP.** A served skill lists the skill's images, and a new `skill_image` tool returns one image.

  ### Writing

  - Every sentence in a skill is 20 words or fewer, and the writing check enforces the limit. `node scripts/check-writing.mjs --long <file>` lists each long sentence. Agent instructions are exempt.
  - Each rule reads the way the rule would be explained out loud: an example, then a short list.
  - Words mean one thing each. "The theme" is what a designer sets in Theme Forge, and "the code" is what the application installs. "The persona" is anyone using the software. "The user" is the person the agent works with, and stands in for the team and any approver.
  - The theme sets the breakpoint widths, the layout grid, the maximum content width and the icon set. No skill states numbers for those values.

  ### House rules settled in this release

  **Layout and navigation**

  - At the tablet breakpoint or wider, sidebars and side columns stay. Below the tablet breakpoint, navigation moves into a hamburger menu and side columns stack. A table stays only if every column fits.
  - The agent confirms with the user which devices, screen sizes and orientations the application supports.
  - A top bar holds about three or four items that will not grow. More items, or items expected to grow, get a sidebar.
  - Breadcrumbs follow the depth of the application. A shallow application has none, and a top-level page never has one.
  - Every page, panel, modal and tab gets an address whenever possible. Opening a panel or a modal adds no history entry. A confirmation gets no address.
  - The navigation drawer is not a panel.
  - A layer is a style applied to a container, and a card is a component that sits on a layer. KPI tiles and dashboard items sit in a container with a layer, not in cards.
  - Each tab may hold the tab's own complete form. One form never spreads across tabs. Switching away from a tab with unsaved changes asks first.

  **Saving, messages and undo**

  - A control outside a form saves right away. Forms keep one save mode for the whole application. Drafts save when lost work would cost real rework.
  - A toast confirms success only when the result is out of view. Different events may stack briefly, and duplicates combine.
  - The button that starts any action shows the loading state. A loading button is disabled.
  - A delete that can be undone gets an undo instead of a confirmation.

  **Controls and content**

  - A field that could hold several values shows chips, one type of value per group. A value that is only ever single is a badge. A badge never shows an error.
  - Every icon-only button gets a tooltip, including the hamburger button and a chip's remove control.
  - A checkbox starts checked only when about 90 percent of personas would choose the option. The option must also have no major later effects.
  - A switch belongs in the page's content. Chrome, filter bars and toolbars use a segmented control.
  - A field that only exists for one answer is hidden until that answer is picked. A field the persona should know about is disabled until the enabling step.
  - Every field error shows below the field and replaces the help text.
  - A date or time range is one control when both ends are required. An optional end makes the range two fields.
  - A date shows a short month, the day and a four-digit year, in the order of the persona's locale.
  - A placeholder shows a format example only when the format is required. A label has at most three words.
  - An explanation never sits on the page. The explanation goes behind a tooltip, a popover or a link to help.

  **Tables and charts**

  - Table cells are not editable, except for a small edit to one cell where a mistake costs little. An editable cell saves right away.
  - Only inset tables paginate. A full-size table loads more rows as the persona scrolls. The rows may scroll inside a table fixed in place.
  - A chart always comes from a charting library, never from components. The chart's colors come from a palette in the theme.
  - 7 ± 2 is a guideline, not a hard limit. Going well past the guideline suggests a different pattern.

  ### Upgrading

  ```bash
  git pull
  npm run agents:install
  ```

  Update any prompt or note that loads a renamed skill by the old name. On a CircleChat host, also run `circlechat/sync-skills.sh`.

  **Full changelog:** https://github.com/borderux/recursica-knowledge/compare/@recursica/knowledge@0.8.0...main

## 0.8.0

### Minor Changes

- bbafacc: ## v0.8.0

  This release adds 13 design-rules skills, four agents that design and review screens and maintain the knowledge, and a plain-language rewrite of every skill. The release covers 95 merged changes since v0.7.0.

  ### New design-rules skills

  Thirteen skills join the design rules:

  - `recursica-skill-defaults` — what a screen shows before the user touches the screen
  - `recursica-skill-feedback-messaging` — toasts, banners, success and error messages
  - `recursica-skill-filters` — filter bars, search over a list and date ranges
  - `recursica-skill-icon-semantics` — fixed icon meanings and when an icon needs a label
  - `recursica-skill-information-architecture` — the object map an app is built on, agreed before any screen
  - `recursica-skill-layers` — the numbered background levels that set component colors
  - `recursica-skill-live-regions` — what a screen reader announces when content changes
  - `recursica-skill-naming-terminology` — names and terms in an interface
  - `recursica-skill-panels-modals` — choosing between a panel, a modal and a page
  - `recursica-skill-responsive-behavior` — layouts below desktop
  - `recursica-skill-screen-priority` — ranking what matters on a screen
  - `recursica-skill-screen-scaffolding` — the header, navigation, footer and regions of a page
  - `recursica-skill-typography-semantics` — headings, emphasis and type styles

  The library now has 65 skills: 39 component skills, 23 design-rules skills, 2 psychology skills and the design router.

  ### Every skill rewritten in plain language

  - **WRITING.md** sets the rules for all text in the repository: American English, specific nouns instead of pronouns, the subject first, short sentences at a 9th-grade reading level, and designer vocabulary.
  - **Variants come from the project.** A component skill tells the agent to get the project's variants from the Recursica MCP server, because a designer can add variants in Theme Forge. A skill never says what a component lacks. Where a rule depends on an option, the skill says "If the project has X, use X. Otherwise, …".
  - **No theme details.** The theme sets sizes, spacing, borders, colors and animation, so no skill lists those properties or the tokens behind the properties. Each "Styling set by tokens" section holds one instruction: never set or override the styling.
  - **No code or library names** in any skill. Skills work the same for every adapter.
  - **Short, consistent headings** in every component skill: When to use, When not to use, Variants, Rules, Accessibility, Styling set by tokens, Related skills, Open questions and Pre-flight checklist.
  - **Decisions recorded.** House rules settled during the rewrite are in `docs/open-questions.md`. For example, a panel is never modal, a link can be the primary call to action, a field never shows success, and a table scrolls sideways only as a last resort.

  ### Agents

  - **Betty** designs and builds screens on Recursica from a product request, and opens a pull request with a live preview.
  - **Barb** reviews a screen against the skills and reports each violation with a file and line. Barb writes nothing. Checker and Feisty, two helper subagents, check each skill and test each finding.
  - **Alan** maintains the knowledge. Alan turns designer feedback and Barb's findings into pull requests against the skills.
  - **Edie** rewrites skills and agent instructions to follow WRITING.md. A read-only comparer subagent checks that no rule changed. Edie runs in Claude Code only.
  - **Kev** (`tools/kev`) gives Barb a fast first pass over a screen.
  - **Research agents** that work with client data, Claire, Stu and Loki, are now in the portable format. They run only where their data fence can be enforced.
  - Agents are defined once in `agents/<name>/` and built for Claude Code, Buzz and CircleChat.

  ### Install and update

  - **One command installs or updates the design agents in Claude Code:** `npm run agents:install`. `npm run agents:install:check` reports what is out of date.
  - **CircleChat setup scripts** install Betty, Barb and Alan on a self-hosted CircleChat.
  - **The knowledge MCP server** serves the skills to agents.

  ### Checks and tooling

  - `npm run skills:check` runs every skill check: structure, glossary definitions, shared passages, open questions, wiring to the agents, and the writing check.
  - `npm run writing:flags` lists pronouns and vague words for a person to review. In CI, each flag is a warning on the pull request.
  - `npm run skills:manifest` works out which skills apply to a screen from the components the screen imports, now including Angular component names.
  - `npm run skills:routing` scores how well a model picks the right skill from the descriptions.

  ### Safety

  - Commits, pull requests and issues are checked for client names, personal email addresses and phone numbers before the text is published.
  - A hook requires the operator's sign-off trailers on every commit an agent makes.
  - Agents that handle client data run inside a tool fence, set per agent and per community.
  - Agents cannot read source from a checkout that git does not track, or read the operator's credential store.

  ### Upgrading

  ```bash
  git pull
  npm run agents:install
  ```

  On a CircleChat host, also run `circlechat/sync-skills.sh`.

  **Full changelog:** https://github.com/borderux/recursica-knowledge/compare/@recursica/knowledge@0.7.0...main

## 0.7.0

### Minor Changes

- d9505a9: Revised skills layout

## 0.6.0

### Minor Changes

- 4827885: Updated Table description in docs

## 0.5.0

### Minor Changes

- fecda27: Added docs for missing components

## 0.4.0

### Minor Changes

- e78ec51: Added Table to component docs

## 0.3.0

### Minor Changes

- 0ebfc62: Revised layout of repo

## 0.2.0

### Minor Changes

- 407b8f0: Updated release
