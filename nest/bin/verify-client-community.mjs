#!/usr/bin/env node
/**
 * Is this community set up for exactly one client, with only that client's agents in it?
 *
 * THE INSTALLED COPY IS GENERATED. scripts/bootstrap-nest.mjs installs this into ~/.buzz/bin/.
 * Edit it here, in nest/bin/.
 *
 * ## The question it answers
 *
 * One community per client makes the community boundary the fence. That only holds if the
 * agents running in a community are that client's agents — and measured on the machine this
 * was written for, 15 of 16 agents were running in all four communities. Every client's
 * agents were present in three communities that were not their client. The per-file fence
 * stopped them reading anything; nothing stopped them being there.
 *
 * That is invisible from inside Buzz Desktop, and it is invisible in the config files. It is
 * only visible in the running processes, which is where this looks.
 *
 * Usage:
 *   verify-client-community.mjs [--relay <wss://...>] [--json]
 *
 *   --relay <url>  which community. Defaults to BUZZ_RELAY_URL
 *   --json         machine-readable
 *
 * Exit 0 clean, 1 something to fix, 2 could not check.
 *
 * ## What "a different client's agent" means here
 *
 * An agent's client is read from its fence — the `CLAUDE_CONFIG_DIR` in its running
 * environment — not from its name. A name is the thing operators rename; the fence is the
 * thing that decides what it can read, and if the two ever disagree the fence is the truth.
 * An agent with no fence at all is reported separately and more loudly, because it is not
 * fenced to anything.
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { communityClients } from "./lib/client-config.mjs";

const argv = process.argv.slice(2);
const flag = (n) => argv.includes(n);
const opt = (n) => {
  const i = argv.indexOf(n);
  return i === -1 ? null : argv[i + 1];
};

if (flag("--help") || flag("-h")) {
  const header = fs.readFileSync(new URL(import.meta.url), "utf8");
  const usage = header.slice(
    header.indexOf(" * Usage:"),
    header.indexOf(" * ## What \"a different"),
  );
  console.log(usage.replace(/^ \* ?/gm, "").trimEnd());
  process.exit(0);
}

const relay = opt("--relay") ?? process.env.BUZZ_RELAY_URL;
const asJson = flag("--json");

if (!relay) {
  console.error("No community given. Pass --relay <wss://...> or set BUZZ_RELAY_URL.");
  process.exit(2);
}

const shortRelay = relay
  .replace(/^wss?:\/\//, "")
  .replace(/\.communities\.buzz\.xyz$/, "");

const registry = path.join(
  os.homedir(),
  "Library",
  "Application Support",
  "xyz.block.buzz.app",
  "agents",
);

/* ------------------------------------------------- what the community says */

let note = null;
try {
  note = execFileSync(
    "buzz",
    ["--relay", relay, "notes", "get", "--name", "client-config", "--content-only"],
    { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
  );
} catch {
  note = null;
}
const clients = communityClients(note);

/* ------------------------------------------------- what is actually running */

/**
 * Read from the pid files and the live process environment, never from the agent records.
 *
 * A saved config restarts the agent only on the community the operator was standing in, so
 * the record says what was intended and the process says what is true. Three stale copies
 * running the old environment is the failure this whole file exists for.
 */
function runningHere() {
  const names = Object.fromEntries(
    JSON.parse(fs.readFileSync(path.join(registry, "managed-agents.json"), "utf8"))
      .filter((r) => r.pubkey)
      .map((r) => [r.pubkey, r.display_name ?? r.name]),
  );

  const out = [];
  const pidDir = path.join(registry, "agent-pids");
  if (!fs.existsSync(pidDir)) return out;

  for (const f of fs.readdirSync(pidDir)) {
    if (!f.endsWith(".json")) continue;
    let d;
    try {
      d = JSON.parse(fs.readFileSync(path.join(pidDir, f), "utf8"));
    } catch {
      continue;
    }
    const theirRelay = (d.key?.relayUrl ?? "")
      .replace(/^wss?:\/\//, "")
      .replace(/\.communities\.buzz\.xyz$/, "");
    if (theirRelay !== shortRelay) continue;

    const pid = d.pid;
    try {
      execFileSync("ps", ["-p", String(pid)], { stdio: "ignore" });
    } catch {
      continue;
    }

    let env = "";
    try {
      env = execFileSync("ps", ["eww", "-p", String(pid)], { encoding: "utf8" });
    } catch {
      /* a process we cannot read the environment of is reported as unfenced */
    }
    const cfg =
      env.split(/\s+/).find((t) => t.startsWith("CLAUDE_CONFIG_DIR="))?.slice(18) ?? null;

    out.push({
      name: names[d.key?.pubkey] ?? "<unknown>",
      pid,
      configDir: cfg,
      // The fence directory is named for the client it fences to. That is a convention, and
      // a convention read off a path is weaker evidence than the path itself — so the raw
      // directory is reported alongside, and a name that does not parse is "unknown" rather
      // than a guess.
      client: cfg ? (cfg.match(/claude-config-(.+)$/)?.[1] ?? null) : null,
    });
  }
  return out;
}

let agents;
try {
  agents = runningHere();
} catch (err) {
  console.error(`could not read the agent registry: ${err.message}`);
  process.exit(2);
}

/* ------------------------------------------------- the verdict */

const problems = [];
const expected = clients.length === 1 ? clients[0] : null;

/**
 * A community with no client is not a broken client community.
 *
 * The first version reported every unfenced agent here as a thing to fix, and on a shared
 * working community that is thirteen findings about agents that hold no client data and never
 * will. A check that cries wolf thirteen times gets ignored on the fourteenth, which is the
 * one that matters. So an unfenced agent is a finding **only where there is a client to
 * reach** — which is exactly where it is dangerous.
 */
const isClientCommunity = clients.length > 0;

if (clients.length > 1)
  problems.push({
    kind: "several-clients",
    detail: `this community describes ${clients.length} clients; one community is meant to be one client`,
  });

const unfenced = isClientCommunity ? agents.filter((a) => !a.configDir) : [];
for (const a of unfenced)
  problems.push({
    kind: "unfenced",
    agent: a.name,
    pid: a.pid,
    detail: "no client fence, in a community that has client data",
  });

const foreign = expected
  ? agents.filter((a) => a.client && a.client !== expected)
  : [];
for (const a of foreign)
  problems.push({
    kind: "other-client",
    agent: a.name,
    pid: a.pid,
    detail: "fenced to a different client than this community",
  });

if (isClientCommunity && agents.length === 0)
  problems.push({
    kind: "no-agents",
    detail: "no agent is running in this community",
  });

if (asJson) {
  console.log(
    JSON.stringify(
      {
        community: shortRelay,
        clients: clients.length,
        agents: agents.length,
        unfenced: unfenced.length,
        otherClient: foreign.length,
        problems,
      },
      null,
      2,
    ),
  );
  process.exit(problems.length ? 1 : 0);
}

console.log(`Community ${shortRelay}`);
console.log(
  `  client-config note: ${
    clients.length === 1
      ? "one client"
      : clients.length
        ? `${clients.length} clients`
        : "none — not a client community"
  }`,
);
console.log(`  agents running here: ${agents.length}`);
for (const a of agents) {
  const state =
    expected && a.client && a.client !== expected
      ? "OTHER CLIENT"
      : !a.configDir
        ? isClientCommunity
          ? "UNFENCED"
          : "no fence"
        : "ok";
  console.log(`    ${state.padEnd(13)} ${a.name}  pid=${a.pid}`);
}

if (!problems.length) {
  console.log(
    isClientCommunity
      ? "\nRESULT: one client, and only its agents are here."
      : "\nRESULT: no client data in this community, so nothing to fence.",
  );
  process.exit(0);
}

console.log(`\nRESULT: ${problems.length} thing(s) to fix`);
for (const p of problems)
  console.log(`  ${p.kind}${p.agent ? ` (${p.agent})` : ""}: ${p.detail}`);

if (foreign.length || unfenced.length) {
  console.log(
    "\nAn agent that belongs to another client should leave this community rather than be\n" +
      "fenced harder. Remove it in Buzz Desktop; its own client's community is where it runs.\n" +
      "An unfenced agent needs its CLAUDE_CONFIG_DIR set and its runtime flipped in the SAME\n" +
      "save — split them and it comes up briefly holding every client's connectors.",
  );
}
process.exit(1);
