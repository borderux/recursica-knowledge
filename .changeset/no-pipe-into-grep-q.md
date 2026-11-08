---
"@recursica/knowledge": patch
---

CircleChat kit: no check pipes into `grep -q` anymore. `grep -q` stops reading at the first match. The program before `grep` then fails on the closed pipe, and with `pipefail` the found text counts as a failure. With `!` in front, the same failure turns into a false pass.

- **The RustDesk backup.** `backup-rustdesk.sh` failed with "the volume holds no id_ed25519" on a volume that held the key, after "tar: stdout: write error". The check of the archive and the check of the new snapshot now read each whole listing first.
- **The restore test and offboarding.** The table check of the database dump failed the same way on a dump larger than a pipe's buffer. `grep` now reads the whole dump.
- **Two false passes in the CI install.** The checks that `docker inspect` shows no cloud key and no database password passed when the text was there. Each now reads the whole output.
- **`setup-agent.sh`.** A large `SOUL.md` that already held the kit's mark could count as unmarked, and get rewritten. The config and `.env` checks had the same risk. Each now reads the text from a here-string.
- **The other checks,** in `setup-host.sh`, `setup-node.sh`, `setup-rustdesk.sh`, `hermes-turn.sh`, `disk-image.sh`, `setup-pc.sh` and `lib.sh`, read the whole output too.
- **A test,** `circlechat/kit/shell-pipes.test.mjs`, fails on a pipe into `grep -q` in any kit shell script.
