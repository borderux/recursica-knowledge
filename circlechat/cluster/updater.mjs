// The one update job: hourly, as root, on each computer. One rule for everything:
//
//   - Recursica's own software: a new release of the knowledge repo (the kit) installs once an
//     approver approves the release in Slack with an authenticator code (release-gate.mjs); a new
//     major version asks first. With updates.follow "main" in the cluster's site.json, the kit
//     checkout on every computer follows main instead: each verified commit, then the setups the
//     change touches (follow-main.mjs). A change that can cut remote access or interrupt running
//     work, such as the firewall rules, a tailscale serve step or a step that removes a job, waits
//     for a person.
//   - Everything else: after 7 days, or right away for a flaw on CISA's Known Exploited
//     Vulnerabilities list. Operating system packages are checked each hour (updates.mjs);
//     container images once a day per stack (images.mjs).
//   - An update that needs a reboot asks for a time in Slack.
//   - An update that interrupts work waits until RecursicaChat 2.0 on this computer is quiet
//     (quiet.mjs): a Tailscale, Ollama, Colima or Lima update, and an image pin that recreates the
//     gateway. The cluster's channel hears once that it waits.
//   - Each morning, the cluster's channel gets a summary of this computer's backups and restore
//     tests, and of any job that didn't run on time (daily-summary.mjs).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { clusterStackName, followsMain } from "../kit/render.mjs";
import { siteFile, stackDir, tenantOf, tenantStacks, workspaceDir } from "../kit/stack-paths.mjs";

const DAY = 24 * 3600_000;

// What to run for each stack this hour.
export function plan(stacks, state = {}, now = Date.now()) {
  return stacks.map((s) => ({
    name: s.name,
    upgrade: s.upgradeAuto,
    images: now - (state.images?.[s.name] ?? 0) >= DAY,
  }));
}

// The post for a stack's image pins that wait for a quiet RecursicaChat, or "" when the same pins
// were already announced. state.imagesWaiting keeps each stack's announced pins.
export function imagesWaitingPost(stack, tags, why, state) {
  const key = [...tags].sort().join(",");
  if (!tags.length || state.imagesWaiting?.[stack] === key) return "";
  state.imagesWaiting = { ...(state.imagesWaiting ?? {}), [stack]: key };
  return `:hourglass: Stack ${stack}: new versions of ${tags.join(", ")} wait to install. Each move recreates the gateway, which interrupts work, so it waits until RecursicaChat is quiet, with no agent turn running or queued and no service run open. Now: ${why}.`;
}

// The stacks whose control computer is this computer. A helper computer keeps a copy of a stack's
// folder, and the update job never touches that copy.
export function localStacks(home, computer) {
  const out = [];
  const add = (name, ccDir) => {
    const f = path.join(ccDir, "kit-out/tenant.env");
    if (!fs.existsSync(f)) return;
    let site;
    try {
      site = JSON.parse(fs.readFileSync(path.join(ccDir, "site.json"), "utf8"));
      if ((site.nodes ?? []).find((n) => n.control)?.name !== computer) return;
    } catch { return; }
    const t = Object.fromEntries(fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
    out.push({ name: name ?? clusterStackName(site), ccDir, upgradeAuto: t.UPGRADE_AUTO === "on" });
  };
  add(null, stackDir(home));
  for (const { tenant, dir } of tenantStacks(home)) add(tenant, dir);
  return out;
}

// Two commands are root-owned copies of kit files, so the account that runs them cannot change them:
//   /usr/local/bin/agent-stacks-apply  apply-secrets.sh (deploy/install-secrets-helper.sh, any computer)
//   /usr/local/bin/agent-stacks-disk   disk-helper.sh (tenant/setup-pc.sh, Linux and WSL)
// A copy that differs from the kit is installed again, so a new kit reaches both commands.
//   fsx: { exists, read } for the tests; run(cmd, args): the command's exit status
export function refreshRootCopies({ kit, mac, run, fsx = { exists: fs.existsSync, read: (f) => fs.readFileSync(f, "utf8") } }) {
  const done = [];
  const conf = (f) => { try { return Object.fromEntries(fsx.read(f).split("\n").map((l) => l.match(/^([A-Z_]+)=(.*)$/)).filter(Boolean).map((m) => [m[1], m[2].replace(/^'(.*)'$/, "$1").replace(/\\(.)/g, "$1")])); } catch { return {}; } };
  const differs = (src, dest) => fsx.exists(dest) && fsx.exists(src) && fsx.read(src) !== fsx.read(dest);
  const apply = conf("/etc/agent-stacks.conf");
  const applyKit = apply.KIT || kit;
  if (differs(path.join(applyKit, "circlechat/deploy/apply-secrets.sh"), "/usr/local/bin/agent-stacks-apply")) {
    // The runner's account is in the config since this change, and before it only in the sudo rule.
    let runner = apply.RUNNER;
    if (!runner) try { runner = fsx.read("/etc/sudoers.d/agent-stacks").split(/\s/)[0]; } catch {}
    if (runner && run("bash", [path.join(applyKit, "circlechat/deploy/install-secrets-helper.sh"), runner]) === 0) done.push("agent-stacks-apply");
  }
  const disk = path.join(kit, "circlechat/tenant/disk-helper.sh");
  if (!mac && differs(disk, "/usr/local/bin/agent-stacks-disk") && run("install", ["-m", "755", "-o", "root", disk, "/usr/local/bin/agent-stacks-disk"]) === 0) done.push("agent-stacks-disk");
  return done;
}

// The kit's step with updates.follow "main" (follow-main.mjs). RecursicaChat runs on the control
// computer only, so a helper has no server to wait for.
async function followStep({ env, site, control, stacks, chat, state }) {
  const { followMain, realDeps } = await import("./follow-main.mjs");
  const { afterUpgrade, ownerIds, prepareGateway, stackPaths } = await import("./root-steps.mjs");
  const { serverQuiet } = await import("./quiet.mjs");
  const mac = process.platform === "darwin";
  const prepare = (ccDir) => {
    const ids = mac ? ownerIds(env.OWNER) : null;
    return prepareGateway({ ccDir, ids });
  };
  const local = stacks.map((st) => ({ ...st, ...stackPaths(env.OWNER_HOME, st.ccDir) }));
  const deps = realDeps({ env, stacks: local, afterUpgrade, prepare });
  const result = await followMain({
    computer: env.COMPUTER, control: control && local.length > 0, state, ...deps,
    quiet: () => (control ? serverQuiet(site) : { quiet: true, why: "" }),
    post: (text) => chat.post(env.SLACK_CHANNEL_ID, "info", text),
  });
  console.log(`kit follows main: ${result}`);
}

async function main() {
  const env = process.env;
  const { requireKit } = await import("./kit-check.mjs");
  requireKit(env.KIT, env);
  const here = path.dirname(new URL(import.meta.url).pathname);
  const stateFile = "/var/lib/agent-cluster/updater.json";
  let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const { check } = await import("./updates.mjs");
  const { runUpgrade } = await import("./root-steps.mjs");
  const { makeChannel } = await import("./channel.mjs");
  const chat = makeChannel(env);
  await check({ post: (kind, text, ref) => chat.post(env.SLACK_CHANNEL_ID, kind, text, ref) }).catch((e) => console.error(`os updates: ${e.message}`));
  // The cluster's own site.json, for the quiet check and the kit's updates.follow setting.
  let site = {}; try { site = JSON.parse(fs.readFileSync(siteFile(env.OWNER_HOME), "utf8")); } catch {}
  // A new kit release: the cluster's control computer posts the release once, with an "Install" button.
  // A kit that follows main posts no release.
  const { isClusterControl, releaseCheck } = await import("./release-gate.mjs");
  const control = isClusterControl(env.OWNER_HOME, env.COMPUTER);
  if (control && !followsMain(site)) {
    const git = (...a) => String(spawnSync("sudo", ["-u", env.OWNER, "-H", "git", "-C", env.KIT, ...a], { encoding: "utf8" }).stdout ?? "").trim();
    const current = JSON.parse(fs.readFileSync(path.join(env.KIT, "package.json"), "utf8")).version;
    await releaseCheck({ stateDir: path.dirname(stateFile), git, current, post: (text, ref) => chat.post(env.SLACK_CHANNEL_ID, "release", text, ref) })
      .catch((e) => console.error(`kit release check: ${e.message}`));
  }
  const stacks = localStacks(env.OWNER_HOME, env.COMPUTER);
  // Whether RecursicaChat on this computer is quiet, read as root once, for the image refresh.
  const { serverQuiet } = await import("./quiet.mjs");
  const q = await serverQuiet(site);
  const asOwner = (ccDir, script) => spawnSync("sudo", ["-u", env.OWNER, "-H", "env", `CC_DIR=${ccDir}`, `WS=${workspaceDir(env.OWNER_HOME, tenantOf(env.OWNER_HOME, ccDir))}`,
    `SITE=${path.join(ccDir, "site.json")}`, `COMPUTER=${env.COMPUTER}`, `PATH=${env.PATH}`, `SERVER_QUIET=${q.quiet ? "yes" : "no"}`, `SERVER_BUSY=${q.why}`, process.execPath, script], { stdio: "inherit" });
  const { WAITING } = await import("./images.mjs");
  for (const p of plan(stacks, state)) {
    const st = stacks.find((s) => s.name === p.name);
    // The release upgrade runs as the owner, and root takes the steps that need root (root-steps.mjs).
    if (p.upgrade) await runUpgrade({ env, ccDir: st.ccDir }).catch((e) => console.error(`upgrade of ${p.name}: ${e.message}`));
    if (p.images) {
      const r = asOwner(st.ccDir, path.join(here, "images.mjs"));
      // Pins that wait for a quiet RecursicaChat: the refresh runs again the next hour, not the next day.
      if (r.status === WAITING) {
        let tags = []; try { tags = JSON.parse(fs.readFileSync(path.join(st.ccDir, "kit-out/images-waiting.json"), "utf8")); } catch {}
        const text = imagesWaitingPost(p.name, tags, q.why, state);
        if (text) await chat.post(env.SLACK_CHANNEL_ID, "info", text).catch(() => {});
      } else {
        state.images = { ...(state.images ?? {}), [p.name]: Date.now() };
        delete state.imagesWaiting?.[p.name];
      }
    }
  }
  const { dailySummary } = await import("./daily-summary.mjs");
  await dailySummary({ env, state, post: (text) => chat.post(env.SLACK_CHANNEL_ID, "info", text) }).catch((e) => console.error(`daily summary: ${e.message}`));
  // The kit checkout follows main. The step runs last, so the update job loads no module from the new commit.
  if (followsMain(site)) await followStep({ env, site, control, stacks, chat, state }).catch((e) => console.error(`kit follows main: ${e.message}`));
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit" }).status;
  for (const c of refreshRootCopies({ kit: env.KIT, mac: process.platform === "darwin", run })) console.log(`${c}: installed again from the kit`);
  console.log(`${new Date().toISOString()} updater: done`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
