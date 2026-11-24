// The cluster agent: one root service on each computer. It runs the intrusion guard every minute,
// reads the decoys' log, carries out the actions the Slack app sends, and runs scheduled reboots.
// It watches the other computers' agents, and reports this computer's stacks and kit services in
// /status (monitor.mjs, services.mjs). A kit service that restarts more than 3 times in an hour
// gets one post in the cluster's channel.
//
// Settings come from /etc/agent-cluster.env (root only), written by install-cluster.sh:
//   COMPUTER, CLUSTER_TOKEN, AGENT_BIND (addresses to listen on), AGENT_PORT,
//   SLACK_BOT_TOKEN, SLACK_CHANNEL_ID, OWNER, OWNER_HOME, KIT, EVIDENCE_RECIPIENT, BACKUP_REMOTE,
//   CANARY_LOG
import crypto from "node:crypto";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { spawnSync, execFile } from "node:child_process";
import { Guard } from "./guard.mjs";
import { IS_MAC, IS_WSL, makePlatform } from "./platform.mjs";
import { NetworkWatch, readNetwork } from "./network.mjs";
import { buttonBlocks, clusterTz, formatTime, nextAt } from "./actions.mjs";
import { parsePairs } from "./bot.mjs";
import { makeChannel } from "./channel.mjs";
import { Monitor, localStacks } from "./monitor.mjs";
import { Egress } from "./egress.mjs";
import { requireKit } from "./kit-check.mjs";
import { TAG, approve } from "./release-gate.mjs";
import { DEFAULT_STACK_NAME, clusterStackName } from "../kit/render.mjs";
import { agentPeers } from "../kit/peers.mjs";
import { RestartWatch, restartCounts, serviceChecks, serviceStates } from "./services.mjs";
import { agentState } from "./quiet.mjs";
import { siteFile, stackDir, tenantStacks } from "../kit/stack-paths.mjs";

//   services(): [{ name, state }] of this computer's kit services, for /status; restarts: RestartWatch
//   barb(): Barb's state on the control computer's RecursicaChat server (quiet.mjs agentState), for
//     /status, or null on any other computer. A kev-engine key rotation reads it (deploy/apply-secrets.sh).
export function makeAgent({ env, platform, guard, post, now = () => Date.now(), stateDir, monitor, stacks = async () => [], services = async () => [], barb = async () => null, restarts, egress, network }) {
  const tz = clusterTz(env);
  const rebootFile = path.join(stateDir, "reboot.json");
  const readReboot = () => { try { return JSON.parse(fs.readFileSync(rebootFile, "utf8")); } catch { return null; } };
  const schedule = (at, ref, label) => {
    fs.writeFileSync(rebootFile, JSON.stringify({ at, ref }), { mode: 0o600 });
    return { ok: true, message: `updates install, then ${env.COMPUTER} reboots, at ${label ?? formatTime(new Date(at), tz)}` };
  };

  async function act({ action, ref, extra = {} }) {
    switch (action) {
      case "reboot-4am": return schedule(nextAt(4, 0, tz, now()).getTime(), ref);
      case "reboot-tonight": return schedule(nextAt(23, 0, tz, now()).getTime(), ref);
      case "reboot-at": return schedule(Number(extra.at), ref, extra.label);
      case "reboot-skip": fs.rmSync(rebootFile, { force: true }); return { ok: true, message: "skipped; the updates wait for the next check" };
      case "cut-off-now": {
        const s = await guard.cutOff("cut off from Slack");
        if (s.status === "cut-off") return { ok: true, message: "cut off, and the firewall holds the lockdown rules" };
        if (s.status === "cut-off-failed") return { ok: false, message: `the cut-off failed again: ${s.problems.join("; ")}` };
        return { ok: false, message: "no watch window is open" };
      }
      case "keep-watching": return guard.keepWatching();
      case "shut-down": { if (["watching", "cut-off-failed"].includes(guard.state.status)) await guard.cutOff("shutting down"); await platform.shutDown(); return { ok: true, message: "shutting down in one minute" }; }
      case "release-lockdown": return guard.release(false);
      case "allow-source": return guard.release(true);
      case "upgrade-now": {
        if (!TAG.test(ref ?? "")) return { ok: false, message: "not a release tag" };
        // The button needs an authenticator code, and the press counts as the release's approval.
        approve({ stateDir, tag: ref, by: extra.by ?? "an approver", computer: env.COMPUTER, now: now() });
        const ccDir = stackDir(env.OWNER_HOME);
        // The upgrade runs as the owner, and the agent takes the steps that need root (root-steps.mjs).
        import("./root-steps.mjs").then(({ runUpgrade }) => runUpgrade({ env, ccDir, ref })).catch((e) => console.error(`upgrade to ${ref}: ${e.message}`));
        return { ok: true, message: `upgrading to ${ref.split("@").pop()}; Slack hears again only on a failure` };
      }
      // "Install" for a kit release, sent to every computer: this computer installs the release at the
      // next hourly check.
      case "release-install": return approve({ stateDir, tag: ref, by: extra.by ?? "an approver", computer: env.COMPUTER, now: now() });
      case "upgrade-skip": {
        const f = path.join(stackDir(env.OWNER_HOME), "kit-out/upgrade-state.json");
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
    if (network) await network.tick().catch((e) => console.error(`network check: ${e.message}`));
    if (restarts) await restarts.tick().catch((e) => console.error(`restart check: ${e.message}`));
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
      if (req.method === "GET" && req.url === "/status") {
        const svc = await services().catch(() => []);
        const b = await barb().catch(() => "unknown");
        return send(200, { ok: true, computer: env.COMPUTER, guard: { status: guard.state.status }, reboot: readReboot(), stacks: await stacks(), services: svc.map(({ name, state }) => ({ name, state })), ...(b === null ? {} : { barb: b }) });
      }
      if (req.method !== "POST" || req.url !== "/action") return send(404, { ok: false, message: "not found" });
      let body = ""; for await (const c of req) { body += c; if (body.length > 10_000) return send(413, { ok: false, message: "too large" }); }
      try { const b = JSON.parse(body); send(200, await act({ ...b, extra: { ...(b.extra ?? {}), by: b.by } })); } catch (e) { send(500, { ok: false, message: e.message }); }
    });
  }
  return { act, minute, server };
}

// The port jobs' filters on this computer: the cluster's own stack's, and each open client stack's,
// for each filter log that exists. A helper computer without a stack folder has none, and the step
// reads nothing else, so the step logs no error each minute.
export function filterStacks({ home, clusterChannel, clusterName }) {
  const channelOf = (dir) => { try { return JSON.parse(fs.readFileSync(path.join(dir, "site.json"), "utf8")).site?.slack_channel_id || clusterChannel; } catch { return clusterChannel; } };
  const logs = [{ name: clusterName, logFile: path.join(home, ".recursica-jobs-egress/logs/access.log"), channel: channelOf(stackDir(home)) }];
  for (const { tenant, dir } of tenantStacks(home)) logs.push({ name: tenant, logFile: path.join(home, "tenants", tenant, "jobs-egress/logs/access.log"), channel: channelOf(dir) });
  return logs.filter((l) => fs.existsSync(l.logFile)).map((l) => ({ ...l, name: `${l.name}-jobs` }));
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
  requireKit(env.KIT, env);
  const stateDir = "/var/lib/agent-cluster";
  fs.mkdirSync(stateDir, { recursive: true, mode: 0o700 });
  // Channels this computer may post to: the cluster channel, and each local stack's channel.
  // Uptime alerts name the other computers' stacks, so their channels (from each computer's own
  // report, kept in the monitor's state) are allowed too.
  const allowedChannels = async () => {
    let peers = [];
    try { peers = Object.values(JSON.parse(fs.readFileSync(path.join(stateDir, "monitor.json"), "utf8"))).flatMap((p) => (p.stacks ?? []).map((s) => s.channel)); } catch {}
    return [env.SLACK_CHANNEL_ID, ...(await localStacks(env.OWNER_HOME)).map((s) => s.channel), ...peers].filter(Boolean);
  };
  const chat = makeChannel(env, allowedChannels);
  const post = (kind, text, ref) => chat.post(env.SLACK_CHANNEL_ID, kind, text, ref).catch((e) => console.error(e.message));
  const platform = makePlatform(env);
  const guard = new Guard({ platform, notify: post, stateDir, computer: env.COMPUTER });
  // The cluster's own site.json, read at each use, so a changed site.json counts.
  const site = () => { try { return JSON.parse(fs.readFileSync(siteFile(env.OWNER_HOME), "utf8")); } catch { return null; } };
  // Each other computer's agent, at the computer's Tailscale address. Without a readable site.json,
  // the list install-cluster.sh wrote (AGENTS).
  const peers = () => { const s = site(); return s ? agentPeers(s, env.COMPUTER) : parsePairs(env.AGENTS); };
  const monitor = new Monitor({ self: env.COMPUTER, peers, token: env.CLUSTER_TOKEN, clusterChannel: env.SLACK_CHANNEL_ID,
    stateFile: path.join(stateDir, "monitor.json"), post: (channel, text) => chat.post(channel, "info", text) });
  // The cluster's own stack's name (site.stack_name), read at each use, so a changed site.json counts.
  const clusterName = () => { try { return clusterStackName(JSON.parse(fs.readFileSync(siteFile(env.OWNER_HOME), "utf8"))); } catch { return DEFAULT_STACK_NAME; } };
  // The port jobs' filters on this computer: the cluster's own stack's, and each open client
  // stack's. Each refused site gets an alert, because a job cannot wait for a consent.
  const egress = new Egress({ stacks: async () => filterStacks({ home: env.OWNER_HOME, clusterChannel: env.SLACK_CHANNEL_ID, clusterName: clusterName() }), stateFile: path.join(stateDir, "egress.json"), post: (channel, kind, text, ref) => chat.post(channel, kind, text, ref) });
  // The network check, every 5 minutes: the router, github.com's addresses and the office address
  // (network.mjs). Its messages go to the cluster's channel.
  const run = (cmd, args) => new Promise((resolve) => execFile(cmd, args, { timeout: 30_000 }, (err, out) => resolve(err ? "" : out)));
  const network = new NetworkWatch({ computer: env.COMPUTER, expectedRouter: env.EXPECTED_ROUTER ?? "", post: (text) => post("info", text),
    stateFile: path.join(stateDir, "network.json"), read: () => readNetwork({ run, mac: IS_MAC, wsl: IS_WSL }) });
  // This computer's kit services, from site.json: their states for /status, and their restarts.
  const checks = () => serviceChecks(site() ?? {}, env.COMPUTER, { mac: IS_MAC });
  const running = async (c) => (await run("docker", ["inspect", "-f", "{{.State.Running}}", c])).trim() === "true";
  const restarts = new RestartWatch({ computer: env.COMPUTER, stateFile: path.join(stateDir, "restarts.json"), post: (text) => chat.post(env.SLACK_CHANNEL_ID, "info", text),
    read: () => restartCounts(checks(), { run, mac: IS_MAC }) });
  // The stacks this computer is the control computer of, each checked on this computer.
  const agent = makeAgent({ env, platform, guard, post, stateDir, monitor, stacks: () => localStacks(env.OWNER_HOME, { computer: env.COMPUTER }),
    services: () => serviceStates(checks(), { running }), restarts, egress, network,
    // Barb's state, on the control computer only: the computer that runs the RecursicaChat server.
    barb: async () => { const s = site(); return s?.nodes?.some((n) => n.name === env.COMPUTER && n.control) ? agentState(s, "barb") : null; } });
  const srv = agent.server();
  for (const host of String(env.AGENT_BIND ?? "127.0.0.1").split(",")) {
    http.createServer(srv.listeners("request")[0]).listen(Number(env.AGENT_PORT ?? 7500), host.trim());
  }
  const loop = async () => { try { await agent.minute(readCanary(env.CANARY_LOG, path.join(stateDir, "canary.pos"))); } catch (e) { console.error(e); } };
  loop(); setInterval(loop, 60_000);
  console.log(`cluster agent on ${env.COMPUTER}, port ${env.AGENT_PORT ?? 7500}`);
}
