---
"@recursica/knowledge": patch
---

CircleChat host kit: a rerun of `setup-host.sh`, `setup-node.sh` or `install-cluster.sh` restarts each service whose unit changes. Before, `setup-node.sh` rewrote kev-engine's systemd unit with a new `--host`, and kev-engine kept the old setting until a restart by hand.

- **Linux and WSL:** a changed unit gets `systemctl daemon-reload` and `systemctl restart`. An unchanged unit is not written again, and the service keeps running.
- **macOS:** an unchanged plist keeps the service running on every rerun. Before, each rerun restarted each service, changed or not.
- **Settings files count as part of the unit.** A service's unit holds a fingerprint of the files the service reads at the start, never the files' contents. The secrets file restarts kev-engine and jobd. The kit's `package.json` restarts jobd, the token service and the cluster agent after a new release.
- **Scheduled jobs** get the new schedule or command at the next run, and run nothing at once.

### Upgrading

Rerun `setup-host.sh`, `setup-node.sh` and `install-cluster.sh` once on each computer. The first rerun adds the fingerprint to each unit that reads a settings file, so each such service restarts once.
