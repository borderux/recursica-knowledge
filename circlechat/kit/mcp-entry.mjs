#!/usr/bin/env node
// One MCP server's entry in an agent's config.yaml (gateway/hermes-access.mjs setMcpServer). Reads
// the config's text on stdin and prints the new text, so the caller reads and writes the file
// through kit/safe-files.mjs, which never follows a symlink. setup-agent.sh runs this for the
// knowledge server.
//
//   node mcp-entry.mjs <server name> <timeout> <command> [arg ...] < config.yaml
//
// Exit: 0 with the new text, 1 when the config cannot take the entry, 2 on usage.
import fs from "node:fs";
import { setMcpServer } from "../gateway/hermes-access.mjs";

const [name, timeout, command, ...args] = process.argv.slice(2);
if (!name || !/^\d+$/.test(timeout ?? "") || !command) {
  console.error("usage: mcp-entry.mjs <server name> <timeout> <command> [arg ...] < config.yaml");
  process.exit(2);
}
try {
  process.stdout.write(setMcpServer(fs.readFileSync(0, "utf8"), name, { command, args, timeout: Number(timeout) }));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
