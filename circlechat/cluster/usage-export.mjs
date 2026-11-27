// The usage export, for each program in recursicachat.services with "health_report": true. The
// program writes a health note on the cluster, and its own account can't read the gateway's spend
// log or the cluster agent's samples: the stack's folder and /var/lib/agent-cluster are closed to
// it. So each hour, on the control computer, the updater copies each finished day into the
// program's state folder:
//
//   <state>/usage/<day>/spend.jsonl    the spend log's lines whose time falls on the day
//   <state>/usage/<day>/samples.jsonl  the day's usage samples (usage.mjs), or an empty file
//   <state>/usage/<day>/limits.json    the gateway's caps, the routes, the models and the nodes
//   <state>/usage/<day>/done           empty, written last: the day is complete
//
// The day runs from midnight to midnight in the cluster's time zone. The export covers the last 3
// finished days, so a missed hour or a computer that was off catches up, and a day with done is
// never written again. Day folders older than 15 days are deleted.
//
// The files are written as the program's account, never as root: the account owns the state
// folder, so it could put a link where root would write. Each folder is mode 700 and each file 600,
// and each file goes to a temporary name first, then takes its place in one step. Nothing secret
// goes in: the spend log holds no key, prompt or answer, and limits.json holds no key.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { spawnSync } from "node:child_process";
import { clusterModels, gatewayConfig } from "../kit/render.mjs";
import { KEEP_DAYS, addDays, dayOf, isDay } from "./usage.mjs";

export const CATCH_UP_DAYS = 3;

/** The programs with a health report: health_report true, an account and a state folder. */
export function healthServices(site = {}) {
  const list = site?.recursicachat?.services;
  return (Array.isArray(list) ? list : []).filter((s) => s && s.health_report === true && typeof s.account === "string" && typeof s.state === "string");
}

/** The finished days to export, oldest first: the n days before today. */
export const exportDays = (today, n = CATCH_UP_DAYS) => Array.from({ length: n }, (_, i) => addDays(today, i - n));

/** What limits.json holds for a day: the gateway's caps per handle, the routes, each cluster model's settings and each node's model memory. */
export function usageLimits(site, tz, day) {
  const agents = gatewayConfig(site).agents;
  return {
    timezone: tz,
    day,
    keys: Object.fromEntries(Object.entries(agents).map(([h, a]) => [h, { routes: a.routes ?? null, max_parallel: a.max_parallel ?? null, daily_requests: a.daily_requests ?? null }])),
    routes: site.routes ?? {},
    // A model's own keep_alive and context_length, else its server's, else null.
    models: Object.fromEntries([...clusterModels(site)].map(([b, { server, m }]) => [b, {
      model: m.model ?? null,
      memory_gb: m.memory_gb ?? null,
      keep_alive: m.keep_alive ?? server.keep_alive ?? null,
      context_length: m.context_length ?? server.context_length ?? null,
      server_parallel: server.parallel ?? null,
      server_max_loaded_models: server.max_loaded_models ?? null,
    }])),
    nodes: Object.fromEntries((site.nodes ?? []).map((n) => [n.name, { model_memory_gb: n.model_memory_gb ?? null }])),
  };
}

/**
 * The spend log's lines for each of the days, read once from start to end. A line without a
 * readable time is left out. A missing log gives no lines; any other read error throws, so no day
 * is marked done without its lines.
 */
export async function spendByDay(file, days, tz) {
  const out = Object.fromEntries(days.map((d) => [d, []]));
  if (!days.length) return out;
  const day = dayOf(tz);
  let stream;
  try {
    const fd = fs.openSync(file, "r");
    stream = fs.createReadStream(file, { fd });
  } catch (e) {
    if (e.code === "ENOENT") return out;
    throw e;
  }
  for await (const raw of readline.createInterface({ input: stream, crlfDelay: Infinity })) {
    const line = raw.trim();
    if (!line) continue;
    let t;
    try { t = Date.parse(JSON.parse(line).time); } catch { continue; }
    if (!Number.isFinite(t)) continue;
    const d = day(t);
    if (out[d]) out[d].push(line);
  }
  return out;
}

/** A day's samples file, or "" when the sampler wrote none that day. */
export function samplesOf(dir, day) {
  try { return fs.readFileSync(path.join(dir, `samples-${day}.jsonl`), "utf8"); } catch (e) { if (e.code === "ENOENT") return ""; throw e; }
}

// A folder of the export: made mode 700 when missing. A link or a file in its place stops the export.
function ownDir(dir) {
  try { fs.mkdirSync(dir, { mode: 0o700 }); } catch (e) { if (e.code !== "EEXIST") throw e; }
  const st = fs.lstatSync(dir);
  if (!st.isDirectory()) throw new Error(`${dir} is not a folder`);
  fs.chmodSync(dir, 0o700);
}

// A file of the export: written to a temporary name, mode 600, then renamed into place.
function putFile(dir, name, text) {
  const tmp = path.join(dir, `.${name}.tmp`);
  fs.rmSync(tmp, { force: true });
  fs.writeFileSync(tmp, text, { mode: 0o600, flag: "wx" });
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, path.join(dir, name));
}

/** Deletes each day folder in usageDir more than keep days before today. Returns the deleted days. */
export function cleanDays(usageDir, today, keep = KEEP_DAYS) {
  const oldest = addDays(today, -keep);
  let names = []; try { names = fs.readdirSync(usageDir); } catch { return []; }
  const gone = names.filter((n) => isDay(n) && n < oldest);
  for (const n of gone) fs.rmSync(path.join(usageDir, n), { recursive: true, force: true });
  return gone;
}

/**
 * Runs fn() as the account: the effective user, group and groups switch to the account's, then back
 * to root's. fn must be synchronous, so nothing else runs while the ids are switched.
 */
export function asAccount(account, fn) {
  const r = spawnSync("id", ["-g", account], { encoding: "utf8" });
  const gid = Number(String(r.stdout ?? "").trim());
  if (r.status !== 0 || !Number.isInteger(gid)) throw new Error(`no account ${account}`);
  const euid = process.geteuid(), egid = process.getegid(), groups = process.getgroups();
  process.initgroups(account, gid);
  process.setegid(gid);
  process.seteuid(account);
  try { return fn(); } finally {
    process.seteuid(euid);
    process.setegid(egid);
    try { process.setgroups(groups); } catch { process.initgroups(euid, egid); }
  }
}

/**
 * Exports each finished day that is not done yet to each program with health_report. Returns
 * [{ service, day }] for each day written. A program whose export fails is logged and tried again
 * the next hour, and the other programs go on.
 *   spendLog: the cluster's gateway-logs/spend.jsonl; samplesDir: the cluster agent's usage folder
 *   run(account, fn): fn() as the account (asAccount)
 */
export async function exportUsage({ site, tz, spendLog, samplesDir, now = Date.now(), run = asAccount, log = (line) => console.log(line) }) {
  const services = healthServices(site);
  if (!services.length) return [];
  const today = dayOf(tz)(now);
  const days = exportDays(today);
  const pending = new Map();
  for (const s of services) {
    try {
      pending.set(s.name, run(s.account, () => days.filter((d) => !fs.existsSync(path.join(s.state, "usage", d, "done")))));
    } catch (e) { log(`usage export for ${s.name}: ${e.message}`); }
  }
  const wanted = [...new Set([...pending.values()].flat())].sort();
  const spend = await spendByDay(spendLog, wanted, tz);
  const files = Object.fromEntries(wanted.map((d) => [d, {
    spend: spend[d].map((l) => `${l}\n`).join(""),
    samples: samplesOf(samplesDir, d),
    limits: JSON.stringify(usageLimits(site, tz, d), null, 2) + "\n",
  }]));
  const written = [];
  for (const s of services) {
    if (!pending.has(s.name)) continue;
    try {
      run(s.account, () => {
        const usageDir = path.join(s.state, "usage");
        ownDir(usageDir);
        for (const d of pending.get(s.name)) {
          const dir = path.join(usageDir, d);
          ownDir(dir);
          putFile(dir, "spend.jsonl", files[d].spend);
          putFile(dir, "samples.jsonl", files[d].samples);
          putFile(dir, "limits.json", files[d].limits);
          putFile(dir, "done", "");
          written.push({ service: s.name, day: d });
        }
        cleanDays(usageDir, today);
      });
    } catch (e) { log(`usage export for ${s.name}: ${e.message}`); }
  }
  for (const w of written) log(`usage export: ${w.service} got ${w.day}`);
  return written;
}
