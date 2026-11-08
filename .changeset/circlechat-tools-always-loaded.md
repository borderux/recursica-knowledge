---
"@recursica/knowledge": patch
---

CircleChat host kit: CircleChat's three tools, `task_comment`, `update_task` and `share_to_task`, are always in the tool list an agent's model sees. Hermes 0.23 puts every MCP tool behind its `tool_search` bridge while tool search is on, and has no setting that keeps one server out of it. In one turn Betty never searched for `update_task` and called `delegate_task` eight times to move her card.

- `setup-agent.sh` registers CircleChat's server with `kit/mcp-entry.mjs --loaded`, which sets `tools.tool_search.enabled: "off"` in the agent's Hermes settings and keeps every other `tools` setting. Every tool of the agent is then listed, the knowledge server's included. The knowledge server's entry alone changes nothing about tool search.
- Betty's CircleChat persona says to report with the `task_comment` tool and move the card with the `update_task` tool, never `delegate_task`.
