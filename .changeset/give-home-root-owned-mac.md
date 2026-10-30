---
"@recursica/knowledge": patch
---

CircleChat host kit: on a Mac, `give_home` no longer stops at a file in an agent's home that root owns on the Mac. Older kits copied `SOUL.md`, the skills and `knowledge-mcp` into each home with sudo, and Colima refuses to change those files, so `setup-agent.sh` failed with only `EPERM: operation not permitted, fchmod` and left the home part-changed. `give_home` now replaces each such entry with a copy it makes itself, with the same text, and sets the copy. An entry that still cannot be changed is named in the error, and every other entry is still set.
