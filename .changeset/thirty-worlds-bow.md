---
"@recursica/knowledge": minor
---

## Recursica in Grok Build

Recursica now installs in [Grok Build](https://x.ai/news/grok-build-cli), xAI's coding agent, as one marketplace plugin.

```bash
grok plugin marketplace add borderux/recursica-knowledge
grok plugin install recursica --trust
```

The plugin holds all 66 skills, Betty the designer, Barb the design reviewer with her helpers Checker and Feisty, and two MCP servers: the Recursica knowledge server and `@recursica/mcp`. In Grok the agents carry the plugin's name, so Barb is `recursica:barb`.

- `.grok-plugin/plugin.json` makes this repository a Grok plugin, and `.grok-plugin/marketplace.json` lists the plugin.
- `npm run agents:build` has a new `grok` target that writes the agents to `portable/grok/agents/`. The target is opt-in, so an agent joins the public plugin only by naming `grok` in its `targets:` line.
- A new test fails the build when a Grok agent's tool list names a tool Grok does not recognize. Grok gives such an agent every tool, so a typo in Barb's list would otherwise give the reviewer write access.
