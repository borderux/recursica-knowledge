---
"@recursica/knowledge": minor
---

## CircleChat host kit

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
