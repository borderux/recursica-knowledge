---
"@recursica/knowledge": minor
---

CircleChat kit: a monthly restore test for the RustDesk server's backup, like the stacks' monthly restore test. On the 1st of each month, one hour after the nightly backup, root runs `circlechat/rustdesk/restore-test-rustdesk.sh`. The test restores the newest snapshot into a temp folder only root opens, then checks four facts:

- The archive holds the server's key pair, and the public key belongs to the private key.
- The archive holds the server's database, as a SQLite file.
- The restored public key matches the public key of the running server. The test compares fingerprints only.
- The newest snapshot is under 2 days old.

The test posts pass or fail in the cluster's Slack channel, with the date of the newest snapshot. The test never prints a key. The test deletes the restored files at the end, after a failure too, and only reads the backup repository.

`setup-rustdesk.sh` installs the timer, `rustdesk-restore-test`, and prints the command to run the test by hand:

```sh
sudo systemctl start rustdesk-restore-test.service && sudo journalctl -u rustdesk-restore-test -n 20
```
