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
 * of the knowledge and recognized only two adapters. An install removes it for every project and
 * for each folder Claude Code knows, since `claude mcp add` registers for one folder by default.
 * One in a project's committed .mcp.json is reported for the team to remove, never edited.
 * `--check` fails while any of these remain.
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
const SERVER_TAIL = "nest/mcp/knowledge/server.mjs";
/** Forward slashes, so a path written on Windows or by hand compares with one built here. */
const slash = (p) => p.replace(/\\/g, "/");

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
  const server = args.find(
    (a) => typeof a === "string" && slash(a).endsWith(SERVER_TAIL),
  );
  if (!server)
    return {
      state: "foreign",
      why: `runs \`${[entry?.command, ...args].filter(Boolean).join(" ")}\`, not the knowledge server`,
    };
  // Absolute in either style is compared as written; a relative path is resolved first.
  const abs = /^([a-zA-Z]:)?[\\/]/.test(server) ? server : path.resolve(server);
  if (slash(abs) === slash(file)) return { state: "current" };
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

/** Every registration of the retired server that runs the retired package, at any scope. */
export function retiredRegistrations({ claudeJson, mcpJson, dir }) {
  const found = [];
  const add = (scope, entry, project = null) => {
    if (entry && isRetired(entry)) found.push({ scope, project });
  };
  // Local scope is per folder, and `claude mcp add` registers there by default, so every folder
  // Claude Code knows about is searched, not only the one this run was given.
  for (const [project, v] of Object.entries(claudeJson?.projects ?? {}))
    add("local", v?.mcpServers?.[RETIRED.name], project);
  add("project", mcpJson?.mcpServers?.[RETIRED.name], dir);
  add("user", claudeJson?.mcpServers?.[RETIRED.name]);
  return found;
}

/** Local-scope registrations of the server, in any folder, that do not run this checkout's. */
export function staleLocal({ claudeJson, file = SERVER_FILE, except = null }) {
  return Object.entries(claudeJson?.projects ?? {})
    .filter(([project, v]) => project !== except && v?.mcpServers?.[SERVER])
    .map(([project, v]) => ({
      project,
      v: verdict(v.mcpServers[SERVER], file),
    }))
    .filter(({ v }) => v.state !== "current");
}

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
    spawnSync("claude", args, {
      cwd,
      encoding: "utf8",
      stdio: "pipe",
      // On Windows the npm-installed `claude` is a .cmd file, which only a shell can start.
      shell: process.platform === "win32",
    }),
  log = console.log,
} = {}) {
  const claudeJson = readJson(path.join(home, ".claude.json"));
  const mcpJson = dir ? readJson(path.join(dir, ".mcp.json")) : null;
  const regs = registrations({ claudeJson, mcpJson, dir });
  // A check asks whether Claude Code will run this checkout's server, so it judges the
  // registration Claude Code uses, at whatever scope that is. An install acts at the scope asked.
  if (check && regs.length) scope = regs[0].scope;
  const p = plan(scope, regs, file);
  const rerun = dir
    ? `npm run mcp:install -- --project ${dir}`
    : "npm run mcp:install";
  let problems = 0;

  const call = (args, cwd = dir ?? home) => {
    const r = run(args, cwd);
    if (r.error?.code === "ENOENT") {
      log(
        `  ✗ the claude command is not on PATH. Run this by hand${cwd === home ? "" : ` in ${cwd}`}:\n      claude ${args.join(" ")}`,
      );
      return false;
    }
    if (r.status !== 0) {
      log(
        `  ✗ \`claude ${args.join(" ")}\` failed${cwd === home ? "" : ` in ${cwd}`}: ${(r.stderr || r.stdout || "").trim()}`,
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
      `  ✗ ${SERVER}: ${p.state}${p.why ? ` — ${p.why}` : ""} (${WHERE[scope](dir)}). Run ${rerun}.`,
    );
    problems++;
  } else {
    for (const args of p.steps) if (!call(args)) return problems + 1;
    log(
      `  ✓ ${SERVER}: ${p.state === "missing" ? "registered" : "moved to this checkout"} (${WHERE[scope](dir)})`,
    );
  }
  if (p.shadow) log(`  ! ${SERVER}: ${p.shadow}.`);

  // A registration for one folder wins over the one for every project, so a stale one hides
  // this checkout's server in that folder. Reported, not changed: the folder's owner chose it.
  if (!dir)
    for (const { project, v } of staleLocal({ claudeJson, file }))
      log(
        `  ! ${SERVER}: ${project} has its own registration, which ${v.why}, and wins in that folder. Run npm run mcp:install -- --project ${project} to replace it.`,
      );

  for (const r of retiredRegistrations({ claudeJson, mcpJson, dir })) {
    const where = r.scope === "local" ? ` for ${r.project}` : "";
    if (r.scope === "project") {
      // A project-scope registration lives in the project's committed .mcp.json. Editing a
      // team's committed file is the team's change to make, so it is reported, never edited.
      log(
        `  ✗ ${RETIRED.name}: the retired ${RETIRED.package} server is in ${path.join(r.project, ".mcp.json")}. Remove the "${RETIRED.name}" entry there and commit the change.`,
      );
      problems++;
      continue;
    }
    if (r.scope === "local" && !fs.existsSync(r.project)) {
      log(
        `  ! ${RETIRED.name}: the retired ${RETIRED.package} server is registered${where}, a folder that no longer exists. Claude Code never starts it there.`,
      );
      continue;
    }
    if (check) {
      log(
        `  ✗ ${RETIRED.name}: the retired ${RETIRED.package} server is still registered at ${r.scope} scope${where}. Run npm run mcp:install to remove it.`,
      );
      problems++;
      continue;
    }
    const cwd = r.scope === "local" ? r.project : home;
    if (!call(["mcp", "remove", "--scope", r.scope, RETIRED.name], cwd))
      return problems + 1;
    log(
      `  ✓ ${RETIRED.name}: removed the retired ${RETIRED.package} server (${r.scope} scope${where})`,
    );
  }
  return problems;
}

/** `--name value` or `--name=value`; `undefined` when the flag is absent, `""` when it has no value. */
export function arg(args, name) {
  const eq = args.find((a) => a.startsWith(`${name}=`));
  if (eq) return eq.slice(name.length + 1);
  const i = args.indexOf(name);
  if (i === -1) return undefined;
  const v = args[i + 1];
  return v && !v.startsWith("--") ? v : "";
}

// Compared through realpath, so a run through a symlinked checkout is not silently a no-op.
const invokedDirectly =
  process.argv[1] &&
  fs.realpathSync(process.argv[1]) ===
    fs.realpathSync(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  const args = process.argv.slice(2);
  const project = arg(args, "--project");
  if (project === "") {
    console.log("--project needs a folder: --project <dir>.");
    process.exit(1);
  }
  // npm runs a script from the package root; INIT_CWD is where the person typed the command.
  let dir = project
    ? path.resolve(process.env.INIT_CWD ?? process.cwd(), project)
    : null;
  if (dir && !fs.existsSync(dir)) {
    console.log(`No folder at ${dir}.`);
    process.exit(1);
  }
  // Claude Code keys a folder's registrations by the folder's real path, so a path through a
  // symlink would never match the registration it just wrote.
  if (dir) dir = fs.realpathSync(dir);
  console.log(`The Recursica knowledge MCP server in Claude Code`);
  console.log(`  from ${SERVER_FILE}\n`);
  const problems = ensure({
    scope: dir ? "local" : "user",
    dir,
    check: args.includes("--check"),
  });
  if (problems) process.exit(1);
}
