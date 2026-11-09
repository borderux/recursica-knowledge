---
"@recursica/knowledge": patch
---

CircleChat kit: `setup-rustdesk.sh` no longer refuses a RustDesk server whose firewall rules are in place.

- **The nftables check compares each set by the set's members.** nft prints the IPv6 rule's set as `{ ::1, fd7a:115c:a1e0::/48 }`, and the check expected `{ fd7a:115c:a1e0::/48, ::1 }`. A set with a missing, extra or changed member still fails the check.
- **The check names a firewall only when that firewall's rules can't be read.** The setup printed "WSL could not read the rules" after any firewall problem. Each PowerShell command now prints "end" last, and any error stops the command before "end". The check then tells a failed read from a missing rule.
- **Neither Windows read needs admin rights.** `Get-NetFirewallRule` and `Get-NetFirewallHyperVRule` both list the RustDesk rules from WSL as the signed-in user.

### Upgrading

Run `setup-node.sh <computer>` on the RustDesk server's computer at a planned time. The setup recreates both containers, so each RustDesk session through the server ends once.
