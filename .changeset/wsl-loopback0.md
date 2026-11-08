---
"@recursica/knowledge": patch
---

CircleChat kit: in WSL with mirrored networking, every kit service on `127.0.0.1` answers again. WSL sends loopback traffic through `loopback0`, by way of Windows' own loopback, so the traffic arrives on `loopback0`, not on `lo`. The nftables rules accepted loopback only on `lo`, so the rules dropped each connection to `127.0.0.1`. RustDesk's console behind `tailscale serve` answered 502. The job runner, the cluster agent and the GitHub token service missed each local request too.

- **The base rules** accept `loopback0` right after `lo`, and only from `127.0.0.0/8` and `::1`.
- **The lockdown rules** let the same loopback traffic leave on `loopback0`, and only to `127.0.0.0/8` and `::1`.
- **RustDesk's ports keep the same rules:** the console on `127.0.0.1:21114` alone, and 21115 to 21117 from Tailscale only.
- **`setup-node.sh` checks the console.** `setup-rustdesk.sh` reports success only once the console answers on `127.0.0.1:21114`. In WSL, the message names the fix.
- **A test runs packets through the rules.** The packets reach each kit service on `127.0.0.1` from `loopback0` and from `lo`. Other packets come from other sources on `loopback0`, from a claimed `127.0.0.1` on another interface, and to RustDesk's ports. The lockdown's output gets the same test.

### Upgrading

On each WSL computer, run `circlechat/cluster/install-cluster.sh <computer>` again, which loads the new rules. On the RustDesk server's computer, run `setup-node.sh <computer>` again.
