# Install guide for a client's IT team

This guide installs the Recursica agent platform on a client's own computers, with no access by Border UX. The platform runs a model gateway, the job runners for port jobs, Kev and the app preview. Security services surround all of them. The kit no longer installs CircleChat 1.x, the chat server it once ran.

Border UX keeps this guide in step with the kit. A test fails when a `site.json` setting or a named file is missing from this guide.

## Requirements

- **A Linux computer or VM,** with Ubuntu 24.04 LTS, Docker Engine, Node 22 and git. A Mac with Colima also works. Kubernetes is not supported yet.
- **Memory and disk:** 64 GB of memory and 500 GB of disk for one stack, with more for local models.
- **An NVIDIA GPU (optional),** for Kev's model and local models. Without a GPU, use cloud models only.
- **A chat tool:** Slack, for alerts and approval buttons. Other chat tools are not supported yet.
- **A git host:** GitHub gets the full flow. Every other git host gets a pushed branch and a link to open the request.
- **Model access:** local open-weight models. Cloud keys are optional, from a provider the gateway supports, such as Anthropic, xAI, OpenAI, Azure or AWS Bedrock.
- **Backup storage:** any storage rclone supports, such as S3, Azure Blob Storage, Google Drive or a local disk.
- **HTTPS in front of the app preview:** Tailscale, or the client's own reverse proxy on the same computer.
- **Disk encryption:** LUKS on Linux, FileVault on a Mac, or BitLocker on Windows, set up when the computer is installed.
- **More than one stack on a computer:** each stack needs a separate Docker VM and encrypted disk image. On Linux or Windows with WSL, run `~/recursica-knowledge/circlechat/tenant/setup-pc.sh` first. WSL needs nested virtualization; see "Encrypted client stacks" in `circlechat/README.md`.

## Repos to fork

Fork each repo into the client's own git host, as a private repo:

1. **The knowledge repo** (this repo): the skills, the agents and this kit. Point `repos.knowledge` at the fork.
2. **A starter proto repo:** the template each new project starts from. Each Border UX starter carries the `recursica-starter` topic on GitHub.
3. **The Recursica adapter,** when the client changes the adapter. Each proto repo names the adapter as a dependency.

The knowledge repo uses the MIT license. A private, commercial fork is allowed, with the license notice kept.

## Settings

Copy `circlechat/site.example.json` to `~/recursica-stack/site.json`, and fill in each setting. The kit's folder in the repo keeps its old name, `circlechat/`.

| Setting                                               | What the setting sets                                                                                                                                          |
| ----------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `site.public_host`                                    | The computer's address on the tailnet, which the app preview's address uses                                                                                    |
| `site.port`, `site.preview_port`, `site.gateway_port` | CircleChat 1.x's old port, which the config check keeps apart from the others, the app preview's port, and the gateway's port for port jobs on other computers |
| `site.gateway_local_port`                             | The gateway's agents' port on `127.0.0.1`, for a RecursicaChat 2.0 server on the control computer (unset by default)                                           |
| `site.circlechat`                                     | No longer read. The config check warns while site.json sets the setting. See "CircleChat 1.x is gone" in `circlechat/README.md`                                |
| `recursicachat`, `agents.<handle>.recursicachat`      | The RecursicaChat 2.0 server, and each agent's model and monthly budget there; see "Agents on RecursicaChat 2.0" in `circlechat/README.md`                     |
| `site.tenant`, `site.kind`, `site.docker_context`     | One stack per client on a shared computer; see "Clients" in `circlechat/README.md`                                                                             |
| `nodes[].router`                                      | The router each computer's default route leads to; the network check posts in Slack when the router differs                                                    |
| `nodes[].slack_icon`                                  | An optional emoji for each computer, shown on the computer's Slack messages, such as `:desktop_computer:`                                                      |
| `site.timezone`                                       | The cluster's time zone for reboot times in Slack, such as `Europe/Berlin`; each computer's own time zone when unset                                           |
| `site.stack_name`                                     | The name of the stack with no `site.tenant`, `cluster` when unset: the stack's GitHub environment and backups                                                  |
| `site.computers`, `nodes[].limits`                    | A client or demo stack's computers: one computer or the whole cluster, and optional limits that make a computer act smaller                                    |
| `site.cloud_models`                                   | The client's permission for cloud models: who granted the permission, the date, and who pays. `stall_minutes`: a RecursicaChat task's stall, 15 minutes        |
| `site.slack_channel_id`                               | The Slack channel for the stack's alerts                                                                                                                       |
| `site.proxy`                                          | `tailscale`, or `other` for the client's own reverse proxy                                                                                                     |
| `repos.knowledge`                                     | The client's fork of the knowledge repo                                                                                                                        |
| `repos.app`, `repos.app_dir`, `repos.app_github`      | The default proto repo, which the app preview serves                                                                                                           |
| `repos.access`                                        | How agents get access to a project's repo: `service-account`, `github-app` or `admin-token`                                                                    |
| `git`                                                 | `git.host`: `github`, or `other` for any other git host                                                                                                        |
| `nodes`                                               | Each computer: name, os, address, control, and the computer's Kev's model, model servers and their models, model memory, services and job runner               |
| `nodes[].tailnet_address`                             | The control computer's Tailscale IP address, where port jobs on other computers reach the model gateway                                                        |
| `routes`                                              | Each model route: an ordered list of the cluster's models, such as `local-large` to `machine-2/ollama/large-local`                                             |
| `model_keys`                                          | Each cloud key's name, provider, cloud model and agents. The key's value lives only in the secret store                                                        |
| `agents`                                              | Each agent's routes, or one server and model, and cloud switch                                                                                                 |
| `github_apps`                                         | Each pushing agent's GitHub App: the app ID, installation ID, slug, repos and permissions (README, "GitHub access for agents")                                 |
| `site.github_token_port`                              | The GitHub token service's port, 4010 when unset, where port jobs on other computers get a push token                                                          |
| `porter`                                              | Porter's golden adapter and target adapters, only when the client ports adapters                                                                               |
| `notify`                                              | `notify.details`: `false` leaves task titles and names out of the stack's Slack posts. `slack`, `events` and `people` are no longer read                       |
| `data`                                                | `repo`: a private repo for Kev's review data, and `github_app`: the push's GitHub App (README, "Kev's review data"); leave out for a client                    |
| `backup`                                              | `backup.remote`: the rclone remote of the nightly backups. `backup.time` is no longer read                                                                     |
| `nodes[].rustdesk`                                    | The cluster's RustDesk server: its pinned image, the console's Tailscale name and the backup time (README, "The RustDesk server")                              |
| `remote_access`                                       | `remote_access.direct_ip`: `false` once every computer uses the RustDesk server, so each firewall refuses direct-address access                                |
| `security`                                            | `security.evidence_recipient`: the age public key for lockdown evidence                                                                                        |
| `egress`                                              | The outgoing filter of port jobs: `egress.allow` lists extra sites the jobs may reach                                                                          |
| `privacy`                                             | `privacy.mask_pii`: personal information masking before cloud model calls                                                                                      |
| `updates`                                             | `updates.follow`: `"releases"`, the default, or `"main"` for a kit checkout that follows main on every computer (README, "A kit that follows main")            |
| `upgrade`                                             | `upgrade.auto`: leave off, and update the forks by hand                                                                                                        |

Run `node circlechat/kit/render.mjs ~/recursica-stack/site.json /tmp/check` to check the settings before the setup.

## Secrets

Keep every key, token and password in the client's secret store, never in a repo. Two ways put the secrets on the computer:

- **GitHub environments:** see "Secrets in GitHub" in `circlechat/README.md`, with `circlechat/deploy/deploy-secrets.yml`.
- **The client's own vault,** such as HashiCorp Vault or Azure Key Vault. Install the helper with `~/recursica-knowledge/circlechat/deploy/install-secrets-helper.sh`, then pipe `NAME=value` lines from the vault into the helper:

  ```text
  vault kv get -format=json secret/agent-stack | jq -r '.data.data | to_entries[] | "\(.key)=\(.value)"' \
    | sudo /usr/local/bin/agent-stacks-apply cluster <computer> true
  ```

The secret names are in the table under "Secrets in GitHub" in `circlechat/README.md`.

## Install

1. **Clone the knowledge repo's fork** to `~/recursica-knowledge`. Root runs the scripts in `~/recursica-knowledge`, so the checkout stays outside the agents' workspace, `~/recursica-workspace`. `setup-host.sh` clones the workspace's own checkouts.
2. **Put the secrets on the computer,** as "Secrets" describes.
3. **Run the setup scripts** from `~/recursica-knowledge`, in order: `circlechat/setup-host.sh`, `circlechat/setup-node.sh <computer>`, then `circlechat/cluster/install-cluster.sh <computer>`. See "The kit checkout" in `circlechat/README.md`.
4. **Check the HTTPS address:** `setup-host.sh` runs `tailscale serve` for the app preview, tailnet only. `tailscale serve status` shows the rule. With a reverse proxy (`site.proxy` set to `other`), point the proxy at the app preview's port. See "Addresses on the tailnet" in `circlechat/README.md`.

## Security

The kit sets each of these up. Each one has a section in `circlechat/README.md`:

- **The outgoing filter:** port jobs reach only the sites on the stack's allowlist. A refused site gets an alert in Slack.
- **Privacy rules for agents:** personal information masking before each cloud model call.
- **Cloud models and the model gateway:** only the gateway holds the cloud keys. A request with no task key gets the cluster's models only.
- **Security services:** firewall rules, decoys, the lockdown and its encrypted evidence.
- **Backups:** the RecursicaChat 2.0 server's backup and the stack's own files, nightly and encrypted, with a test restore each month.
- **Updates:** security updates after a 7-day wait, and right away for actively exploited flaws.
- **Remote access:** RustDesk, only over Tailscale or the client's own VPN, with two-factor sign-in. The cluster's own RustDesk server is in the README, "The RustDesk server".

## Updates

Update the forks by hand. For the knowledge repo:

1. Add Border UX's repo as a remote once: `git remote add upstream https://github.com/borderux/recursica-knowledge`.
2. Fetch the releases: `git fetch upstream --tags`.
3. Merge the release into the fork, on a branch, and open a pull request.
4. After the merge, rerun the setup scripts from "Install", step 3.
5. On a fork off GitHub, rerun `circlechat/deploy/install-secrets-helper.sh <runner account>`, and `circlechat/tenant/setup-pc.sh` on Linux or WSL. On a fork on GitHub, the hourly update job replaces the root-owned helpers from the fork's verified commits.

**The update job checks each kit commit against the fork's repo on GitHub.** `install-cluster.sh` writes the fork's repo to `/etc/agent-cluster.conf` as root, from `repos.knowledge` in site.json. After a change to `repos.knowledge`, rerun `install-cluster.sh` on each computer. The kit checkout's `origin` must name the same repo. Any other `origin` stops the update job's kit steps, and the cluster's channel gets one alert. See "The kit's repo" in `circlechat/README.md`.

A release with a new first number (a major version) can change settings. Read the release notes first.

## Move a trial into the client's own install

A trial on Border UX's cluster ends with an encrypted archive of the trial's stack. The archive holds the stack's `site.json` and the agents' workspace, with every `.env` file left out. Border UX sends the archive folder and, separately, the archive key.

1. Follow "Install", steps 1 and 2: clone the fork, and put the secrets on the computer.
2. Restore the archive with restic, using the archive key: `restic -r <archive folder> restore latest --target /tmp/trial`.
3. Copy the trial's `site.json` to `~/recursica-stack/site.json`, and change each setting the client's install needs.
4. Copy the trial's workspace into `~/recursica-workspace`.
5. Run the setup scripts, as "Install", step 3 describes.
6. Delete `/tmp/trial`, and keep the archive key in the client's own secret store.

## Support

Border UX gives support without access to the client's computers. Run `circlechat/kit/diagnostics.sh`, read the bundle it writes, then send the bundle to Border UX. The script replaces keys, tokens, passwords and email addresses with `[removed]`, and reads no client data.
