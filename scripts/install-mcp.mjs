#!/usr/bin/env node
/**
 * Register the Recursica knowledge MCP server in Claude Code, and retire the old one.
 *
 * Betty and Barb look up the adapter's name for each design-system name with the knowledge
 * server's `component_api` tool, and Betty loads skill families with its other tools.
 * `agents:install` only ever installed the agent files, so on a clean machine the tools did not
 * exist and nothing in the setup steps said so. The Grok plugin starts the server for its agents;
 * Claude Code had nothing that did.
 *
 * `agents:install` now calls this for every project on the machine. It also runs on its own,
 * because a person can install only some of the agents, or none of them, and still want the
 * server.
 *
 * The server runs from this checkout and serves the skills in it, so it is current whenever this
 * checkout is, the same way a linked agent is. Its `component_api` tool takes the project's folder
 * as an argument, so the folder Claude Code starts in does not matter.
 *
 * The old server, the `@recursica/mcp` package registered as `recursica-mcp`, kept its own copy
 * of the knowledge and recognized only two adapters. An install removes it wherever it is
 * registered, and `--check` fails while it is.
 *
 * Registration goes through the `claude mcp` command, never by editing Claude Code's own config
 * files. Reading those files is how `--check` sees what is registered without starting anything.
 *
 * Usage:
 *   npm run mcp:install                         every project on this machine
 *   npm run mcp:install -- --project <dir>      one project, for this user only
 *   npm run mcp:install -- --check [--project <dir>]
 *                                               report, change nothing; exit 1 if the server is
 *                                               missing or runs from another checkout, or the old
 *                                               server is still registered
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const SERVER = "recursica-knowledge";
export const SERVER_FILE = path.join(
  ROOT,
  "nest",
  "mcp",
  "knowledge",
  "server.mjs",
);
const SERVER_TAIL = path.join("nest", "mcp", "knowledge", "server.mjs");

/** The retired server: its registered name, and the package it ran. */
export const RETIRED = { name: "recursica-mcp", package: "@recursica/mcp" };

/** Claude Code's scope names, in the order Claude Code prefers one over another. */
export const PRECEDENCE = ["local", "project", "user"];

export const addArgs = (scope, file = SERVER_FILE) => [
  "mcp",
  "add",
  "--scope",
  scope,
  SERVER,
  "--",
  "node",
  file,
];

/**
 * Every registration of `name` that Claude Code would see in `dir`, highest precedence first.
 * `claudeJson` is ~/.claude.json and `mcpJson` is <dir>/.mcp.json, each parsed, or null.
 */
export function registrations({ claudeJson, mcpJson, dir, name = SERVER }) {
  const found = {
    local: dir ? claudeJson?.projects?.[dir]?.mcpServers?.[name] : undefined,
    project: mcpJson?.mcpServers?.[name],
    user: claudeJson?.mcpServers?.[name],
  };
  return PRECEDENCE.filter((s) => found[s]).map((scope) => ({
    scope,
    entry: found[scope],
  }));
}

/**
 * Whether one registration runs the knowledge server from this checkout. A registration under the
 * same name that runs something else entirely is `foreign` and is never replaced.
 */
export function verdict(entry, file = SERVER_FILE) {
  const args = entry?.args ?? [];
  const server = args.find((a) => a.endsWith(SERVER_TAIL));
  if (!server)
    return {
      state: "foreign",
      why: `runs \`${[entry?.command, ...args].filter(Boolean).join(" ")}\`, not the knowledge server`,
    };
  if (path.resolve(server) === file) return { state: "current" };
  return { state: "stale", why: `runs the server from ${server}` };
}

/** True when a registration under the retired name runs the retired package. */
export function isRetired(entry) {
  return [entry?.command, ...(entry?.args ?? [])].some(
    (a) =>
      typeof a === "string" &&
      (a === RETIRED.package || a.startsWith(`${RETIRED.package}@`)),
  );
}

/**
 * What to do at `scope`, given what is registered. Returns the `claude` argument lists to run, in
 * order, and a note when a registration at a higher-precedence scope would hide this one.
 */
export function plan(scope, regs, file = SERVER_FILE) {
  const here = regs.find((r) => r.scope === scope);
  const winner = regs[0];
  const shadow =
    winner && PRECEDENCE.indexOf(winner.scope) < PRECEDENCE.indexOf(scope)
      ? `a ${winner.scope}-scope registration takes precedence here and ${
          verdict(winner.entry, file).state === "current"
            ? "is current"
            : verdict(winner.entry, file).why
        }`
      : null;
  if (!here) return { state: "missing", steps: [addArgs(scope, file)], shadow };
  const v = verdict(here.entry, file);
  if (v.state === "current") return { state: "current", steps: [], shadow };
  if (v.state === "foreign") return { ...v, steps: [], shadow };
  return {
    ...v,
    steps: [["mcp", "remove", "--scope", scope, SERVER], addArgs(scope, file)],
    shadow,
  };
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8"));
  } catch {
    return null;
  }
}

const WHERE = {
  user: () => "every project on this machine",
  local: (dir) => `${dir}, for this user only`,
  project: (dir) => `${dir}, for everyone who clones it`,
};

/**
 * Register or check the server, retire the old one, print one line per finding, and return the
 * number of problems. `run`, `home` and `file` are parameters so the tests never touch the real
 * Claude Code config.
 */
export function ensure({
  scope = "user",
  dir = null,
  check = false,
  home = os.homedir(),
  file = SERVER_FILE,
  run = (args, cwd) =>
    spawnSync("claude", args, { cwd, encoding: "utf8", stdio: "pipe" }),
  log = console.log,
} = {}) {
  const claudeJson = readJson(path.join(home, ".claude.json"));
  const mcpJson = dir ? readJson(path.join(dir, ".mcp.json")) : null;
  const regs = registrations({ claudeJson, mcpJson, dir });
  // A check asks whether Claude Code will run this checkout's server, so it judges the
  // registration Claude Code uses, at whatever scope that is. An install acts at the scope asked.
  if (check && regs.length) scope = regs[0].scope;
  const p = plan(scope, regs, file);
  const retired = registrations({
    claudeJson,
    mcpJson,
    dir,
    name: RETIRED.name,
  }).filter((r) => isRetired(r.entry));
  const cwd = dir ?? home;
  let problems = 0;

  const call = (args) => {
    const r = run(args, cwd);
    if (r.error?.code === "ENOENT") {
      log(
        `  ✗ ${SERVER}: the claude command is not on PATH. Register the server by hand:\n      claude ${addArgs(scope, file).join(" ")}`,
      );
      return false;
    }
    if (r.status !== 0) {
      log(
        `  ✗ ${SERVER}: \`claude ${args.join(" ")}\` failed: ${(r.stderr || r.stdout || "").trim()}`,
      );
      return false;
    }
    return true;
  };

  if (p.state === "current")
    log(`  ✓ ${SERVER}: current (${WHERE[scope](dir)})`);
  else if (p.state === "foreign") {
    log(
      `  ✗ ${SERVER}: the ${scope}-scope registration ${p.why}. It is not replaced; remove it with \`claude mcp remove --scope ${scope} ${SERVER}\` and rerun.`,
    );
    problems++;
  } else if (check) {
    log(
      `  ✗ ${SERVER}: ${p.state}${p.why ? ` — ${p.why}` : ""} (${WHERE[scope](dir)}). Run npm run mcp:install.`,
    );
    problems++;
  } else {
    for (const args of p.steps) if (!call(args)) return problems + 1;
    log(
      `  ✓ ${SERVER}: ${p.state === "missing" ? "registered" : "moved to this checkout"} (${WHERE[scope](dir)})`,
    );
  }
  if (p.shadow) log(`  ! ${SERVER}: ${p.shadow}.`);

  for (const r of retired) {
    if (check) {
      log(
        `  ✗ ${RETIRED.name}: the retired ${RETIRED.package} server is still registered at ${r.scope} scope. Run npm run mcp:install to remove it.`,
      );
      problems++;
      continue;
    }
    if (!call(["mcp", "remove", "--scope", r.scope, RETIRED.name]))
      return problems + 1;
    log(
      `  ✓ ${RETIRED.name}: removed the retired ${RETIRED.package} server (${r.scope} scope)`,
    );
  }
  return problems;
}

function arg(args, name) {
  const i = args.indexOf(name);
  return i === -1 ? null : args[i + 1];
}

const invokedDirectly =
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const project = arg(args, "--project");
  // npm runs a script from the package root; INIT_CWD is where the person typed the command.
  const dir = project
    ? path.resolve(process.env.INIT_CWD ?? process.cwd(), project)
    : null;
  if (dir && !fs.existsSync(dir)) {
    console.log(`No folder at ${dir}.`);
    process.exit(1);
  }
  console.log(`The Recursica knowledge MCP server in Claude Code`);
  console.log(`  from ${SERVER_FILE}\n`);
  const problems = ensure({
    scope: dir ? "local" : "user",
    dir,
    check: args.includes("--check"),
  });
  if (problems) process.exit(1);
}
