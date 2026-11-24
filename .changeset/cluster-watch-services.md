---
"@recursica/knowledge": minor
---

CircleChat kit: the cluster agents watch each computer's kit services, and each other at each computer's Tailscale address.

- **Each computer watches every other computer.** Each agent asks every other computer's agent at that computer's Tailscale address, `tailnet_address` or `address` in site.json. Before, a helper asked the control computer at `host.docker.internal`, which only the control computer's containers resolve. So no helper watched the control computer. A computer silent for 3 minutes posts in the cluster's channel, and again when the computer answers.
- **Kit services in each report.** Each agent's `/status` lists the state of the computer's kit services. The services are kev-engine, jobd and the RustDesk server's two containers. An Ollama server joins once a route names one of the server's models. A watching computer posts when a service has been down for 3 minutes, and again when the service answers. The report holds names and states only.
- **Restarts.** A kit service or container that restarts more than 3 times in an hour gets one post in the cluster's channel.
- **No error each minute on a helper.** The egress step reads only the filter logs that exist, so a helper with no stack folder logs no error. A test now covers the step.

The config check warns about a computer no other agent can reach. `install-cluster.sh` writes the agents' Tailscale addresses too. A running agent picks up the change when the agent restarts, with `install-cluster.sh` or a kit release.
