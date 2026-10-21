// The one update job: hourly, as root, on each computer. One rule for everything:
//
//   - Border UX's own software, on a stack with upgrade.auto (the knowledge repo, the CircleChat
//     fork, @recursica/mcp): right away; a new major version asks in Slack (kit/upgrade.mjs).
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

export function localStacks(home) {
  const out = [];
  const add = (name, ccDir) => {
    const f = path.join(ccDir, "kit-out/tenant.env");
    if (!fs.existsSync(f)) return;
    const t = Object.fromEntries(fs.readFileSync(f, "utf8").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
    out.push({ name, ccDir, upgradeAuto: t.UPGRADE_AUTO === "on" });
  };
  add("border", path.join(home, "circlechat"));
  const tenants = path.join(home, "tenants");
  if (fs.existsSync(tenants)) for (const t of fs.readdirSync(tenants)) add(t, path.join(tenants, t, "circlechat"));
  return out;
}

async function main() {
  const env = process.env;
  const here = path.dirname(new URL(import.meta.url).pathname);
  const stateFile = "/var/lib/agent-cluster/updater.json";
  let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const { check } = await import("./updates.mjs");
  const { makeChannel } = await import("./channel.mjs");
  const chat = makeChannel(env);
  await check({ post: (kind, text, ref) => chat.post(env.SLACK_CHANNEL_ID, kind, text, ref) }).catch((e) => console.error(`os updates: ${e.message}`));
  const stacks = localStacks(env.OWNER_HOME);
  const asOwner = (ccDir, script) => spawnSync("sudo", ["-u", env.OWNER, "-H", "env", `CC_DIR=${ccDir}`, `WS=${path.join(env.OWNER_HOME, "circlechat-workspace")}`,
    `SITE=${path.join(ccDir, "site.json")}`, `COMPUTER=${env.COMPUTER}`, `PATH=${env.PATH}`, process.execPath, script], { stdio: "inherit" });
  for (const p of plan(stacks, state)) {
    const st = stacks.find((s) => s.name === p.name);
    if (p.upgrade) asOwner(st.ccDir, path.join(env.KIT, "circlechat/kit/upgrade.mjs"));
    if (p.images) { asOwner(st.ccDir, path.join(here, "images.mjs")); state.images = { ...(state.images ?? {}), [p.name]: Date.now() }; }
  }
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
