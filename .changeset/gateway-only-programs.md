---
"@recursica/knowledge": minor
---

A program that only asks models, such as an eval, gets a gateway key of its own without a service on the RecursicaChat 2.0 server.

- **A `recursicachat.services` entry with a gateway block and no `agents`** drives no agent. The config check takes it, and an entry with neither agents nor a gateway block is still refused.
- **`rc-service.sh` gives such an entry only its gateway key,** in the entry's `file` itself: the entry's account's own, mode 400, in a folder that belongs to root, checked on the gateway as for any service key. The server gets no service, no token and no driven agent for it.
- The gateway gives it the handle `svc-<name>`, with its routes, its two caps and any `kev` computers, as for any program.
- **Removing the entry and rerunning `setup-host.sh` makes the gateway refuse its key.** No other entry's key or token changes.
