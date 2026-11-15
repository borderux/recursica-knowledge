---
"@recursica/knowledge": patch
---

CircleChat host kit: no value in site.json runs as a shell command during setup. The kit's scripts loaded `app.env`, `porter.env` and `tenant.env` as shell commands. A value with `$(…)`, a backtick or a `;` ran on the computer, such as a `porter.owner` in `setup-node.sh`.

- **The scripts read each file without running a value.** A new reader, `circlechat/kit/env-file.sh`, sets each `KEY=value` line's variable to the value as plain text. Every script that loaded the files now uses the reader.
- **render.mjs refuses a value with a line break.** A line break would add a line of its own, with a setting of its own. The config check names the setting.
- **A cloud approver's email takes letters, digits and `. _ % + -` only,** as `notify.people` and `site.check_account` do.

The files keep the same `KEY=value` lines, so each program that reads the files as text works as before.

### Upgrading

1. Check that each email in `cloud_approvers` and `site.check_account` uses only letters, digits and `. _ % + -`. The config check refuses any other character.
2. Rerun `setup-host.sh` and `setup-node.sh`.
