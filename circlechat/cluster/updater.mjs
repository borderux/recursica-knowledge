// The one update job: hourly, as root, on each computer. One rule for everything:
//
//   - Border UX's own software, on a stack with upgrade.auto (the knowledge repo and the
//     CircleChat fork): right away; a new major version asks in Slack (kit/upgrade.mjs).
//   - Everything else: after 7 days, or right away for a flaw on CISA's Known Exploited
//     Vulnerabilities list. Operating system packages are checked each hour (updates.mjs);
//     container images once a day per stack (images.mjs).
//   - An update that needs a reboot asks for a time in Slack.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const DAY = 24 * 3600_000;

// What to run for each stack this hour.
export function plan(stacks, state = {}, now = Date.now()) {
  return stacks.map((s) => ({
    name: s.name,
    upgrade: s.upgradeAuto,
    images: now - (state.images?.[s.name] ?? 0) >= DAY,
  }));
}

// The stacks whose control computer is this computer. A helper computer keeps a copy of a stack's
// folder, and the update job never touches that copy.
export function localStacks(home, computer) {
  const out = [];
  const add = (name, ccDir) => {
    const f = path.join(ccDir, "kit-out/tenant.env");
    if (!fs.existsSync(f)) return;
    try {
      const site = JSON.parse(fs.readFileSync(path.join(ccDir, "site.json"), "utf8"));
      if ((site.nodes ?? []).find((n) => n.control)?.name !== computer) return;
    } catch { return; }
    const t = Object.fromEntries(fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
    out.push({ name, ccDir, upgradeAuto: t.UPGRADE_AUTO === "on" });
  };
  add("border", path.join(home, "circlechat"));
  const tenants = path.join(home, "tenants");
  if (fs.existsSync(tenants)) for (const t of fs.readdirSync(tenants)) add(t, path.join(tenants, t, "circlechat"));
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

async function main() {
  const env = process.env;
  const { requireKit } = await import("./kit-check.mjs");
  requireKit(env.KIT, env);
  const here = path.dirname(new URL(import.meta.url).pathname);
  const stateFile = "/var/lib/agent-cluster/updater.json";
  let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const { check } = await import("./updates.mjs");
  const { makeChannel } = await import("./channel.mjs");
  const chat = makeChannel(env);
  await check({ post: (kind, text, ref) => chat.post(env.SLACK_CHANNEL_ID, kind, text, ref) }).catch((e) => console.error(`os updates: ${e.message}`));
  const stacks = localStacks(env.OWNER_HOME, env.COMPUTER);
  const asOwner = (ccDir, script) => spawnSync("sudo", ["-u", env.OWNER, "-H", "env", `CC_DIR=${ccDir}`, `WS=${path.join(env.OWNER_HOME, "circlechat-workspace")}`,
    `SITE=${path.join(ccDir, "site.json")}`, `COMPUTER=${env.COMPUTER}`, `PATH=${env.PATH}`, process.execPath, script], { stdio: "inherit" });
  for (const p of plan(stacks, state)) {
    const st = stacks.find((s) => s.name === p.name);
    if (p.upgrade) asOwner(st.ccDir, path.join(env.KIT, "circlechat/kit/upgrade.mjs"));
    if (p.images) { asOwner(st.ccDir, path.join(here, "images.mjs")); state.images = { ...(state.images ?? {}), [p.name]: Date.now() }; }
  }
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  const run = (cmd, args) => spawnSync(cmd, args, { stdio: "inherit" }).status;
  for (const c of refreshRootCopies({ kit: env.KIT, mac: process.platform === "darwin", run })) console.log(`${c}: installed again from the kit`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
