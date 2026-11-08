---
"@recursica/knowledge": patch
---

CircleChat kit: RustDesk Server Pro runs in the host's network, so the license survives a new container.

- **`hbbs` and `hbbr` run with `network_mode: host`.** RustDesk's license needs host networking. On Docker's own network, each new container counted as a new machine. `hbbr`'s log then said "License already in use by another machine". `hbbr` still waits for the key, and `hbbs` still names the relay with `-r`.
- **The three firewalls guard the ports.** In the host's network, each RustDesk port listens on every address. nftables, Windows Firewall and the Hyper-V firewall each refuse ports 21114 to 21117 from every source except Tailscale and loopback. The nftables forward rule now covers port 21114 too.
- **`setup-rustdesk.sh` starts the server only when all three firewalls hold the RustDesk rule.** The script checks each rule's ports, action and direction, and that the rule is on. A rule that WSL can't read counts as missing. After the start, the script checks that each port listens and that the console answers on `127.0.0.1:21114`.

### Upgrading

1. On the RustDesk server's computer, run `install-cluster.sh <computer>` for the new forward rule.
2. Run `setup-node.sh <computer>` at a planned time. The setup recreates both containers, so each RustDesk session through the server ends once.
3. In RustDesk's license portal, move the license once to the server in the host's network. Then enter the license in the console again.
