---
"@recursica/knowledge": minor
---

The knowledge MCP server becomes the one way agents and programs read the skills, as a service on the cluster's control computer.

- **`tools/knowledge-mcp/server.mjs --http`:** MCP Streamable HTTP at `http://127.0.0.1:<port>/mcp`, stateless, on loopback only, with a key for each caller. The server keeps only each key's hash, logs each call's caller and never a key, and answers 401 to a request with no known key. stdio mode stays for a person's Claude Code.
- **Every answer names the knowledge commit:** `structuredContent.commit`, and the text ends with `knowledge commit: <commit>`. Each call is answered from one commit: the server resolves `KNOWLEDGE_ROOT` once at the start of each call, so the hourly switch needs no restart.
- **Callers send contents, never paths:** `skills_for_screen` takes `sources`, and `component_api` takes `packages`. The old `files` and `project_root` inputs stay for stdio only.
- **New tools:** `skill_text`, `agent_prompt` (only `barb`, `betty`, `checker` and `feisty`) and `knowledge_info`.
- **The manifest script takes contents** (`manifestSources`), and follows a local import of a `.tsx` file, which it missed before.
- **Kev reads the skills through the server** (`KNOWLEDGE_MCP_URL`, `KNOWLEDGE_MCP_KEY_FILE`), not `KNOWLEDGE_DIR`, and reports the commit. A run whose answers name two commits reads everything again once; a second switch fails the run.
- **The kit:** site.json's `knowledge` block (`port`, `callers`). `setup-host.sh` runs `circlechat/knowledge-mcp.sh`: two system accounts, the first export, a key per caller, and the `knowledge-mcp` service, read-only, on loopback. The hourly update job exports each new verified commit on main as the export account, installs Kev's packages with `npm ci --omit=dev --ignore-scripts`, and switches `current` in one step, keeping the three newest exports. The agent sync registers the server on RecursicaChat for the agents the `recursicachat` caller lists, and grants it to them.
- **The workspace's knowledge clone is gone:** `setup-host.sh` no longer clones `~/recursica-workspace/recursica-knowledge` or copies Kev into the workspace. `circlechat/README.md` says how to remove the old folders.
