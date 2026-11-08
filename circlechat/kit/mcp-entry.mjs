#!/usr/bin/env node
// One MCP server's entry in an agent's config.yaml (gateway/hermes-access.mjs setMcpServer). Reads
// the config's text on stdin and prints the new text, so the caller reads and writes the file
// through kit/safe-files.mjs, which never follows a symlink. setup-agent.sh runs this for the
// knowledge server and for CircleChat's own server.
//
//   node mcp-entry.mjs [--loaded] [--env NAME=VALUE]... [--include TOOL]... <server name> <timeout> <command> [arg ...] < config.yaml
//
// --env sets one variable in the server's environment; a value such as ${CC_BOT_TOKEN} stays as
// written, and Hermes fills it in when it starts the server. --include names one tool Hermes takes
// from the server; with no --include, Hermes takes every tool. --loaded keeps the server's tools in
// the tool list the model sees, never behind Hermes's tool_search (setMcpServer).
//
// Exit: 0 with the new text, 1 when the config cannot take the entry, 2 on usage.
import fs from "node:fs";
import { setMcpServer } from "../gateway/hermes-access.mjs";

const USAGE = "usage: mcp-entry.mjs [--loaded] [--env NAME=VALUE]... [--include TOOL]... <server name> <timeout> <command> [arg ...] < config.yaml";
const rest = process.argv.slice(2);
const env = {}, include = [];
let loaded = false;
while (rest[0] === "--env" || rest[0] === "--include" || rest[0] === "--loaded") {
  if (rest[0] === "--loaded") { rest.shift(); loaded = true; continue; }
  const [flag, value] = rest.splice(0, 2);
  if (value === undefined) { console.error(USAGE); process.exit(2); }
  if (flag === "--include") { include.push(value); continue; }
  const eq = value.indexOf("=");
  if (eq < 1) { console.error(USAGE); process.exit(2); }
  env[value.slice(0, eq)] = value.slice(eq + 1);
}
const [name, timeout, command, ...args] = rest;
if (!name || !/^\d+$/.test(timeout ?? "") || !command) {
  console.error(USAGE);
  process.exit(2);
}
try {
  process.stdout.write(setMcpServer(fs.readFileSync(0, "utf8"), name, { command, args, timeout: Number(timeout), env, include, loaded }));
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
