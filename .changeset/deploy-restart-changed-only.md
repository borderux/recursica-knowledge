---
"@recursica/knowledge": patch
---

CircleChat host kit: a secrets deploy restarts a service only for a changed value, and never restarts kev-engine. A deploy with "restart" on restarted every service that read a rewritten file, even when no value changed. The restart stopped kev-engine on a helper computer, though `KEV_API_KEY` kept the same value.

- **An unchanged value changes nothing.** The log says `<name> unchanged`, and no service restarts for the value.
- **Each service restarts only for a value the service reads.** jobd reads the port jobs' five secrets. Each service in site.json reads the service's `secret_env`. The cluster agent reads the bot token, the channel and the cluster token. The Slack app reads every cluster secret.
- **kev-engine never restarts from a deploy, on any computer.** When a value kev-engine reads changes, the deploy writes the value. The deploy then posts in the cluster's channel that kev-engine needs a restart by a person.
- **The log names the real result for each service.** The results are `restarted <service>`, `<service> is not installed`, `<service> failed to restart`, and a restart followed by a stop. The log printed "restarted" for a service that didn't exist. A failed restart now fails the workflow.

**Upgrade:** nothing to run. The hourly update job installs the new secrets helper on each computer once the kit has the change. Until then, run the "Deploy secrets" workflow with "restart" off on a computer that runs kev-engine.
