---
"@recursica/knowledge": patch
---

CircleChat host kit: `setup-host.sh` now writes `COMPOSE_FILE` into `.env`, so a plain `docker compose up -d` loads the agents overlay too and agents keep installing.
