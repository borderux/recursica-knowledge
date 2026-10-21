# Install guide for a client's IT team

This guide installs the Recursica agent platform on a client's own computers, with no access by Border UX. The platform runs CircleChat (chat, tasks and agent turns), the Recursica agents and a model gateway. Security services surround all three.

Border UX keeps this guide in step with the kit. A test fails when a `site.json` setting or a named file is missing from this guide.

## Requirements

- **A Linux computer or VM,** with Ubuntu 24.04 LTS, Docker Engine with the Compose plugin, Node 22 and git. A Mac with Colima also works. Kubernetes is not supported yet.
- **Memory and disk:** 64 GB of memory and 500 GB of disk for one stack, with more for local models.
- **An NVIDIA GPU (optional),** for Kev's model and local models. Without a GPU, use cloud models only.
- **A chat tool:** Slack, for alerts and approval buttons. Other chat tools are not supported yet.
- **A git host:** GitHub gets the full flow. Every other git host gets a pushed branch and a link to open the request.
- **Model access:** Claude through Anthropic, AWS Bedrock, Google Vertex AI or Azure, or local open-weight models only.
- **Backup storage:** any storage rclone supports, such as S3, Azure Blob Storage, Google Drive or a local disk.
- **HTTPS in front of CircleChat:** Tailscale, or the client's own reverse proxy on the same computer.
- **Disk encryption:** LUKS on Linux, FileVault on a Mac, or BitLocker on Windows, set up when the computer is installed.

## Repos to fork

Fork each repo into the client's own git host, as a private repo:

1. **The knowledge repo** (this repo): the skills, the agents and this kit. Point `repos.knowledge` at the fork.
2. **A starter proto repo:** the template each new project starts from. Each Border UX starter carries the `recursica-starter` topic on GitHub.
3. **The Recursica adapter,** when the client changes the adapter. Each proto repo names the adapter as a dependency.
4. **CircleChat:** from `https://github.com/borderux/circlechat`, branch `border/local-fixes`, which carries the outgoing filter.

The knowledge repo and CircleChat both use the MIT license. A private, commercial fork is allowed, with each license notice kept.

## Settings

Copy `circlechat/site.example.json` to `~/circlechat/site.json`, and fill in each setting.

| Setting                                               | What the setting sets                                                                                            |
| ----------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------- |
| `site.public_host`                                    | The address people use for CircleChat                                                                            |
| `site.port`, `site.preview_port`, `site.gateway_port` | CircleChat's, the app preview's and the model gateway's ports on the computer                                    |
| `site.tenant`, `site.kind`, `site.docker_context`     | One stack per client on a shared computer; see "Clients" in `circlechat/README.md`                               |
| `site.cloud_models`                                   | The client's permission for cloud models: who granted the permission, the date, and who pays                     |
| `site.slack_channel_id`                               | The Slack channel for the stack's alerts                                                                         |
| `site.proxy`                                          | `tailscale`, or `other` for the client's own reverse proxy                                                       |
| `repos.knowledge`                                     | The client's fork of the knowledge repo                                                                          |
| `repos.app`, `repos.app_dir`, `repos.app_github`      | The default proto repo Betty builds in                                                                           |
| `repos.access`                                        | How agents get access to a project's repo: `service-account`, `github-app` or `admin-token`                      |
| `git`                                                 | `git.host`: `github`, or `other` for any other git host                                                          |
| `nodes`                                               | Each computer: name, os, address, control, and the computer's Kev's model, local models, services and job runner |
| `routes`                                              | Each model route, such as `claude-sonnet` to `anthropic/claude-sonnet-5-5` or `bedrock/...`                      |
| `porter`                                              | Porter's golden adapter and target adapters, only when the client ports adapters                                 |
| `notify`                                              | Slack alerts for task changes                                                                                    |
| `data`                                                | Kev's disagreement log; leave out for a client                                                                   |
| `backup`                                              | The rclone remote and the time of the nightly backup                                                             |
| `security`                                            | `security.evidence_recipient`: the age public key for lockdown evidence                                          |
| `egress`                                              | The outgoing filter: `egress.allow` lists extra sites the agents may reach                                       |
| `privacy`                                             | `privacy.mask_pii`: personal information masking before cloud model calls                                        |
| `upgrade`                                             | `upgrade.auto`: leave off, and update the forks by hand                                                          |

Run `node circlechat/kit/render.mjs ~/circlechat/site.json /tmp/check` to check the settings before the setup.

## Secrets

Keep every key, token and password in the client's secret store, never in a repo. Two ways put the secrets on the computer:

- **GitHub environments:** see "Secrets in GitHub" in `circlechat/README.md`, with `circlechat/secrets/deploy-secrets.yml`.
- **The client's own vault,** such as HashiCorp Vault or Azure Key Vault. Install the helper with `circlechat/secrets/install-secrets-helper.sh`, then pipe `NAME=value` lines from the vault into the helper:

  ```text
  vault kv get -format=json secret/agent-stack | jq -r '.data.data | to_entries[] | "\(.key)=\(.value)"' \
    | sudo /usr/local/bin/agent-stacks-apply border <computer> true
  ```

The secret names are in the table under "Secrets in GitHub" in `circlechat/README.md`.

## Install

1. **Clone the forks:** CircleChat to `~/circlechat`, and the knowledge repo to `~/circlechat-workspace/recursica-knowledge`.
2. **Put the secrets on the computer,** as "Secrets" describes.
3. **Run the setup scripts,** from the knowledge repo, in order: `circlechat/setup-host.sh`, `circlechat/setup-node.sh <computer>`, then `circlechat/cluster/install-cluster.sh <computer>`.
4. **Point HTTPS at CircleChat:** run the `tailscale serve` line the setup prints. With a reverse proxy, point the proxy at CircleChat's port.
5. **Turn on single sign-on:** CircleChat supports OpenID Connect providers, such as Okta and Entra ID, in each workspace's enterprise settings.
6. **Install the agents** in CircleChat, then run `circlechat/setup-agent.sh <handle>` for each agent, and `circlechat/sync-skills.sh` once.

## Security

The kit sets each of these up. Each one has a section in `circlechat/README.md`:

- **The outgoing filter:** agents reach only the sites on the stack's allowlist. A refused site asks an approver in Slack.
- **Privacy rules for agents:** personal information masking and CircleChat's approval gate. Alan's pull requests go only to the client's own knowledge fork.
- **Security services:** firewall rules, decoys, the lockdown and its encrypted evidence.
- **Backups:** nightly and encrypted, with a test restore each quarter.
- **Updates:** security updates after a 7-day wait, and right away for actively exploited flaws.

## Working with Betty

At the start of a project, Betty offers the starters tagged `recursica-starter` that the stack can see, plus "my own repository". The user creates the project's repo and gives the stack's service account access, as `repos.access` sets. Commits made while a person works with Betty carry the person's name, with Betty as co-author.

## Updates

Update the forks by hand. For the knowledge repo:

1. Add Border UX's repo as a remote once: `git remote add upstream https://github.com/borderux/recursica-knowledge`.
2. Fetch the releases: `git fetch upstream --tags`.
3. Merge the release into the fork, on a branch, and open a pull request.
4. After the merge, rerun the setup scripts from "Install", step 3.

A release with a new first number (a major version) can change settings. Read the release notes first.

## Support

Border UX gives support without access to the client's computers. Run `circlechat/kit/diagnostics.sh`, read the bundle it writes, then send the bundle to Border UX. The script replaces keys, tokens, passwords and email addresses with `[removed]`, and reads no client data.
