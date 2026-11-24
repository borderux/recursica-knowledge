---
"@recursica/knowledge": minor
---

CircleChat kit: with `updates.follow` set to `"main"`, the update job restarts each kit service whose own code changed since the service started. Before, a running service kept the service's old code after a fast-forward. Only a setup or a reboot restarted the service.

- **A service's own code** is the service's entry file and each file the entry imports. The job compares each file's change time with the service's start time.
- **At once:** the cluster agent, which runs the network check, the cluster's Slack app, jobd and the GitHub token service.
- **When RecursicaChat is quiet:** the model gateway and LiteLLM. kev-engine runs from the engine's own checkout, so a kit change never restarts kev-engine.
- **The model gateway** runs a copy of the router's files. When the copy differs from the kit's files, the job copies the files again and restarts the gateway.
- **One post per restart** in the cluster's channel, with the service and the kit's commit.

The job never restarts RecursicaChat this way, and never runs a setup this way. A service whose code didn't change never restarts.
