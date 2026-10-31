---
"@recursica/knowledge": patch
---

CircleChat host kit: CircleChat's api, worker and bridge mount the shared workspace at `/workspace`, read-only, so an agent's attachment (`share_to_task`, `share_files`) and its context files (`BRIEF.md`, `knowledge/`, `projects/`) can be read. Before, `setup-host.sh` looked for `:/workspace` in `compose.agents.yml`, found CircleChat's comment that names the mount, and never added it, so every attachment failed with "not a regular file". `setup-host.sh` now writes `compose.workspace.yml` with the mount and adds it to `COMPOSE_FILE`, in every mode and every stack. It removes the read-write line an older kit added to `compose.agents.yml`. CircleChat's `project_note` action writes into `/workspace/projects` from the api, and now fails with an error.
