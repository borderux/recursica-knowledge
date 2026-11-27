---
"@recursica/knowledge": patch
---

CircleChat host kit: a program in `recursicachat.services` may set `"health_report": true`, with `account` and `state`, to get each day's usage in its own folder and to have its note in the morning summary.

- **Samples.** Every 5 minutes, the cluster agent on the control computer records the size and the memory in use of each Docker VM in the cluster's own Colima folder, and the models Ollama holds loaded. Each sample is one JSON line in `/var/lib/agent-cluster/usage/samples-<day>.jsonl`.
- **The export.** Each hour, the updater on the control computer copies each of the last 3 finished days into `<state>/usage/<day>/`: the day's spend log lines, the day's samples, the gateway's caps with the routes and the models' settings in `limits.json`, and `done` last. The updater writes as the program's account, with folders mode 700 and files mode 600. A day with `done` is never written again.
- **The note.** The morning summary adds the program's note on yesterday from `<state>/health-note.json`, cut to 1,500 characters, with no mention or link that pings anyone. A control computer with no backup jobs posts the note alone.

Sample files and day folders are kept for 15 days. The config check refuses a `health_report` that is not `true` or `false`, and `true` without `state` or `account`. See the README's "A health report's usage export".
