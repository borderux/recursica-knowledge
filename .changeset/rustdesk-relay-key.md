---
"@recursica/knowledge": patch
---

CircleChat kit: RustDesk's relay always holds the server's key, and `hbbs` names the relay.

- **`hbbr` starts after `hbbs`, and waits for the key.** The Compose file started `hbbr` first, before `hbbs` made the key on the server's first start. `hbbr` then ran as a public relay, which any client that reaches port 21117 may use, and never read the key again. `hbbr` now starts after `hbbs`, and at every start waits until `/root/id_ed25519.pub` exists.
- **`setup-rustdesk.sh` stops the server when `hbbr`'s log says "PUBLIC RELAY MODE".**
- **`hbbs -r <Tailscale address>:21117`.** `hbbs` gives each client the relay's address, so a client no longer depends on the client's own relay setting.

### Upgrading

On the RustDesk server's computer, run `setup-node.sh <computer>` again. The setup recreates both containers, so each RustDesk session through the server ends once.
