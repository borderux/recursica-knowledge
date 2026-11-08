---
"@recursica/knowledge": minor
---

CircleChat host kit: `setup-agent.sh` registers CircleChat's own MCP server, the `circlechat-mcp.mjs` CircleChat puts in each agent's home, in the agent's Hermes settings, for every agent but Loki. Commenting on a task (`task_comment`) and moving a task (`update_task`) become tool calls the agent makes mid-turn.

- The entry takes only those two tools. Each sends one action to CircleChat's `/agent-api/act`, which runs the same executor and checks as an action in the agent's reply, so a tool call can do nothing the agent's actions cannot. Every other tool stays off, `upload_file` included, which uploads any file in the container and skips those checks.
- The server signs each call with the agent's own bot token. The entry names `${CC_BOT_TOKEN}`, which Hermes fills in from the token CircleChat hands the agent's container, so no token is written in the home. The entry replaces the one CircleChat writes with `CC_MCP_TOOLS=on`, which holds the token in its arguments.
- The config is read and written through `kit/safe-files.mjs`, and a symlinked `circlechat-mcp.mjs` stops the setup. A home without the file gets no entry, and the setup says so.

`kit/mcp-entry.mjs` takes `--env NAME=VALUE` and `--include TOOL`, and `setMcpServer` writes a server's `env` and `tools.include`, refusing a name that could break the YAML.
