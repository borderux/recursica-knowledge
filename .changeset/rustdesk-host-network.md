---
"@recursica/knowledge": patch
---

CircleChat kit: RustDesk Server Pro runs in the host's network, so the license survives a new container.

- **`hbbs` and `hbbr` run with `network_mode: host`.** RustDesk's license needs host networking. On Docker's own network, each new container counted as a new machine. `hbbr`'s log then said "License already in use by another machine". `hbbr` still waits for the key, and `hbbs` still names the relay with `-r`.
- **The three firewalls guard the ports.** In the host's network, each RustDesk port listens on every address. nftables, Windows Firewall and the Hyper-V firewall each refuse TCP 21114 to 21119 and UDP 21116 from every source except Tailscale and loopback.
- **The rules cover ports 21114, 21118 and 21119.** The nftables forward rule lacked 21114. Every rule lacked the web client's ports, 21118 and 21119, which `hbbs` and `hbbr` open in the host's network.
- **`setup-rustdesk.sh` refuses to start the server when the web client's ports would break direct IP access.** `hbbs` must open 21118 and `hbbr` must open 21119, and neither program can move the port. A RustDesk client's direct IP access uses 21118 by default, and WSL shares each port with Windows. The script refuses when another program holds 21118 or 21119, or when the computer's client has direct access on either port.
- **`setup-rustdesk.sh` starts the server only when all three firewalls hold the RustDesk rule.** The script checks each rule's ports, action and direction, and that the rule is on. A rule that WSL can't read counts as missing. After the start, the script checks that each port listens and that the console answers on `127.0.0.1:21114`.

### Upgrading

1. On the RustDesk server's computer, run `install-cluster.sh <computer>` for the new nftables rules.
2. On Windows, run `install-windows-guard.ps1 -RustDeskServer` in an Administrator PowerShell, for the new Windows Firewall and Hyper-V firewall rules. Until then, `setup-rustdesk.sh` refuses to start the server.
3. On the server's computer, turn off the RustDesk client's direct IP access. Or move the client's direct access port off 21118, such as to 21120. Otherwise `setup-rustdesk.sh` refuses to start the server.
4. Run `setup-node.sh <computer>` at a planned time. The setup recreates both containers, so each RustDesk session through the server ends once.
5. In RustDesk's license portal, move the license once to the server in the host's network. Then enter the license in the console again.
