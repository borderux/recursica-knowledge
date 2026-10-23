---
"@recursica/knowledge": minor
---

## The knowledge MCP server replaces `@recursica/mcp`

Betty and Barb now look up each adapter's names with the knowledge MCP server, which runs from this repository and serves this repository's skills. The old `@recursica/mcp` package is retired everywhere. That package kept a separate copy of the knowledge, which drifted from the skills. The package also recognized only the Mantine and MUI adapters, so the package found no adapter in a Beam project.

- **A command to register the server.** `npm run mcp:install` registers the knowledge server in Claude Code for every project, or for one project with `--project <dir>`. `npm run mcp:install:check` reports the server's state and changes nothing. The command works without the agents, for anyone who installs only some agents or none.
- **The agent install registers the server too.** `npm run agents:install` now runs the same step, and `agents:install:check` reports on the server. `--no-mcp` skips that step. Until now nothing registered a server on Claude Code, so Betty and Barb ran without one and no setup step said so.
- **The old server is removed.** Both commands remove a registration of `@recursica/mcp` for every project and for each folder Claude Code knows. A registration in a project's committed `.mcp.json` is reported for the team to remove, not edited. The check fails while any remain. A test fails if any file in this repository starts the old package again.
- **Betty and Barb use `component_api`.** The tool reads the adapter the project installs, so the lookup works for every adapter, Beam included. Betty's tool list also gets the knowledge server's skill tools, which her instructions already preferred over the manifest script. When the server is missing, both agents read the installed adapter's API instead.
- **The skills name the knowledge server.** The 41 skills that told agents to get the theme's variants from the Recursica MCP server now name the knowledge MCP server and the server's `component_api` tool. No rule changed; each skill gets a patch version.
- **Grok and CircleChat.** The Grok plugin starts only the knowledge server. A CircleChat host runs the knowledge server for Betty and Barb from the knowledge checkout, and no longer tracks or upgrades a version of the old package.

### Upgrading

On Claude Code, pull and run `npm run agents:install`, or `npm run mcp:install` without the agents. On a CircleChat host, rerun `circlechat/setup-host.sh`. The setup switches Betty and Barb to the knowledge server and removes the old server's files from the shared workspace.
