#!/usr/bin/env node
// The model gateway's front door. Every agent turn and every port job sends its model requests
// here, with its own gateway key. The router picks the model for each request from the task's
// "Cloud models" setting (policy.mjs), then passes the request to LiteLLM, which talks to the
// cluster's models and to the cloud providers. LiteLLM sits on a network only the router joins, and
// only LiteLLM holds the cloud keys.
//
//   GET  /health
//   GET  /v1/models          the routes the key's agent may use
//   POST /v1/chat/completions, /v1/completions, /v1/messages
//                            a model request (OpenAI or Anthropic format); "model" names a route
//   POST /task-key           an agent key asks for a task key (port jobs): for { "task": "<id>" }, a
//                            task the agent created or is assigned to; with no body, the task of
//                            the agent's one running turn
// Every other path gets 404, whatever the key: LiteLLM's own endpoints, such as key and model
// management, stay out of reach.
//
// A task's setting and an agent's running turns come from a task source (createGateway's db). With a
// recursicachat_tasks block in gateway.json, the source is the RecursicaChat 2.0 server's gateway
// listener (rc-tasks.mjs): each task's "Model use" setting, for the agents named rc-<handle>. Without
// the block, or for any other agent, no task source answers (noTasks()): each request without a task
// key is outside a task, and cluster only, and /task-key finds no task.
//
// gateway.json's cloud_allowed is the stack's permission for cloud models (kit/render.mjs
// cloudAllowed). Without it, every request stays on the cluster, whatever the task's setting says.
//
// Each move of a task to the cloud is a switch. When a request the router places in its task goes to
// the agent's cloud key, and no cluster answer for the task came since its last switch, the router raises the task's switch
// count n in clocks.json and reports the switch to the task source (db.cloudSwitch(task, n, reason),
// reason "cloud_from_start" for cloud_now and "stalled" for cloud_after_wait). A report that fails
// stays in clocks.json, and the router sends it again each minute; the server keeps one row per
// switch, so a second report of one switch changes nothing. The spend log line of the request that
// made the switch records it as switch: { n, reason }.
//
// The router listens on two ports. Port 4000 serves the stack's own containers. Port 4001 is the
// port for port jobs on other computers, which setup-host.sh publishes only on the control
// computer's Tailscale address. On port 4001 every request needs a task key, /health included.
//
// A program's key (svc-<name>, from recursicachat.services in site.json) has two caps in gateway.json:
// max_parallel, the requests the key may have in flight at once, and daily_requests, the requests the
// key may send each day, midnight to midnight in the cluster's time zone (gateway.json's timezone).
// A request past either cap gets 429 at once, with a JSON error that names the cap. A key without
// caps, such as every agent's, has no such limit. A program's key reaches only its own routes, never a
// cloud model, and never a task: each of its requests is outside a task, so cluster only.
//
// Settings come from gateway.json (written by kit/render.mjs from site.json). State lives in the
// state folder: agent-keys.json (hashes only), task-key.secret, clocks.json (each task's first
// request, first cluster answer, switches and unsent switch reports) and service-counts.json (each capped key's day
// and the requests it sent that day, written at each request, so a restart keeps the count). The
// spend log gets one line per request:
// the time, the task, the agent, the key's name, the route, the server and the model that
// answered, the status and the token counts. The log holds no prompt and no answer.
import dns from "node:dns/promises";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { decide, settingFromRow } from "./policy.mjs";
import { loadKeys, taskKey, taskSecret, verify } from "./keys.mjs";
import { SWITCH_REASONS, rcTasks } from "./rc-tasks.mjs";

const MINUTE = 60_000;
export const SETTING_CACHE_MS = MINUTE;
// The only LiteLLM paths a key reaches.
export const MODEL_PATHS = new Set(["/v1/chat/completions", "/v1/completions", "/v1/messages"]);

// --- addresses -----------------------------------------------------------------------------------
function ipToBig(ip) {
  if (net.isIPv4(ip)) return { v: 4, n: ip.split(".").reduce((a, x) => (a << 8n) + BigInt(Number(x)), 0n) };
  if (!net.isIPv6(ip)) return null;
  let [head, tail = ""] = ip.split("::");
  const parts = (s) => (s ? s.split(":") : []);
  let h = parts(head), t = parts(tail);
  const v4 = (arr) => { const last = arr[arr.length - 1]; if (last && last.includes(".")) { const b = ipToBig(last).n; arr.splice(-1, 1, (b >> 16n).toString(16), (b & 0xffffn).toString(16)); } };
  v4(h); v4(t);
  const fill = ip.includes("::") ? Array(8 - h.length - t.length).fill("0") : [];
  return { v: 6, n: [...h, ...fill, ...t].reduce((a, x) => (a << 16n) + BigInt(parseInt(x || "0", 16)), 0n) };
}
// "::ffff:172.18.0.5" is an IPv4 address.
export const plainIp = (ip) => String(ip ?? "").replace(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/, "$1").replace(/%.*$/, "");
export function inCidr(ip, cidr) {
  const [base, bits] = cidr.split("/");
  const a = ipToBig(plainIp(ip)), b = ipToBig(base);
  if (!a || !b || a.v !== b.v) return false;
  const width = a.v === 4 ? 32n : 128n;
  const n = bits === undefined ? width : BigInt(bits);
  const shift = width - n;
  return a.n >> shift === b.n >> shift;
}

// Who may use a key: this container's own networks (such as the job filter's on this computer),
// the computer itself, and the stack's other computers from site.json.
export async function allowedSources(nodeAddresses, resolve = (h) => dns.lookup(h, { all: true })) {
  const out = ["127.0.0.0/8", "::1/128"];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list ?? []) if (i.cidr) out.push(i.cidr);
  for (const a of nodeAddresses ?? []) {
    if (net.isIP(a)) { out.push(a); continue; }
    try { for (const r of await resolve(a)) out.push(r.address); } catch { /* a name the container cannot resolve: use the computer's Tailscale IP in site.json */ }
  }
  return out;
}

// --- state ---------------------------------------------------------------------------------------
function jsonFile(file, fallback) {
  let data; try { data = JSON.parse(fs.readFileSync(file, "utf8")); } catch { data = fallback; }
  let timer = null;
  return {
    data,
    save() {
      if (timer) return;
      timer = setTimeout(() => { timer = null; fs.writeFileSync(`${file}.tmp`, JSON.stringify(data)); fs.renameSync(`${file}.tmp`, file); }, 200);
      timer.unref?.();
    },
  };
}

// The day a moment falls on in a time zone, as YYYY-MM-DD. An unknown time zone counts in UTC.
export function dayIn(ms, timeZone = "UTC") {
  let f;
  try { f = new Intl.DateTimeFormat("en-CA", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }); } catch { f = new Intl.DateTimeFormat("en-CA", { timeZone: "UTC", year: "numeric", month: "2-digit", day: "2-digit" }); }
  const p = Object.fromEntries(f.formatToParts(new Date(ms)).map((x) => [x.type, x.value]));
  return `${p.year}-${p.month}-${p.day}`;
}

// The caps of each key that has some (gateway.json's max_parallel and daily_requests): the requests
// in flight, kept in memory, and each day's count, kept in <state>/service-counts.json. The count is
// written before the request goes on, so a restart never forgets a request.
export function createCaps({ stateDir, timeZone = "UTC", now = Date.now }) {
  const file = path.join(stateDir, "service-counts.json");
  let counts = {};
  try { counts = JSON.parse(fs.readFileSync(file, "utf8")) ?? {}; } catch { /* no count yet */ }
  const inFlight = new Map();
  const save = () => { fs.writeFileSync(`${file}.tmp`, JSON.stringify(counts)); fs.renameSync(`${file}.tmp`, file); };
  return {
    // { ok: true, release } for a request within the caps, or { ok: false, type, message }.
    take(handle, { max_parallel: parallel, daily_requests: daily }) {
      const day = dayIn(now(), timeZone);
      const used = counts[handle]?.day === day ? counts[handle].requests : 0;
      if (Number.isInteger(daily) && used >= daily) {
        return { ok: false, type: "daily_limit", message: `${handle} has sent its ${daily} requests for ${day} (${timeZone}). The count starts again at midnight in ${timeZone}.` };
      }
      const busy = inFlight.get(handle) ?? 0;
      if (Number.isInteger(parallel) && busy >= parallel) {
        return { ok: false, type: "too_many_at_once", retryAfter: 1, message: `${handle} already has ${busy} requests in flight, its max_parallel. Send the next one when one finishes.` };
      }
      if (Number.isInteger(daily)) { counts[handle] = { day, requests: used + 1 }; save(); }
      inFlight.set(handle, busy + 1);
      let done = false;
      return { ok: true, release() { if (done) return; done = true; inFlight.set(handle, inFlight.get(handle) - 1); } };
    },
    inFlight: (handle) => inFlight.get(handle) ?? 0,
    count: (handle) => (counts[handle]?.day === dayIn(now(), timeZone) ? counts[handle].requests : 0),
  };
}
const capped = (agent) => agent?.max_parallel !== undefined || agent?.daily_requests !== undefined;

// --- the gateway ---------------------------------------------------------------------------------
// createGateway({ config, db, litellm, litellmKey, stateDir, spendLog, now, allow, refreshAllow })
//   db          the task source: { runTasks(handle) -> the task id of each of the agent's running
//                 turns (null for a turn outside a task), onTask(handle, task) -> true when the
//                 agent created or is assigned to the task, setting(task) -> row or null }. The
//                 default, noTasks(), knows no task. An optional cloudSwitch(task, n, reason)
//                 takes each switch report: "recorded", "duplicate" or "refused", or throws to be
//                 asked again after switchRetryMs.
//   litellm     LiteLLM's base URL, such as http://cc-litellm:4000
//   litellmKey  LiteLLM's master key. Only the router holds the master key, never an agent.
//   allow    the address ranges allowed to use a key (allowedSources)
//   refreshAllow  reads the address ranges again (allowedSources), for a network the container
//                 joined after the gateway started
export function createGateway({ config, db = noTasks(), litellm, litellmKey = "", stateDir, spendLog, now = Date.now, allow = ["127.0.0.0/8", "::1/128"], refreshAllow = null, retryMs = 5000, switchRetryMs = MINUTE }) {
  // setup-host.sh starts the gateway on one network and connects its other networks after the
  // start. A source outside the ranges read so far makes the gateway
  // read its networks again, at most every 5 seconds, before it refuses the key.
  let allowed = allow, readAt = -Infinity;
  const listed = (ip) => allowed.some((c) => inCidr(ip, c.includes("/") ? c : `${c}/${net.isIPv4(c) ? 32 : 128}`));
  async function insideCluster(ip) {
    if (listed(ip)) return true;
    if (!refreshAllow || now() - readAt < 5000) return false;
    readAt = now();
    try { allowed = await refreshAllow(); } catch { /* keep the ranges read before */ }
    return listed(ip);
  }
  fs.mkdirSync(stateDir, { recursive: true });
  const secret = taskSecret(stateDir);
  const clocks = jsonFile(path.join(stateDir, "clocks.json"), {});
  const caps = createCaps({ stateDir, timeZone: config.timezone ?? "UTC", now });
  const settings = new Map();
  let keys = {}, keysAt = null;
  const keyFile = path.join(stateDir, "agent-keys.json");
  const currentKeys = () => {
    // rc-gateway-key.mjs and keys.mjs change the file while the gateway runs: a revoke applies at once.
    // Each save replaces the file, so a new inode marks a change even within one clock tick.
    let m = ""; try { const st = fs.statSync(keyFile); m = `${st.ino}:${st.mtimeMs}:${st.size}`; } catch { /* no keys yet */ }
    if (m !== keysAt) { keys = loadKeys(stateDir); keysAt = m; }
    return keys;
  };

  async function settingOf(task) {
    const hit = settings.get(task);
    if (hit && now() - hit.at < SETTING_CACHE_MS) return hit.setting;
    let setting;
    try { setting = settingFromRow(await db.setting(task)); } catch { setting = hit?.setting ?? { mode: "cluster_only" }; }
    settings.set(task, { setting, at: now() });
    return setting;
  }

  // Switch reports: each task's unsent reports wait in clocks.json (clock.reports) until the task
  // source takes them. A report the source refuses, or one older than a week, is dropped.
  const sending = new Set();
  async function sendSwitches() {
    if (typeof db.cloudSwitch !== "function") return;
    for (const [task, clock] of Object.entries(clocks.data)) {
      for (const r of [...(clock?.reports ?? [])]) {
        const id = `${task}:${r.n}`;
        if (sending.has(id)) continue;
        sending.add(id);
        let done = now() - r.at > 7 * 24 * 60 * MINUTE;
        if (!done) { try { done = Boolean(await db.cloudSwitch(task, r.n, r.reason)); } catch { /* asked again later */ } }
        sending.delete(id);
        if (done) { clock.reports = clock.reports.filter((x) => x.n !== r.n); if (!clock.reports.length) delete clock.reports; clocks.save(); }
      }
    }
  }
  if (typeof db.cloudSwitch === "function") {
    const timer = setInterval(() => { sendSwitches().catch(() => {}); }, switchRetryMs);
    timer.unref?.();
    // Reports a restart left unsent.
    setImmediate(() => { sendSwitches().catch(() => {}); });
  }
  // A request for the task goes to the cloud: a new switch unless the task's last request did too.
  function switchTo(task, clock, mode) {
    if (!clock || clock.onCloud) return null;
    const n = (clock.switches ?? 0) + 1;
    const reason = SWITCH_REASONS[mode] ?? "stalled";
    Object.assign(clock, { switches: n, onCloud: true });
    (clock.reports ??= []).push({ n, reason, at: now() });
    clocks.save();
    setImmediate(() => { sendSwitches().catch(() => {}); });
    return { n, reason };
  }

  function log(entry) {
    if (!spendLog) return;
    fs.appendFile(spendLog, JSON.stringify({ time: new Date(now()).toISOString(), ...entry }) + "\n", () => {});
  }

  // Send one request to LiteLLM. Resolves once LiteLLM answers with headers, or rejects.
  function upstream(req, pathname, body, signal) {
    return new Promise((resolve, reject) => {
      const u = new URL(pathname, litellm);
      const payload = Buffer.from(JSON.stringify(body));
      const headers = { "content-type": "application/json", "content-length": payload.length, ...(litellmKey ? { authorization: `Bearer ${litellmKey}` } : {}) };
      for (const h of ["anthropic-version", "anthropic-beta", "accept"]) if (req.headers[h]) headers[h] = req.headers[h];
      const r = http.request(u, { method: "POST", headers, signal }, resolve);
      r.on("error", reject);
      r.end(payload);
    });
  }

  // Pass LiteLLM's answer to the caller, and read the model and token counts on the way past.
  function relay(res, up, entry) {
    const skip = new Set(["connection", "transfer-encoding", "keep-alive", "content-length"]);
    res.writeHead(up.statusCode, Object.fromEntries(Object.entries(up.headers).filter(([k]) => !skip.has(k))));
    // LiteLLM's x-litellm-model-id header is "<name>|<model that answered>" (kit/render.mjs), and
    // gateway.json names that model's server: "<node>/<server id>" for a cluster model, or the
    // provider for a cloud model.
    const id = String(up.headers["x-litellm-model-id"] ?? "");
    const answered = id.includes("|") ? id.slice(id.indexOf("|") + 1) : null;
    const info = answered ? config.models?.[answered] : null;
    const seen = { model: null, input: null, output: null };
    let whole = "", pending = "";
    const read = (o) => {
      if (!o || typeof o !== "object") return;
      seen.model = o.model ?? o.message?.model ?? seen.model;
      const u = o.usage ?? o.message?.usage;
      if (u) {
        seen.input = u.prompt_tokens ?? u.input_tokens ?? seen.input;
        seen.output = u.completion_tokens ?? u.output_tokens ?? seen.output;
      }
    };
    up.on("data", (c) => {
      res.write(c);
      const text = c.toString("utf8");
      if (whole.length < 2_000_000) whole += text;
      // A streamed answer sends one JSON object per "data:" line.
      const lines = (pending + text).split("\n");
      pending = lines.pop();
      for (const l of lines) {
        const v = l.startsWith("data:") ? l.slice(5).trim() : "";
        if (v && v !== "[DONE]") { try { read(JSON.parse(v)); } catch { /* not JSON */ } }
      }
    });
    up.on("end", () => {
      if (!seen.model && whole.trim().startsWith("{")) { try { read(JSON.parse(whole)); } catch { /* not JSON */ } }
      res.end();
      log({ ...entry, server: info?.server ?? null, model: info?.model ?? answered ?? seen.model, backend: answered, status: up.statusCode, input_tokens: seen.input, output_tokens: seen.output });
    });
    up.on("error", () => res.destroy());
  }

  const fail = (res, code, type, message, headers = {}) => {
    res.writeHead(code, { "content-type": "application/json", ...headers });
    res.end(JSON.stringify({ error: { type, message } }));
  };
  const wait = (ms, signal) => new Promise((r) => { const t = setTimeout(r, Math.max(0, ms)); signal.addEventListener("abort", () => { clearTimeout(t); r(); }, { once: true }); });

  async function modelRequest(req, res, pathname, who) {
    let raw = "";
    for await (const c of req) { raw += c; if (raw.length > 50_000_000) return fail(res, 413, "too_large", "The request is too large."); }
    let body; try { body = JSON.parse(raw); } catch { return fail(res, 400, "bad_json", "The request body is not JSON."); }
    // A key for a handle site.json does not list gets no route and no cloud model: the gateway fails
    // closed, whatever an older gateway.json says about a fallback.
    const agent = config.agents?.[who.agent];
    if (!agent) return fail(res, 403, "unknown_agent", `Agent ${who.agent} is not in site.json's agents, so the agent's key reaches no model.`);
    const routes = agent.routes ?? [];
    let route = body.model;
    if (!routes.includes(route)) {
      if (config.routes?.[route] || String(route).startsWith("key/")) return fail(res, 403, "route_not_allowed", `Agent ${who.agent} may use ${routes.join(", ") || "no route"}, not ${route}.`);
      route = routes[0];
    }
    if (!route) return fail(res, 403, "no_route", `Agent ${who.agent} has no route in site.json.`);
    // A key with caps: refused at once past either cap, and counted otherwise. The slot is free
    // again when the answer ends or the caller goes.
    if (capped(agent)) {
      const slot = caps.take(who.agent, agent);
      if (!slot.ok) {
        log({ task: null, agent: who.agent, route, key: null, model: null, status: 429, reason: slot.type });
        return fail(res, 429, slot.type, slot.message, slot.retryAfter ? { "retry-after": String(slot.retryAfter) } : {});
      }
      res.once("close", slot.release);
    }
    // The request's task: the task key's task, or the task of the agent's running turn. With more
    // than one running turn the router cannot tell which task the request belongs to, so the
    // request stays on the cluster, whatever the tasks' settings say. A program's key has no task.
    let tasks = [who.task];
    if (agent.service) tasks = [null];
    else if (!who.task) { try { tasks = [...new Set(await db.runTasks(who.agent))]; } catch { tasks = [null]; } }
    if (tasks.length === 0) tasks = [null];
    const unsure = tasks.length > 1;
    // The stack's permission for cloud models, the agent's cloud switch and the agent's key all
    // decide before any task setting does (policy.mjs).
    const view = { stack: config.cloud_allowed === true, cloud: agent.cloud !== false, key: agent.key ?? null, local: Boolean(config.routes?.[route]?.local) };
    const options = [];
    for (const t of tasks) {
      const setting = t ? await settingOf(t) : { mode: "cluster_only" };
      // A clock starts only for a request the router can place in its task.
      let clock = t ? clocks.data[t] ?? null : null;
      if (t && !unsure && !clock) { clock = clocks.data[t] = { firstRequestAt: now(), mode: setting.mode }; clocks.save(); }
      // A changed setting starts the task's clock again, so its stall counts from now and a task
      // turned down to the cluster first tries the cluster again. The switch count keeps counting.
      if (clock && !unsure && clock.mode !== setting.mode) {
        if (clock.mode !== undefined) { clock.firstRequestAt = now(); delete clock.startedAt; clock.onCloud = false; }
        clock.mode = setting.mode;
        clocks.save();
      }
      options.push({ task: t, clock, setting, d: decide({ task: t, setting, agent: view, clock, now: now() }) });
    }
    const picked = strictest(options);
    const { task, clock, setting } = picked;
    // A request the router cannot place in one task never goes to the cloud: every move to the
    // cloud is a switch, and a switch belongs to one task.
    const UNPLACED = "the request could not be placed in one task";
    const d = !unsure ? picked.d : view.local ? { target: "cluster", reason: UNPLACED } : { target: "fail", reason: `no cluster model, and ${UNPLACED}` };
    const entry = { task, agent: who.agent, route, ...(unsure ? { tasks, reason: d.reason } : {}) };
    const gone = new AbortController();
    res.on("close", () => { if (!res.writableEnded) gone.abort(); });

    const toCloud = async (reason) => {
      const model = config.keys?.[view.key]?.model;
      const sw = switchTo(task, clock, setting?.mode);
      const up = await upstream(req, pathname, { ...body, model }, gone.signal);
      relay(res, up, { ...entry, key: view.key, reason, ...(sw ? { switch: sw } : {}) });
    };

    if (d.target === "fail") {
      const text = `The model gateway cannot run this task: ${d.reason}. Add a cluster model to the stack's site.json, or change the task's Cloud models setting.`;
      log({ ...entry, key: null, model: null, status: 409, reason: d.reason });
      return fail(res, 409, "no_cluster_model", text);
    }
    try {
      if (d.target === "cloud") return await toCloud(d.reason);
      // The cluster. A request waits as long as the cluster needs; an error or a full model server
      // means try again, never the cloud. Only the task's wait (d.until) moves the request to the cloud.
      let delay = retryMs;
      for (;;) {
        if (gone.signal.aborted) return;
        const left = d.until === undefined ? null : d.until - now();
        if (left !== null && left <= 0) return await toCloud("the task passed its wait");
        if (!view.local) { await wait(left, gone.signal); continue; }
        const stop = new AbortController();
        const onGone = () => stop.abort();
        gone.signal.addEventListener("abort", onGone, { once: true });
        const timer = left === null ? null : setTimeout(() => stop.abort(), left);
        try {
          const up = await upstream(req, pathname, { ...body, model: route }, stop.signal);
          if (timer) clearTimeout(timer);
          if (up.statusCode >= 500 || up.statusCode === 429) { up.resume(); throw new Error(`cluster answered ${up.statusCode}`); }
          // The cluster's answer starts the task, and ends the task's time on the cloud: the task's
          // next move to the cloud is a new switch.
          if (clock && !unsure && up.statusCode < 300 && (!clock.startedAt || clock.onCloud)) { clock.startedAt ??= now(); clock.onCloud = false; clocks.save(); }
          return relay(res, up, { ...entry, key: "cluster" });
        } catch {
          if (timer) clearTimeout(timer);
          if (gone.signal.aborted) return;
          if (stop.signal.aborted) continue;   // the task's wait ran out: the loop moves to the cloud
          await wait(left === null ? delay : Math.min(delay, left), gone.signal);
          delay = Math.min(delay * 2, 60_000);
        } finally {
          gone.signal.removeEventListener("abort", onGone);
        }
      }
    } catch (e) {
      if (!res.headersSent) fail(res, 502, "gateway_error", `The model gateway could not reach a model: ${e.message}`);
    }
  }

  async function serve(req, res, jobsPort) {
    try {
      const { pathname } = new URL(req.url, "http://gateway");
      if (pathname === "/health" && !jobsPort) { res.writeHead(200, { "content-type": "application/json" }); return res.end('{"ok":true}'); }
      if (!(await insideCluster(req.socket.remoteAddress))) {
        return fail(res, 403, "outside_cluster", "A gateway key works only inside the cluster.");
      }
      const auth = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || String(req.headers["x-api-key"] ?? "");
      const who = verify(auth, currentKeys(), secret);
      if (!who) return fail(res, 401, "invalid_key", "Unknown or revoked gateway key.");
      if (jobsPort && !who.task) return fail(res, 401, "task_key_needed", "This port takes only a port job's task key.");
      if (pathname === "/health") { res.writeHead(200, { "content-type": "application/json" }); return res.end('{"ok":true}'); }
      if (req.method === "POST" && pathname === "/task-key") {
        if (who.task) return fail(res, 403, "agent_key_needed", "Only an agent key gets a task key.");
        if (config.agents?.[who.agent]?.service) return fail(res, 403, "agent_key_needed", "A program's key gets no task key: only an agent key does.");
        let raw = ""; for await (const c of req) { raw += c; if (raw.length > 10_000) break; }
        let asked = null; try { asked = raw.trim() ? JSON.parse(raw).task ?? null : null; } catch { return fail(res, 400, "bad_json", "The request body is not JSON."); }
        let task = null;
        if (asked !== null) {
          if (typeof asked !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(asked)) return fail(res, 400, "bad_task", "task must be a task id.");
          let ok = false; try { ok = await db.onTask(who.agent, asked); } catch { /* no database: no task */ }
          if (!ok) return fail(res, 403, "not_on_task", `Agent ${who.agent} neither created task ${asked} nor is assigned to the task.`);
          task = asked;
        } else {
          let running = [];
          try { running = [...new Set(await db.runTasks(who.agent))]; } catch { /* no database: no task */ }
          if (running.length > 1) return fail(res, 409, "many_tasks", `Agent ${who.agent} has more than one running turn. Name the task: {"task": "<task id>"}.`);
          task = running[0] ?? null;
        }
        if (!task) return fail(res, 409, "no_task", `Agent ${who.agent} has no running task. Name the task: {"task": "<task id>"}.`);
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ key: taskKey(secret, currentKeys(), who.agent, task), task }));
      }
      if (req.method === "GET" && pathname === "/v1/models") {
        const routes = config.agents?.[who.agent]?.routes ?? [];
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: routes.map((id) => ({ id, object: "model", owned_by: "cluster" })) }));
      }
      if (req.method === "POST" && MODEL_PATHS.has(pathname)) return await modelRequest(req, res, pathname, who);
      return fail(res, 404, "not_found", "The gateway passes on only model requests: POST /v1/chat/completions, /v1/completions or /v1/messages.");
    } catch (e) {
      if (!res.headersSent) fail(res, 500, "internal", e.message);
    }
  }
  const handler = (req, res) => serve(req, res, false);
  // The handler for port 4001, the port for port jobs.
  handler.jobs = (req, res) => serve(req, res, true);
  // Sends each unsent switch report now, for the tests.
  handler.sendSwitches = sendSwitches;
  return handler;
}

// The strictest of several decisions, for a request the router cannot place in one task: the task the
// spend log names. The request itself stays on the cluster (modelRequest). Cluster
// only (or a failure for want of a cluster model) beats any cloud use; a later move to the cloud
// beats an earlier one; cloud now comes last. Each option is { task, clock, setting, d }.
export function strictest(options) {
  const late = ({ d }) => (d.target === "cloud" ? -Infinity : d.until ?? Infinity);
  return options.reduce((a, b) => (late(b) > late(a) || (late(b) === late(a) && b.d.target === "fail") ? b : a));
}

// The task source when none runs: each lookup fails at once, as with a source the router cannot
// reach. So each request without a task key is outside a task, and cluster only.
export function noTasks() {
  const none = async () => { throw new Error("no task source"); };
  return { runTasks: none, setting: none, onTask: none };
}

// The task source gateway.json names: the RecursicaChat 2.0 server's gateway listener, with
// recursicachat_tasks { url, key_file, stall_minutes, handles }, or none. RC_TASKS_URL and
// RC_TASKS_KEY_FILE replace the block's url and key_file.
export function taskSource(config, env = {}) {
  const rc = config.recursicachat_tasks;
  const url = env.RC_TASKS_URL || rc?.url;
  const keyFile = env.RC_TASKS_KEY_FILE || rc?.key_file;
  if (!rc || typeof rc !== "object" || !url || !keyFile) return Object.assign(noTasks(), { describe: "task source: none, so every request is outside a task, and cluster only" });
  const source = rcTasks({ url, keyFile, handles: rc.handles ?? {}, stallMinutes: rc.stall_minutes });
  let hasKey = false;
  try { hasKey = fs.readFileSync(keyFile, "utf8").trim() !== ""; } catch { /* no key yet */ }
  const note = hasKey ? "" : `; no key in ${keyFile} yet, so every request stays on the cluster until the key is there`;
  return Object.assign(source, { describe: `task source: RecursicaChat at ${url}, for ${Object.keys(rc.handles ?? {}).length} agent(s)${note}` });
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = process.env;
  const config = JSON.parse(fs.readFileSync(env.GATEWAY_CONFIG ?? "/etc/gateway/gateway.json", "utf8"));
  const allow = await allowedSources(config.nodes);
  const db = taskSource(config, env);
  const handler = createGateway({
    config, db, litellm: env.LITELLM_URL ?? "http://cc-litellm:4000",
    litellmKey: fs.readFileSync(env.LITELLM_KEY_FILE ?? "/state/litellm-master.key", "utf8").trim(),
    stateDir: env.GATEWAY_STATE ?? "/state", spendLog: env.SPEND_LOG ?? "/logs/spend.jsonl", allow,
    refreshAllow: () => allowedSources(config.nodes),
  });
  // A turn can wait for the cluster for as long as the turn runs.
  for (const [port, h] of [[4000, handler], [4001, handler.jobs]]) {
    const server = http.createServer(h);
    server.requestTimeout = 0; server.headersTimeout = 0; server.keepAliveTimeout = 65_000;
    server.listen(port, "0.0.0.0");
  }
  console.log(`gateway on :4000, and :4001 for port jobs; ${Object.keys(config.agents ?? {}).length} agent(s) in site.json`);
  console.log(db.describe);
}
