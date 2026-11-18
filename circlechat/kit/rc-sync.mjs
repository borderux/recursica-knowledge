#!/usr/bin/env node
// Keeps each agent on a RecursicaChat 2.0 server in step with the kit and the stack's site.json,
// through the server's HTTP API. circlechat/rc-sync.sh runs it, at setup and from the hourly job.
// Nothing of it runs inside the server.
//
// For each agent with agents.<handle>.recursicachat in site.json, the sync sets five settings:
//   instructions  portable/recursicachat/agents/<handle>/INSTRUCTIONS.md, which scripts/build-agents.mjs
//                 builds from agents/<handle>/SKILL.md and platform/recursicachat.md
//   autonomy      agents/<handle>/runtime/recursicachat.json
//   sandbox       agents/<handle>/runtime/recursicachat.json
//   model         agents.<handle>.recursicachat.model in site.json, such as cluster:local-large
//   budget        agents.<handle>.recursicachat.budget_usd in site.json, a monthly budget in US dollars
// The sync sends only the settings that differ. The server restarts an agent when the model or the
// sandbox changes, so a sync with nothing to change restarts nothing. The sync never adds an agent:
// an agent missing on the server is a failure, and the other agents still sync.
//
// The sync signs in as its own account, a builder (recursicachat.account in site.json), never an
// owner or an admin. The server's CLI, run as root, gives the account a short session and prints only
// the token. The wrapper pipes the token to this script's stdin. The token goes in an Authorization
// header only: never an argument, an environment variable or an output line.
//
//   node rc-sync.mjs settings <site.json>        the wrapper's settings, one per line
//   node rc-sync.mjs sync [--check] <site.json> < token
// --check reports what would change and changes nothing. Exit 1 when an agent failed, 2 on a usage
// or setup error. No output line holds a token or an agent's instructions.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RC_DEFAULTS, recursicachatErrors } from "./render.mjs";

const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// The server cuts instructions at this length without a word (validAgentFields in the server's api.ts).
export const MAX_INSTRUCTIONS = 20_000;
const FIELDS = ["instructions", "model", "autonomy", "sandbox", "budgetCents"];
const LABEL = { instructions: "instructions", model: "model", autonomy: "autonomy", sandbox: "sandbox", budgetCents: "monthly budget" };

class SetupError extends Error {}

// The wrapper's settings: account, url, app, data, vault key file and the CLI's Node, one per line.
// An empty account means site.json has no recursicachat block.
export function wrapperSettings(site) {
  const rc = site.recursicachat;
  if (rc === undefined) return ["", "", "", "", "", ""];
  return [rc.account, rc.url ?? RC_DEFAULTS.url, rc.app ?? RC_DEFAULTS.app, rc.data ?? RC_DEFAULTS.data, rc.vault_key_file ?? "", rc.node ?? ""].map(String);
}

// What the kit and site.json want for one agent. Throws with a message for the operator.
export function wanted(site, handle, kitRoot = KIT_ROOT) {
  const s = site.agents?.[handle]?.recursicachat;
  if (!s) throw new Error(`site.json has no agents.${handle}.recursicachat`);
  const file = path.join(kitRoot, "portable", "recursicachat", "agents", handle, "INSTRUCTIONS.md");
  if (!fs.existsSync(file)) throw new Error(`the kit has no RecursicaChat instructions for ${handle}. Add agents/${handle}/platform/recursicachat.md and recursicachat to the agent's targets, then run npm run agents:build`);
  const instructions = fs.readFileSync(file, "utf8");
  if (instructions.length > MAX_INSTRUCTIONS) throw new Error(`${handle}'s instructions are ${instructions.length} characters, and the server keeps only ${MAX_INSTRUCTIONS}. Shorten the instructions`);
  const token = /\{\{[A-Z0-9_]+\}\}|@[A-Z0-9_]+@/.exec(instructions);
  if (token) throw new Error(`${handle}'s instructions still hold the token ${token[0]}, and RecursicaChat fills in no token`);
  const runFile = path.join(kitRoot, "agents", handle, "runtime", "recursicachat.json");
  if (!fs.existsSync(runFile)) throw new Error(`the kit has no agents/${handle}/runtime/recursicachat.json, for the agent's autonomy and sandbox`);
  const run = JSON.parse(fs.readFileSync(runFile, "utf8"));
  if (!["ask", "act", "auto"].includes(run.autonomy)) throw new Error(`agents/${handle}/runtime/recursicachat.json: autonomy must be ask, act or auto`);
  if (!["docker", "local"].includes(run.sandbox)) throw new Error(`agents/${handle}/runtime/recursicachat.json: sandbox must be docker or local`);
  return { instructions, model: s.model, autonomy: run.autonomy, sandbox: run.sandbox, budgetCents: Math.round(s.budget_usd * 100) };
}

// The settings that differ, as the PATCH body.
export function changes(current, want) {
  const out = {};
  for (const f of FIELDS) if (current?.[f] !== want[f]) out[f] = want[f];
  return out;
}

// A small client for the server's API. The token goes in an Authorization header, never a cookie:
// the server refuses a cookie session from anything but its own pages.
export function apiClient({ base, token, fetchImpl = globalThis.fetch }) {
  const root = String(base).replace(/\/+$/, "");
  async function call(method, p, body) {
    const r = await fetchImpl(root + p, {
      method,
      headers: { authorization: `Bearer ${token}`, ...(body !== undefined ? { "content-type": "application/json" } : {}) },
      body: body !== undefined ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(30_000),
    });
    let data = null;
    try { data = await r.json(); } catch { data = null; }
    if (!r.ok) {
      const why = data && typeof data.error === "string" ? ` (${data.error.replace(/\s+/g, " ").slice(0, 120)})` : "";
      const err = new Error(`${method} ${p} answered ${r.status}${why}`);
      err.status = r.status;
      throw err;
    }
    return data;
  }
  return { get: (p) => call("GET", p), patch: (p, b) => call("PATCH", p, b) };
}

// Syncs every agent site.json lists for RecursicaChat. Returns the number of agents that failed.
export async function syncAgents({ api, site, kitRoot = KIT_ROOT, check = false, log = console.log }) {
  const me = (await api.get("/api/me"))?.user;
  if (me?.role !== "builder") throw new SetupError(`The sync's account must be a builder, made only for the sync. ${me?.email ?? "The account"} is ${me?.role ? `a ${me.role}` : "unknown"}.`);
  const handles = Object.entries(site.agents ?? {}).filter(([, a]) => a?.recursicachat).map(([h]) => h);
  if (!handles.length) { log("No agent in site.json has a recursicachat block: nothing to sync."); return 0; }
  let failed = 0;
  for (const h of handles) {
    try {
      const want = wanted(site, h, kitRoot);
      let current;
      try {
        current = (await api.get(`/api/agents/${encodeURIComponent(h)}`))?.agent;
      } catch (e) {
        if (e.status === 404) throw new Error(`@${h} is not on the server. Add the agent in RecursicaChat first, then sync again`);
        throw e;
      }
      const diff = changes(current, want);
      const names = Object.keys(diff).map((f) => LABEL[f]);
      if (!names.length) { log(`${h}: up to date`); continue; }
      if (check) { log(`${h}: would set ${names.join(", ")}`); continue; }
      const after = (await api.patch(`/api/agents/${encodeURIComponent(current.id ?? h)}`, diff))?.agent;
      const left = Object.keys(changes(after, want)).map((f) => LABEL[f]);
      if (left.length) throw new Error(`the server kept a different ${left.join(", ")}`);
      log(`${h}: set ${names.join(", ")}`);
    } catch (e) {
      failed++;
      log(`${h}: FAILED: ${e.message}`);
    }
  }
  return failed;
}

// The token, from stdin: one line, nothing else.
export async function tokenFrom(stream) {
  let text = "";
  for await (const chunk of stream) text += chunk;
  const t = text.trim();
  if (!/^[A-Za-z0-9_-]{20,}$/.test(t)) throw new SetupError("No session token arrived on stdin. rc-sync.sh pipes one from the server's CLI.");
  return t;
}

function readSite(file) {
  if (!file || !fs.existsSync(file)) throw new SetupError(`No site.json at ${file ?? "(none given)"}.`);
  const site = JSON.parse(fs.readFileSync(file, "utf8"));
  const errs = recursicachatErrors(site);
  if (errs.length) throw new SetupError(`site.json: ${errs.join("; ")}`);
  return site;
}

export async function main(argv = process.argv.slice(2), { stdin = process.stdin, env = process.env, log = console.log, fetchImpl } = {}) {
  const [cmd, ...rest] = argv;
  const check = rest.includes("--check");
  const file = rest.filter((a) => a !== "--check")[0];
  try {
    if (cmd === "settings") {
      process.stdout.write(wrapperSettings(readSite(file)).join("\n") + "\n");
      return 0;
    }
    if (cmd !== "sync") throw new SetupError("usage: rc-sync.mjs settings <site.json> | sync [--check] <site.json> < token");
    const site = readSite(file);
    const token = await tokenFrom(stdin);
    const api = apiClient({ base: env.RC_URL ?? wrapperSettings(site)[1], token, fetchImpl });
    return (await syncAgents({ api, site, check, log })) ? 1 : 0;
  } catch (e) {
    log(e instanceof SetupError ? e.message : `The sync stopped: ${e.message}`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
