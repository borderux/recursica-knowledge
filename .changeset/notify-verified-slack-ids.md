---
"@recursica/knowledge": minor
---

CircleChat host kit: a mention DM goes to the Slack ID each person verified in CircleChat. The notifier sends the codes of CircleChat's Slack ID check. The notifier signs in to the database as `cc_notify`, a role made for the notifier.

- **A verified Slack ID wins.** The notifier reads each person's verified ID from CircleChat. `notify.people` stays as a fallback during the switch, and the config check prints a warning for the list, never an error. A later kit release removes `notify.people`.
- **The notifier sends the codes.** For each request, the notifier makes a 6-digit code and writes only the code's salt and hash. The notifier sends the code to the Slack ID as a DM. The code itself is never stored or logged. CircleChat holds no Slack token.
- **A database role, `cc_notify`.** The notifier no longer signs in as the database's owner. The role reads only the columns the notifier reads, and writes only the code columns of `user_slack`, never a Slack ID.
- **No database password in `docker inspect`.** The notifier reads the role's address from an owner-only file in `$CC_DIR/notify-state`, outside the backup.
- **A CircleChat without the Slack ID check** keeps working. The notifier then uses `notify.people` only.

### Upgrading

1. Update CircleChat to a release with the Slack ID check (`docs/slack-dms.md` in CircleChat). An older CircleChat keeps working, with `notify.people` only.
2. Rerun `setup-host.sh`. The setup makes the `cc_notify` role and restarts the notifier with the role.
3. Ask each person to verify the person's Slack ID in CircleChat, under Settings → Profile.
4. Keep `notify.people` until each person on the list has a verified ID. A later kit release removes the list.
