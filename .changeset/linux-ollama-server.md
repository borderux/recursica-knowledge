---
"@recursica/knowledge": minor
---

CircleChat kit: `setup-node.sh` installs and runs Ollama on a Linux helper computer, from a server of kind `ollama` in site.json. Before, the kit ran Ollama only on a Mac control computer.

- **The pinned release.** The script downloads Ollama 0.40.15 and checks the archive's SHA-256 against the hash in `kit/ollama.mjs` before unpacking the archive. Version 0.40.15 supports NVIDIA's GeForce RTX 50 series (Blackwell).
- **The account.** A system account, `recursica-ollama`, has no login shell. Only the account can write the models folder, `/var/lib/recursica-ollama`.
- **The service.** The systemd service `recursica-ollama` runs Ollama as the account, with the address and settings from site.json.
- **The models.** The script pulls each model site.json lists, and removes no model.

A new server setting, `listen`, takes `"127.0.0.1"` for a trial, or the computer's address once the gateway uses the server. The gateway leaves out a trial server. The config check refuses a route or an agent that names a trial server's model. Two new Ollama settings, `kv_cache_type` and `max_loaded_models`, apply on a Mac control computer too. A compressed working memory turns on Ollama's flash attention.

The script stops beside another Ollama on the computer, such as an `ollama.service` from Ollama's own installer.
