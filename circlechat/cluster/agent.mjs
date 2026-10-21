// The cluster agent: one root service on each computer. It runs the intrusion guard every minute,
// reads the decoys' log, carries out the actions the Slack app sends, and runs scheduled reboots.
//
// Settings come from /etc/agent-cluster.env (root only), written by install-cluster.sh:
//   COMPUTER, CLUSTER_TOKEN, AGENT_BIND (addresses to listen on), AGENT_PORT,
//   SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, OWNER, OWNER_HOME, KIT, EVIDENCE_RECIPIENT, BACKUP_REMOTE,
//   CANARY_LOG
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawn, spawnSync, execFile } from "node:child_process";
import { Guard } from "./guard.mjs";
import { makePlatform } from "./platform.mjs";
import { buttonBlocks, nextAt, formatEt } from "./actions.mjs";
import { slackApi, parsePairs } from "./bot.mjs";
import { Monitor, localStacks } from "./monitor.mjs";
import { Egress } from "./egress.mjs";

export function makeAgent({ env, platform, guard, post, now = () => Date.now(), stateDir, monitor, stacks = async () => [], egress }) {
  const rebootFile = path.join(stateDir, "reboot.json");
  const readReboot = () => { try { return JSON.parse(fs.readFileSync(rebootFile, "utf8")); } catch { return null; } };
  const schedule = (at, ref, label) => {
    fs.writeFileSync(rebootFile, JSON.stringify({ at, ref }), { mode: 0o600 });
    return { ok: true, message: `updates install, then ${env.COMPUTER} reboots, at ${label ?? formatEt(new Date(at))}` };
  };

  async function act({ action, ref, extra = {} }) {
    switch (action) {
      case "reboot-4am": return schedule(nextAt(4, 0, undefined, now()).getTime(), ref);
      case "reboot-tonight": return schedule(nextAt(23, 0, undefined, now()).getTime(), ref);
      case "reboot-at": return schedule(Number(extra.at), ref, extra.label);
      case "reboot-skip": fs.rmSync(rebootFile, { force: true }); return { ok: true, message: "skipped; the updates wait for the next check" };
      case "cut-off-now": { const s = await guard.cutOff("cut off from Slack"); return { ok: s.status === "cut-off", message: s.status === "cut-off" ? "cut off" : "no watch window is open" }; }
      case "keep-watching": return guard.keepWatching();
      case "shut-down": { if (guard.state.status === "watching") await guard.cutOff("shutting down"); await platform.shutDown(); return { ok: true, message: "shutting down in one minute" }; }
      case "release-lockdown": return guard.release(false);
      case "allow-source": return guard.release(true);
      case "egress-allow-once": return egress ? egress.allowOnce(ref, extra.by ?? "an approver") : { ok: false, message: "no outgoing filter on this computer" };
      case "egress-deny": return egress ? egress.deny(ref, extra.by ?? "an approver") : { ok: false, message: "no outgoing filter on this computer" };
      case "upgrade-now": {
        if (!/^@recursica\/knowledge@\d+\.\d+\.\d+$/.test(ref ?? "")) return { ok: false, message: "not a release tag" };
        const ccDir = path.join(env.OWNER_HOME, "circlechat");
        spawn("sudo", ["-u", env.OWNER, "-H", "env", `CC_DIR=${ccDir}`, `WS=${path.join(env.OWNER_HOME, "circlechat-workspace")}`, `SITE=${path.join(ccDir, "site.json")}`, `COMPUTER=${env.COMPUTER}`,
          process.execPath, path.join(env.KIT, "circlechat/kit/upgrade.mjs"), ref], { detached: true, stdio: "ignore" }).unref();
        return { ok: true, message: `upgrading to ${ref.split("@").pop()}; Slack hears again only on a failure` };
      }
      case "upgrade-skip": {
        const f = path.join(env.OWNER_HOME, "circlechat/kit-out/upgrade-state.json");
        let st = {}; try { st = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
        st.skipped = { ...(st.skipped ?? {}), [ref]: now() };
        fs.writeFileSync(f, JSON.stringify(st));
        return { ok: true, message: `skipped ${String(ref).split("@").pop()}` };
      }
      default: return { ok: false, message: `unknown action ${action}` };
    }
  }

  // Each minute: the guard, then a due reboot. The updates installer runs before the reboot.
  async function minute(canaryHits = []) {
    await guard.tick(canaryHits);
    if (monitor) await monitor.tick().catch((e) => console.error(`monitor: ${e.message}`));
    if (egress) await egress.tick().catch((e) => console.error(`egress: ${e.message}`));
    const r = readReboot();
    if (r && r.at <= now()) {
      fs.rmSync(rebootFile, { force: true });
      await post("info", `:arrows_counterclockwise: ${env.COMPUTER}: installing the held updates, then rebooting.`);
      spawnSync("bash", [path.join(env.KIT, "circlechat/cluster/updates.sh"), "install-held"], { stdio: "inherit" });
      await platform.reboot();
    }
  }

  function server() {
    return http.createServer(async (req, res) => {
      const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
      const auth = req.headers.authorization ?? "";
      const want = `Bearer ${env.CLUSTER_TOKEN}`;
      if (auth.length !== want.length || !crypto.timingSafeEqual(Buffer.from(auth), Buffer.from(want))) return send(401, { ok: false, message: "unauthorized" });
      if (req.method === "GET" && req.url === "/status") return send(200, { ok: true, computer: env.COMPUTER, guard: { status: guard.state.status }, reboot: readReboot(), stacks: await stacks() });
      if (req.method !== "POST" || req.url !== "/action") return send(404, { ok: false, message: "not found" });
      let body = ""; for await (const c of req) { body += c; if (body.length > 10_000) return send(413, { ok: false, message: "too large" }); }
      try { const b = JSON.parse(body); send(200, await act({ ...b, extra: { ...(b.extra ?? {}), by: b.by } })); } catch (e) { send(500, { ok: false, message: e.message }); }
    });
  }
  return { act, minute, server };
}

// The decoys' log: one JSON object per line. Each run reads only the lines added since the last.
export function readCanary(file, posFile) {
  if (!file || !fs.existsSync(file)) return [];
  const size = fs.statSync(file).size;
  let pos = 0; try { pos = Number(fs.readFileSync(posFile, "utf8")); } catch {}
  if (pos > size) pos = 0;
  const fd = fs.openSync(file, "r"); const buf = Buffer.alloc(size - pos); fs.readSync(fd, buf, 0, buf.length, pos); fs.closeSync(fd);
  fs.writeFileSync(posFile, String(size));
  return buf.toString("utf8").split("\n").filter(Boolean).map((l) => { try { return JSON.parse(l); } catch { return null; } })
    // OpenCanary logs its own start-up with logtype 1001 and no source; those are not touches.
    .filter((h) => h && h.src_host && Number(h.logtype) !== 1001);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = process.env;
  const stateDir = "/var/lib/agent-cluster";
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  const api = slackApi(env.SLACK_BOT_TOKEN);
  const post = (kind, text, ref) => api("chat.postMessage", { channel: env.SLACK_CHANNEL_ID, text,
    ...(kind === "info" ? {} : { blocks: buttonBlocks(kind, text, env.COMPUTER, ref) }) }).catch((e) => console.error(e.message));
  const platform = makePlatform(env);
  const guard = new Guard({ platform, notify: post, stateDir, computer: env.COMPUTER });
  const monitor = new Monitor({ self: env.COMPUTER, peers: parsePairs(env.AGENTS), token: env.CLUSTER_TOKEN, clusterChannel: env.SLACK_CHANNEL_ID,
    stateFile: path.join(stateDir, "monitor.json"), post: (channel, text) => api("chat.postMessage", { channel, text }) });
  // The stacks on this computer with an outgoing filter: Border UX's, and each open client stack.
  const filterStacks = async () => {
    const out = [];
    const add = (name, ccDir, suffix) => {
      if (!fs.existsSync(path.join(ccDir, "site.json"))) return;
      const tenant = Object.fromEntries(fs.readFileSync(path.join(ccDir, "kit-out/tenant.env"), "utf8").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
      if (tenant.EGRESS !== "on") return;
      const site = JSON.parse(fs.readFileSync(path.join(ccDir, "site.json"), "utf8"));
      out.push({ name, ccDir, logFile: path.join(ccDir, "egress-logs/access.log"), channel: site.site?.slack_channel_id ?? env.SLACK_CHANNEL_ID,
        container: `cc-egress${suffix}`, network: `${tenant.COMPOSE_PROJECT_NAME}_agents`, context: tenant.DOCKER_CONTEXT });
    };
    add("border", path.join(env.OWNER_HOME, "circlechat"), "");
    const tenants = path.join(env.OWNER_HOME, "tenants");
    if (fs.existsSync(tenants)) for (const t of fs.readdirSync(tenants)) add(t, path.join(tenants, t, "circlechat"), `-${t}`);
    // The port jobs' filters: alerts only, because a job cannot wait for a consent.
    const jobLogs = [["border", path.join(env.OWNER_HOME, ".recursica-jobs-egress/logs/access.log")]];
    if (fs.existsSync(tenants)) for (const t of fs.readdirSync(tenants)) jobLogs.push([t, path.join(tenants, t, "jobs-egress/logs/access.log")]);
    for (const [name, logFile] of jobLogs) if (fs.existsSync(logFile)) out.push({ name: `${name}-jobs`, logFile, channel: out.find((x) => x.name === name)?.channel ?? env.SLACK_CHANNEL_ID, alertOnly: true });
    return out;
  };
  const docker = (st, args) => new Promise((resolve) => execFile("docker", args, { env: { ...process.env, ...(st.context ? { DOCKER_CONTEXT: st.context } : {}) } }, (err, out) => resolve(err ? "" : out)));
  const egress = new Egress({ stacks: filterStacks, stateFile: path.join(stateDir, "egress.json"), exec: docker,
    post: (channel, kind, text, ref) => api("chat.postMessage", { channel, text, blocks: buttonBlocks(kind, text, env.COMPUTER, ref) }),
    // The agent behind a refused connection: the container with that address on the stack's agent network.
    whoIs: async (st, ip) => {
      const j = JSON.parse((await docker(st, ["network", "inspect", st.network])) || "[]");
      const c = Object.values(j[0]?.Containers ?? {}).find((x) => String(x.IPv4Address).startsWith(`${ip}/`));
      return c?.Name ?? "";
    } });
  const agent = makeAgent({ env, platform, guard, post, stateDir, monitor, stacks: () => localStacks(env.OWNER_HOME), egress });
  const srv = agent.server();
  for (const host of String(env.AGENT_BIND ?? "127.0.0.1").split(",")) {
    http.createServer(srv.listeners("request")[0]).listen(Number(env.AGENT_PORT ?? 7500), host.trim());
  }
  const loop = async () => { try { await agent.minute(readCanary(env.CANARY_LOG, path.join(stateDir, "canary.pos"))); } catch (e) { console.error(e); } };
  loop(); setInterval(loop, 60_000);
  console.log(`cluster agent on ${env.COMPUTER}, port ${env.AGENT_PORT ?? 7500}`);
}
