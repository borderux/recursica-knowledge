// Kit services that run old code. With updates.follow "main", the update job fast-forwards the kit
// checkout, and a running service keeps the code the service started with. Each hour, after the
// follow step, the update job restarts each kit service whose own code files changed since the
// service started (KIT_SERVICES):
//
//   - A service's own code files: the service's entry file and each file the entry imports by a
//     relative path, followed through every import. git writes a changed file anew, so the file's
//     change time is the time of the fast-forward that changed the file.
//   - The model gateway runs a copy of the router's files (setup-host.sh). The gateway restarts
//     when the copy differs from the kit's files, after the update job copies the kit's files again.
//   - The cluster agent, the cluster's Slack app, jobd and the GitHub token service restart at once.
//     The cluster agent runs the network check, so the network check restarts with the agent.
//   - kev-engine, the model gateway and LiteLLM wait until RecursicaChat on the computer is quiet
//     (quiet.mjs): no agent turn running or queued, and no service run open. kev-engine runs from
//     the kev-engine's own checkout, so no kit file is kev-engine's code, and a kit change never
//     restarts kev-engine.
//
// The step never restarts RecursicaChat or a RecursicaChat job, the firewall's start-up job, the
// decoys, Ollama or the update job, and never runs a setup. A service that isn't installed, isn't
// running, or has no known start time is left alone. Each restart posts one line in the cluster's
// channel, with the service and the kit's commit.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { gitAsOwner } from "./follow-main.mjs";
import { notice } from "./notice.mjs";

export const KIT_SERVICES = [
  { id: "cluster-agent", label: "the cluster agent", unit: "cluster-agent", entry: "circlechat/cluster/agent.mjs", wait: false },
  { id: "cluster-bot", label: "the cluster's Slack app", unit: "cluster-bot", entry: "circlechat/cluster/bot.mjs", wait: false },
  { id: "jobd", label: "jobd", unit: "jobd", entry: "circlechat/jobd/jobd.mjs", wait: false },
  { id: "github-tokens", label: "the GitHub token service", unit: "github-tokens", entry: "circlechat/github/token-service.mjs", wait: false },
  { id: "kev-engine", label: "kev-engine", unit: "kev-engine", files: [], wait: true },
  { id: "gateway", label: "the model gateway", container: "cc-gateway", copy: true, wait: true },
  { id: "litellm", label: "LiteLLM", container: "cc-litellm", files: ["circlechat/gateway/start-litellm.py"], wait: true },
];

// The router's files, as setup-host.sh copies them into the stack's gateway-app folder.
export const GATEWAY_COPY = (names) => names.filter((n) => n.endsWith(".mjs") || n === "package.json").map((n) => `circlechat/gateway/${n}`);

// The relative imports of one file: import ... from "./x.mjs", export ... from "./x.mjs", and import("./x.mjs").
const IMPORT = /(?:\bfrom\s*|\bimport\s*\(\s*|\bimport\s+)["'](\.{1,2}\/[^"']+)["']/g;

/** The entry file and each file the entry imports by a relative path, followed through every import, as repo paths. */
export function importClosure(entry, read) {
  const seen = new Set(), todo = [entry];
  while (todo.length) {
    const f = todo.pop();
    if (seen.has(f)) continue;
    const text = read(f);
    if (text === null) continue;
    seen.add(f);
    for (const m of text.matchAll(IMPORT)) todo.push(path.posix.normalize(path.posix.join(path.posix.dirname(f), m[1])));
  }
  return [...seen].sort();
}

/** A service's own code files in the kit checkout. */
export const codeFiles = (svc, read) => (svc.entry ? importClosure(svc.entry, read) : svc.files ?? []);

/** One instance of each service on this computer: a container service once for each local stack. */
export function instances(stacks = []) {
  return KIT_SERVICES.flatMap((svc) => {
    if (!svc.container) return [{ ...svc }];
    return stacks.map((st) => ({ ...svc, id: `${svc.id}${st.suffix ?? ""}`, container: `${svc.container}${st.suffix ?? ""}`,
      label: st.tenant ? `${svc.label} of stack ${st.tenant}` : svc.label, stack: st }));
  });
}

/**
 * The services that run old code: each running service whose own code files changed after the
 * service started, and each model gateway whose copy differs from the kit's files.
 *   deps.read(repo path): the file's text in the checkout, or null; deps.mtime(repo path): ms, or 0
 *   deps.started(service): the start time in ms, or null when the service isn't running or isn't installed
 *   deps.copyDiffers(service): whether a gateway's copy differs from the kit's files
 */
export async function staleServices(services, deps) {
  const out = [];
  for (const svc of services) {
    const started = await deps.started(svc);
    if (!Number.isFinite(started)) continue;
    if (svc.copy) { if (await deps.copyDiffers(svc)) out.push(svc); continue; }
    const files = codeFiles(svc, deps.read);
    if (!files.length) continue;
    const newest = Math.max(...(await Promise.all(files.map((f) => deps.mtime(f)))));
    if (newest > started) out.push(svc);
  }
  return out;
}

const short = (sha) => String(sha ?? "").slice(0, 7);
const list = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

/**
 * One hourly run: restarts each stale service, the light ones at once and the heavy ones once
 * RecursicaChat is quiet, and posts one line for each restart.
 *   deps.restart(service): { ok, output } of the restart; deps.head(): the kit's commit
 *   quiet(): { quiet, why }; post(text): the cluster's channel; state: the update job's state, changed in place
 *   returns the labels of the restarted services
 */
export async function restartStep({ computer, services, deps, quiet, post, state, now = () => Date.now() }) {
  const stale = await staleServices(services, deps);
  if (!stale.length) { delete state.restartsWaiting; return []; }
  const commit = short(await deps.head());
  const light = stale.filter((s) => !s.wait), heavy = stale.filter((s) => s.wait);
  let due = light;
  if (heavy.length) {
    const q = await quiet();
    if (q.quiet) { due = [...light, ...heavy]; delete state.restartsWaiting; }
    else {
      const names = heavy.map((s) => s.label);
      await notice(state, "restartsWaiting", `${heavy.map((s) => s.id).join(",")}@${commit}`,
        `:hourglass: Kit on ${computer}: ${list(names)} wait${heavy.length === 1 ? "s" : ""} to restart for ${commit} until RecursicaChat is quiet, with no agent turn running or queued and no service run open. Now: ${q.why}.`, post, now());
    }
  }
  const done = [];
  for (const svc of due) {
    const r = await deps.restart(svc);
    if (r?.ok) {
      done.push(svc.label);
      await post(`:arrows_counterclockwise: Kit on ${computer}: restarted ${svc.label} for ${commit}, so ${svc.label} runs the kit's new code.`).catch(() => {});
    } else {
      await post(`:x: Kit on ${computer}: the restart of ${svc.label} for ${commit} failed. ${String(r?.output ?? "").trim().split("\n").slice(-3).join(" ")}`.trim()).catch(() => {});
    }
  }
  return done;
}

// The real effects, for updater.mjs, which runs as root. Docker runs as the owner, with the stack's
// Docker context, as setup-host.sh runs Docker.
//   env: COMPUTER, OWNER, OWNER_HOME, KIT, PATH; stacks: [{ ccDir, tenant }] this computer controls
//   spawn, fsx: for the tests
export function realRestartDeps({ env, stacks = [], platform = process.platform, spawn = spawnSync, fsx = fs }) {
  const kit = env.KIT, mac = platform === "darwin";
  const run = (cmd, args, opts = {}) => { const r = spawn(cmd, args, { encoding: "utf8", timeout: 120_000, ...opts }); return { ok: r.status === 0, out: `${r.stdout ?? ""}${r.stderr ?? ""}` }; };
  const asOwner = (args) => run("sudo", ["-u", env.OWNER, "-H", ...args]);
  const docker = (svc, args) => asOwner(["env", `PATH=${env.PATH}`, ...(svc.stack?.context ? [`DOCKER_CONTEXT=${svc.stack.context}`] : []), "docker", ...args]);
  const unitFile = (svc) => (mac ? `/Library/LaunchDaemons/io.recursica.${svc.unit}.plist` : `/etc/systemd/system/${svc.unit}.service`);
  const gatewayDir = path.join(kit, "circlechat/gateway");
  return {
    read: (f) => { try { return fsx.readFileSync(path.join(kit, f), "utf8"); } catch { return null; } },
    mtime: (f) => { try { return fsx.statSync(path.join(kit, f)).mtimeMs; } catch { return 0; } },
    head: () => asOwner(gitAsOwner(kit, ["rev-parse", "HEAD"])).out.trim(),
    started: (svc) => {
      if (svc.container) {
        const r = docker(svc, ["inspect", "-f", "{{.State.Running}} {{.State.StartedAt}}", svc.container]);
        const [running, at] = r.out.trim().split(" ");
        return r.ok && running === "true" ? Date.parse(at) : null;
      }
      if (!fsx.existsSync(unitFile(svc))) return null;
      if (mac) {
        const pid = (/^\s*pid = (\d+)/m.exec(run("launchctl", ["print", `system/io.recursica.${svc.unit}`]).out) ?? [])[1];
        return pid ? Date.parse(run("ps", ["-o", "lstart=", "-p", pid]).out.trim()) : null;
      }
      const out = run("systemctl", ["show", "--timestamp=unix", "-p", "ActiveState", "-p", "ActiveEnterTimestamp", `${svc.unit}.service`]).out;
      const at = (/^ActiveEnterTimestamp=@(\d+)/m.exec(out) ?? [])[1];
      return /^ActiveState=active$/m.test(out) && at ? Number(at) * 1000 : null;
    },
    copyDiffers: (svc) => {
      let names = []; try { names = fsx.readdirSync(gatewayDir); } catch { return false; }
      return GATEWAY_COPY(names).some((f) => {
        const read = (p) => { try { return fsx.readFileSync(p, "utf8"); } catch { return null; } };
        return read(path.join(kit, f)) !== read(path.join(svc.stack.ccDir, "gateway-app", path.basename(f)));
      });
    },
    restart: (svc) => {
      if (svc.copy) {
        let names = []; try { names = fsx.readdirSync(gatewayDir); } catch {}
        const cp = asOwner(["cp", ...GATEWAY_COPY(names).map((f) => path.join(kit, f)), path.join(svc.stack.ccDir, "gateway-app") + "/"]);
        if (!cp.ok) return { ok: false, output: cp.out };
      }
      if (svc.container) { const r = docker(svc, ["restart", svc.container]); return { ok: r.ok, output: r.out }; }
      const r = mac ? run("launchctl", ["kickstart", "-k", `system/io.recursica.${svc.unit}`]) : run("systemctl", ["restart", `${svc.unit}.service`]);
      return { ok: r.ok, output: r.out };
    },
  };
}

/** The local stacks' container settings: each stack's suffix, and Docker context from kit-out/tenant.env. */
export function stackContainers(stacks, fsx = fs) {
  return stacks.map((st) => {
    let context = "";
    try { context = (/^DOCKER_CONTEXT=(.*)$/m.exec(fsx.readFileSync(path.join(st.ccDir, "kit-out/tenant.env"), "utf8")) ?? [])[1] ?? ""; } catch {}
    return { ccDir: st.ccDir, tenant: st.tenant ?? "", suffix: st.tenant ? `-${st.tenant}` : "", context };
  });
}
