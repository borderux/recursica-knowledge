#!/usr/bin/env node
// The model gateway's front door. Every agent turn and every port job sends its model requests
// here, with its own gateway key. The router picks the model for each request from the task's
// "Cloud models" setting (policy.mjs), then passes the request to LiteLLM, which talks to the
// cluster's models and to the cloud providers. LiteLLM sits on a network only the router joins, and
// only LiteLLM holds the cloud keys.
//
//   GET  /health
//   GET  /v1/models          the routes the key's agent may use
//   POST /v1/...             a model request (OpenAI or Anthropic format); "model" names a route
//   POST /task-key           an agent key asks for a task key (port jobs): for { "task": "<id>" }, a
//                            task the agent created or is assigned to; with no body, the task of
//                            the agent's running turn
//
// Settings come from gateway.json (written by kit/render.mjs from site.json). State lives in the
// state folder: agent-keys.json (hashes only), task-key.secret, clocks.json (each task's first
// request and first cluster answer) and notified.json. The spend log gets one line per request:
// the time, the task, the agent, the key's name, the route, the model that answered, the status
// and the token counts. The log holds no prompt and no answer.
import dns from "node:dns/promises";
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { decide, settingFromRow } from "./policy.mjs";
import { loadKeys, taskKey, taskSecret, verify } from "./keys.mjs";

const MINUTE = 60_000;
export const SETTING_CACHE_MS = MINUTE;

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

// Who may use a key: this container's own networks (the stack's agents, the job filter on this
// computer), the computer itself, and the stack's other computers from site.json.
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

// --- the gateway ---------------------------------------------------------------------------------
// createGateway({ config, db, litellm, litellmKey, stateDir, spendLog, apiBase, now, allow })
//   db          { runTask(handle) -> task id or null, onTask(handle, task) -> true when the agent created
//                 or is assigned to the task, setting(task) -> row or null, botToken(handle) }
//   litellm     LiteLLM's base URL, such as http://cc-litellm:4000
//   litellmKey  LiteLLM's master key. Only the router holds the master key, never an agent.
//   allow    the address ranges allowed to use a key (allowedSources)
export function createGateway({ config, db, litellm, litellmKey = "", stateDir, spendLog, apiBase, now = Date.now, allow = ["127.0.0.0/8", "::1/128"], retryMs = 5000 }) {
  fs.mkdirSync(stateDir, { recursive: true });
  const secret = taskSecret(stateDir);
  const clocks = jsonFile(path.join(stateDir, "clocks.json"), {});
  const notified = jsonFile(path.join(stateDir, "notified.json"), {});
  const settings = new Map();
  let keys = {}, keysAt = null;
  const keyFile = path.join(stateDir, "agent-keys.json");
  const currentKeys = () => {
    // setup-agent.sh and keys.mjs change the file while the gateway runs: a revoke applies at once.
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

  function log(entry) {
    if (!spendLog) return;
    fs.appendFile(spendLog, JSON.stringify({ time: new Date(now()).toISOString(), ...entry }) + "\n", () => {});
  }

  async function tellTask(task, agent, text) {
    if (!task || notified.data[task] || !apiBase) return;
    notified.data[task] = new Date(now()).toISOString(); notified.save();
    try {
      const token = await db.botToken(agent);
      if (!token) return;
      await fetch(`${apiBase}/agent-api/tasks/${encodeURIComponent(task)}/comments`, {
        method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${token}` },
        body: JSON.stringify({ bodyMd: text }),
      });
    } catch { /* the error also reaches the agent's turn */ }
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
    // LiteLLM's x-litellm-model-id header is "<name>|<model that answered>" (kit/render.mjs).
    const id = String(up.headers["x-litellm-model-id"] ?? "");
    const answered = id.includes("|") ? id.slice(id.indexOf("|") + 1) : null;
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
      log({ ...entry, model: answered ?? seen.model, status: up.statusCode, input_tokens: seen.input, output_tokens: seen.output });
    });
    up.on("error", () => res.destroy());
  }

  const fail = (res, code, type, message) => {
    res.writeHead(code, { "content-type": "application/json" });
    res.end(JSON.stringify({ error: { type, message } }));
  };
  const wait = (ms, signal) => new Promise((r) => { const t = setTimeout(r, Math.max(0, ms)); signal.addEventListener("abort", () => { clearTimeout(t); r(); }, { once: true }); });

  async function modelRequest(req, res, pathname, who) {
    let raw = "";
    for await (const c of req) { raw += c; if (raw.length > 50_000_000) return fail(res, 413, "too_large", "The request is too large."); }
    let body; try { body = JSON.parse(raw); } catch { return fail(res, 400, "bad_json", "The request body is not JSON."); }
    const agent = config.agents?.[who.agent] ?? config.fallback;
    const routes = agent?.routes ?? [];
    let route = body.model;
    if (!routes.includes(route)) {
      if (config.routes?.[route] || String(route).startsWith("key/")) return fail(res, 403, "route_not_allowed", `Agent ${who.agent} may use ${routes.join(", ") || "no route"}, not ${route}.`);
      route = routes[0];
    }
    if (!route) return fail(res, 403, "no_route", `Agent ${who.agent} has no route in site.json.`);
    let task = who.task;
    if (!task) { try { task = await db.runTask(who.agent); } catch { task = null; } }
    const setting = task ? await settingOf(task) : { mode: "cluster_only" };
    let clock = null;
    if (task) {
      clock = clocks.data[task] ??= { firstRequestAt: now() };
      clocks.save();
    }
    const view = { cloud: agent.cloud !== false, key: agent.key ?? null, local: Boolean(config.routes?.[route]?.local) };
    const entry = { task, agent: who.agent, route };
    const gone = new AbortController();
    res.on("close", () => { if (!res.writableEnded) gone.abort(); });

    const toCloud = async (reason) => {
      const model = config.keys?.[view.key]?.model;
      const up = await upstream(req, pathname, { ...body, model }, gone.signal);
      relay(res, up, { ...entry, key: view.key, reason });
    };

    const d = decide({ task, setting, agent: view, clock, now: now() });
    if (d.target === "fail") {
      const text = `The model gateway cannot run this task: ${d.reason}. Add a cluster model to the stack's site.json, or change the task's Cloud models setting.`;
      await tellTask(task, who.agent, text);
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
          if (task && up.statusCode < 300 && !clock.startedAt) { clock.startedAt = now(); clocks.save(); }
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

  return async (req, res) => {
    try {
      const { pathname } = new URL(req.url, "http://gateway");
      if (pathname === "/health") { res.writeHead(200, { "content-type": "application/json" }); return res.end('{"ok":true}'); }
      if (!allow.some((c) => inCidr(req.socket.remoteAddress, c.includes("/") ? c : `${c}/${net.isIPv4(c) ? 32 : 128}`))) {
        return fail(res, 403, "outside_cluster", "A gateway key works only inside the cluster.");
      }
      const auth = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "") || String(req.headers["x-api-key"] ?? "");
      const who = verify(auth, currentKeys(), secret);
      if (!who) return fail(res, 401, "invalid_key", "Unknown or revoked gateway key.");
      if (req.method === "POST" && pathname === "/task-key") {
        if (who.task) return fail(res, 403, "agent_key_needed", "Only an agent key gets a task key.");
        let raw = ""; for await (const c of req) { raw += c; if (raw.length > 10_000) break; }
        let asked = null; try { asked = raw.trim() ? JSON.parse(raw).task ?? null : null; } catch { return fail(res, 400, "bad_json", "The request body is not JSON."); }
        let task = null;
        if (asked !== null) {
          if (typeof asked !== "string" || !/^[A-Za-z0-9_-]{1,64}$/.test(asked)) return fail(res, 400, "bad_task", "task must be a task id.");
          let ok = false; try { ok = await db.onTask(who.agent, asked); } catch { /* no database: no task */ }
          if (!ok) return fail(res, 403, "not_on_task", `Agent ${who.agent} neither created task ${asked} nor is assigned to the task.`);
          task = asked;
        } else {
          try { task = await db.runTask(who.agent); } catch { /* no database: no task */ }
        }
        if (!task) return fail(res, 409, "no_task", `Agent ${who.agent} has no running task. Name the task: {"task": "<task id>"}.`);
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ key: taskKey(secret, currentKeys(), who.agent, task), task }));
      }
      if (req.method === "GET" && pathname === "/v1/models") {
        const routes = (config.agents?.[who.agent] ?? config.fallback)?.routes ?? [];
        res.writeHead(200, { "content-type": "application/json" });
        return res.end(JSON.stringify({ object: "list", data: routes.map((id) => ({ id, object: "model", owned_by: "cluster" })) }));
      }
      if (req.method === "POST" && pathname.startsWith("/v1/")) return await modelRequest(req, res, pathname, who);
      return fail(res, 404, "not_found", "Unknown path.");
    } catch (e) {
      if (!res.headersSent) fail(res, 500, "internal", e.message);
    }
  };
}

// CircleChat's database: the task an agent's running turn works on (CircleChat stores it in
// agent_runs.context_json.runTask), the task's setting, and the agent's bot token.
export function pgDb(url, pg) {
  const pool = new pg.Pool({ connectionString: url, max: 4 });
  const one = async (sql, args) => (await pool.query(sql, args)).rows[0] ?? null;
  return {
    async runTask(handle) {
      const r = await one(`select r.context_json->'runTask'->>'taskId' as task from agent_runs r join agents a on a.id = r.agent_id
        where a.handle = $1 and r.status = 'running' order by r.started_at desc limit 1`, [handle]);
      return r?.task ?? null;
    },
    async setting(task) {
      return one("select mode, max_start_wait_minutes, max_finish_minutes from task_cloud_models where task_id = $1", [task]).catch((e) => {
        if (e.code === "42P01") return null;   // a CircleChat without the setting: cluster only
        throw e;
      });
    },
    async onTask(handle, task) {
      return Boolean(await one(`select 1 from tasks t
        join members m on m.workspace_id = t.workspace_id and m.kind = 'agent'
        join agents a on a.id = m.ref_id and a.handle = $1
        where t.id = $2 and (t.created_by = m.id or exists (select 1 from task_assignees ta where ta.task_id = t.id and ta.member_id = m.id))`, [handle, task]));
    },
    async botToken(handle) { return (await one("select bot_token from agents where handle = $1 limit 1", [handle]))?.bot_token ?? null; },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = process.env;
  const config = JSON.parse(fs.readFileSync(env.GATEWAY_CONFIG ?? "/etc/gateway/gateway.json", "utf8"));
  const { default: pg } = await import("pg");
  const allow = await allowedSources(config.nodes);
  const handler = createGateway({
    config, db: pgDb(env.DATABASE_URL, pg), litellm: env.LITELLM_URL ?? "http://cc-litellm:4000",
    litellmKey: fs.readFileSync(env.LITELLM_KEY_FILE ?? "/state/litellm-master.key", "utf8").trim(),
    stateDir: env.GATEWAY_STATE ?? "/state", spendLog: env.SPEND_LOG ?? "/logs/spend.jsonl", apiBase: env.CC_API ?? "http://api:3000/api", allow,
  });
  const server = http.createServer(handler);
  // A turn can wait for the cluster for as long as the turn runs.
  server.requestTimeout = 0; server.headersTimeout = 0; server.keepAliveTimeout = 65_000;
  server.listen(4000, "0.0.0.0", () => console.log(`gateway on :4000, ${Object.keys(config.agents ?? {}).length} agent(s) in site.json`));
}
