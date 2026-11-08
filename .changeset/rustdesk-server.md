---
"@recursica/knowledge": minor
---

CircleChat host kit: the cluster can run RustDesk Server Pro on one Linux computer, or on Windows in WSL with mirrored networking, reachable only over Tailscale. A `rustdesk` block on the computer's node in site.json names the image, pinned by digest, the console's Tailscale name, and the backup time. The config check refuses the block on a Mac, where Colima cannot publish UDP port 21116 on the Tailscale address alone. It also refuses an image without a digest, an address that is not a Tailscale IPv4 address, a client or demo stack, and a site.json without `backup.remote`.

`setup-node.sh` runs `circlechat/rustdesk/setup-rustdesk.sh` for the node. The script starts nothing when:

- WSL networking is not mirrored;
- the nftables, Windows Firewall or Hyper-V rules for RustDesk are missing;
- the node's address is not the computer's Tailscale address;
- the backup's secret is missing.

It starts `hbbs` and `hbbr` in Docker, with ports 21115 to 21117 on the Tailscale address only and the console on `127.0.0.1` only. It stops the server when a RustDesk port listens anywhere else, or answers on another address of the computer. It gives the console HTTPS on port 443 with `tailscale serve`, and stops when Funnel serves the port. It installs a nightly backup of the server's volume, which holds its key, database and license. The backup is encrypted with a new secret of its own, `RUSTDESK_RESTIC_PASSWORD`, and checks that the copy holds the key.

The firewall rules on Linux and in WSL refuse RustDesk's server ports from everything but Tailscale and the computer itself, Docker's internal networks included. `install-windows-guard.ps1 -RustDeskServer` adds Windows Firewall and Hyper-V block rules for the same ports from every address outside Tailscale and loopback. With `remote_access.direct_ip` set to `false`, every firewall refuses RustDesk's direct-address ports, 21118 and 21119: nftables and pf through `install-cluster.sh`, and Windows through `install-windows-guard.ps1 -BlockRustDeskDirect`. `circlechat/rustdesk/tailnet-policy.example.hujson` holds the Tailscale access rules to add by hand. The README's "The RustDesk server" gives the steps in order.
