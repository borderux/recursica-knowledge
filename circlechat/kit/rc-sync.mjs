#!/usr/bin/env node
// Keeps each agent on a RecursicaChat 2.0 server in step with the kit and the stack's site.json.
// circlechat/rc-sync.sh runs it, at setup and from the hourly job, and hands what it prints to the
// server's root-only CLI. Nothing of it runs inside the server, and it signs in to nothing.
//
// For each agent with agents.<handle>.recursicachat in site.json, the agent is managed on the server
// (cli.ts manage): the API refuses changes to these five settings, and the sync sets them through the
// CLI (cli.ts agent-set, JSON on stdin):
//   instructions  portable/recursicachat/agents/<handle>/INSTRUCTIONS.md, which scripts/build-agents.mjs
//                 builds from agents/<handle>/SKILL.md and platform/recursicachat.md
//   autonomy      agents/<handle>/runtime/recursicachat.json
//   sandbox       agents/<handle>/runtime/recursicachat.json
//   model         gw-<handle>:<route>, with the route from agents.<handle>.recursicachat.model in
//                 site.json. gw-<handle> is the agent's own provider on the server, which rc-sync.sh
//                 sets first, with the key of the gateway handle rc-<handle>
//   budget        agents.<handle>.recursicachat.budget_usd in site.json, a monthly budget in US dollars
// The CLI sets only the settings that differ. The server restarts an agent when the model or the
// sandbox changes, so a sync with nothing to change restarts nothing. The sync never adds an agent:
// an agent missing on the server is a failure, and the other agents still sync.
//
//   node rc-sync.mjs settings <site.json>        the wrapper's settings, one per line
//   node rc-sync.mjs agents <site.json>          for the key step: handle, gateway handle, provider,
//                                                model and routes, tab-separated, one agent per line
//   node rc-sync.mjs want <site.json> <handle>   the agent's five settings as JSON, for cli.ts agent-set
//   node rc-sync.mjs warn <site.json>            reads cli.ts agent-models on stdin; prints a warning
//                                                for each agent whose model can use another's key
// Exit 1 when the agent's settings could not be made, 2 on a usage or setup error.

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RC_DEFAULTS, rcAgents, rcHandle, rcProvider, recursicachatErrors } from "./render.mjs";

const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// The server's CLI refuses longer instructions (MAX_INSTRUCTIONS in the server's managed.ts).
export const MAX_INSTRUCTIONS = 20_000;

class SetupError extends Error {}

// The wrapper's settings: app, data, vault key file, the CLI's Node, the gateway's address for the
// server, and "account" when site.json still names the sync account the kit no longer uses, one per
// line. An empty first line means site.json has no recursicachat block.
export function wrapperSettings(site) {
  const rc = site.recursicachat;
  if (rc === undefined) return ["", "", "", "", "", ""];
  const port = site.site?.gateway_local_port;
  return [rc.app ?? RC_DEFAULTS.app, rc.data ?? RC_DEFAULTS.data, rc.vault_key_file ?? "", rc.node ?? "", port ? `http://127.0.0.1:${port}/v1` : "", rc.account !== undefined ? "account" : ""].map(String);
}

// Each member session circlechat/rc-session.sh keeps fresh: the email, the account and the file.
export function rcSessions(site) {
  return (site.recursicachat?.sessions ?? []).map((s) => [s.email, s.account, s.file]);
}

// Each service circlechat/rc-service.sh sets up: the name, the account, the file and the agents it
// drives, comma-separated.
export function rcServices(site) {
  return (site.recursicachat?.services ?? []).map((s) => [s.name, s.account, s.file, (s.agents ?? []).join(",")]);
}

// What the root step needs for each agent: the handle, the gateway handle, the provider, the model
// (a route) and every route the agent's key may use.
export function rootAgents(site) {
  const all = Object.keys(site.routes ?? {});
  return rcAgents(site).map((h) => {
    const a = site.agents[h];
    return [h, rcHandle(h), rcProvider(h), a.recursicachat.model, (Array.isArray(a.routes) ? a.routes : all).join(",")];
  });
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
  return { instructions, model: `${rcProvider(handle)}:${s.model}`, autonomy: run.autonomy, sandbox: run.sandbox, budgetCents: Math.round(s.budget_usd * 100) };
}

// Warnings about agents whose model can use another agent's key, from cli.ts agent-models: an agent
// whose model names no provider takes the server's first provider of its kind, which can be an
// agent's gateway provider; and one whose model names another agent's gw- provider uses that key.
export function warnings(models) {
  const out = [];
  for (const line of String(models).split("\n")) {
    const [handle, model = ""] = line.split("\t");
    if (!handle) continue;
    const pid = model.includes(":") ? model.split(":")[0] : "";
    if (!pid) out.push(`warning: @${handle}'s model names no provider, so the server gives @${handle} the first provider of its kind. Set a model as <provider>:<model>.`);
    else if (pid.startsWith("gw-") && pid !== rcProvider(handle)) out.push(`warning: @${handle}'s model uses ${pid}, another agent's gateway key. Give @${handle} a provider of its own.`);
  }
  return out;
}

function readSite(file) {
  if (!file || !fs.existsSync(file)) throw new SetupError(`No site.json at ${file ?? "(none given)"}.`);
  const site = JSON.parse(fs.readFileSync(file, "utf8"));
  const errs = recursicachatErrors(site);
  if (errs.length) throw new SetupError(`site.json: ${errs.join("; ")}`);
  return site;
}

async function readAll(stream) {
  let text = "";
  for await (const chunk of stream) text += chunk;
  return text;
}

export async function main(argv = process.argv.slice(2), { stdin = process.stdin, out = (t) => process.stdout.write(t), log = console.error, kitRoot = KIT_ROOT } = {}) {
  const [cmd, file, handle] = argv;
  try {
    if (cmd === "settings") {
      out(wrapperSettings(readSite(file)).join("\n") + "\n");
      return 0;
    }
    if (cmd === "sessions") {
      for (const row of rcSessions(readSite(file))) out(row.join("\t") + "\n");
      return 0;
    }
    if (cmd === "services") {
      for (const row of rcServices(readSite(file))) out(row.join("\t") + "\n");
      return 0;
    }
    if (cmd === "agents") {
      for (const row of rootAgents(readSite(file))) out(row.join("\t") + "\n");
      return 0;
    }
    if (cmd === "want" && handle) {
      const site = readSite(file);
      try {
        out(JSON.stringify(wanted(site, handle, kitRoot)) + "\n");
        return 0;
      } catch (e) {
        log(e.message);
        return 1;
      }
    }
    if (cmd === "warn") {
      readSite(file);
      for (const w of warnings(await readAll(stdin))) out(w + "\n");
      return 0;
    }
    throw new SetupError("usage: rc-sync.mjs settings <site.json> | sessions <site.json> | services <site.json> | agents <site.json> | want <site.json> <handle> | warn <site.json> < models");
  } catch (e) {
    log(e instanceof SetupError ? e.message : `The sync stopped: ${e.message}`);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
