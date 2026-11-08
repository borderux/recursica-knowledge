---
"@recursica/knowledge": patch
---

CircleChat kit: RustDesk Server Pro runs in the host's network, so the license survives a new container.

- **`hbbs` and `hbbr` run with `network_mode: host`.** RustDesk's license needs host networking. On Docker's own network, each new container counted as a new machine. `hbbr`'s log then said "License already in use by another machine". `hbbr` still waits for the key, and `hbbs` still names the relay with `-r`.
- **The three firewalls guard the ports.** In the host's network, each RustDesk port listens on every address. nftables, Windows Firewall and the Hyper-V firewall each refuse TCP 21114 to 21119 and UDP 21116 from every source except Tailscale and loopback.
- **The rules cover ports 21114, 21118 and 21119.** The nftables forward rule lacked 21114. Every rule lacked the web client's ports, 21118 and 21119, which `hbbs` and `hbbr` open in the host's network.
- **`setup-rustdesk.sh` starts the server only when all three firewalls hold the RustDesk rule.** The script checks each rule's ports, action and direction, and that the rule is on. A rule that WSL can't read counts as missing. After the start, the script checks that each port listens and that the console answers on `127.0.0.1:21114`.

### Upgrading

1. On the RustDesk server's computer, run `install-cluster.sh <computer>` for the new nftables rules.
2. On Windows, run `install-windows-guard.ps1 -RustDeskServer` in an Administrator PowerShell, for the new Windows Firewall and Hyper-V firewall rules. Until then, `setup-rustdesk.sh` refuses to start the server.
3. Run `setup-node.sh <computer>` at a planned time. The setup recreates both containers, so each RustDesk session through the server ends once.
4. In RustDesk's license portal, move the license once to the server in the host's network. Then enter the license in the console again.
