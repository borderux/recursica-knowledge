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
//   - With updates.follow "main", each kit service whose own code files changed since the service
//     started restarts, so the service runs the new code (restarts.mjs). The heavy services, such
//     as the model gateway, wait until RecursicaChat is quiet. The job never restarts RecursicaChat
//     this way, and never reruns a setup this way.
//   - A kit checkout that kit/check-kit.sh refuses stops the job before any update. The cluster's
//     channel hears the reason and the fix once, then again for a new reason or after 24 hours.
//     Each other post about a wait for a person follows the same rule (notice.mjs).
//   - Each root-owned copy of a kit file, such as the secrets helper, gets the file's text at the kit
//     checkout's commit, read from git and verified by GitHub (root-copies.mjs). The cluster's channel
//     gets one line for each copy the job replaced.
//   - Each morning, the cluster's channel gets a summary of this computer's backups and restore
//     tests, and of any job that didn't run on time (daily-summary.mjs).
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { clusterStackName, followsMain } from "../kit/render.mjs";
import { siteFile, stackDir, tenantOf, tenantStacks, workspaceDir } from "../kit/stack-paths.mjs";
import { noticeDue, notice } from "./notice.mjs";

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
// were announced less than 24 hours ago. state.imagesWaiting keeps each stack's last announcement.
export function imagesWaitingPost(stack, tags, why, state, now = Date.now()) {
  const key = [...tags].sort().join(",");
  if (!tags.length) return "";
  state.imagesWaiting ??= {};
  if (!noticeDue(state.imagesWaiting, stack, key, now)) return "";
  state.imagesWaiting[stack] = { key, at: now };
  return `:hourglass: Stack ${stack}: new versions of ${tags.join(", ")} wait to install. Each move recreates the gateway, which interrupts work, so it waits until RecursicaChat is quiet, with no agent turn running or queued and no service run open. Now: ${why}.`;
}

// A refused kit checkout: the post with the reason and the fix, once, then again for a new reason
// or after 24 hours. A checkout that passes clears the record, so the next refusal posts at once.
//   problem: kit/check-kit.sh's message, which names the fix, or null for a checkout that passes
//   post(text): { ok } of one post in the cluster's channel
export async function tellRefused({ computer, problem, state, post, now = Date.now() }) {
  if (!problem) { delete state.refused; return false; }
  const reason = problem.replace(/^Refusing the kit checkout [^:]*: /, "");
  const text = `:no_entry: Kit on ${computer}: the update job refuses the kit checkout, so the kit stays where it is and no update runs on ${computer}. ${reason}`;
  return notice(state, "refused", problem, text, post, now);
}

// One post in the cluster's channel, for a refused checkout. The job posts from this file, which
// already runs, and loads no other module from the refused checkout. The result goes to the job's log.
async function postRefusal(env, text) {
  try {
    const r = await fetch("https://slack.com/api/chat.postMessage", { method: "POST", signal: AbortSignal.timeout(30_000),
      headers: { authorization: `Bearer ${env.SLACK_BOT_TOKEN}`, "content-type": "application/json; charset=utf-8" },
      body: JSON.stringify({ channel: env.SLACK_CHANNEL_ID, text, ...(env.COMPUTER ? { username: env.COMPUTER } : {}), ...(env.SLACK_ICON ? { icon_emoji: env.SLACK_ICON } : {}) }) });
    const j = await r.json();
    console.log(j.ok ? `slack: posted the refusal to the cluster's channel (ts ${j.ts})` : `slack: the refusal's post failed: ${j.error}`);
    return { ok: Boolean(j.ok) };
  } catch (e) {
    console.log(`slack: the refusal's post got no answer: ${e.message}`);
    return { ok: false };
  }
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

// The kit's step with updates.follow "main" (follow-main.mjs). RecursicaChat runs on the control
// computer only, so a helper has no server to wait for.
async function followStep({ env, site, control, stacks, chat, state, kitRepo }) {
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
    computer: env.COMPUTER, control: control && local.length > 0, state, kitRepo, ...deps,
    quiet: () => (control ? serverQuiet(site) : { quiet: true, why: "" }),
    post: (text) => chat.post(env.SLACK_CHANNEL_ID, "info", text),
  });
  console.log(`kit follows main: ${result}`);
}

// The step that refreshes the root-owned copies of kit files (root-copies.mjs). git runs as the
// owner, in the kit checkout, with no replace objects and no text conversion.
async function rootCopiesStep() {
  const { ROOT_COPIES, helperKit, refreshRootCopies, verifiedOnMain } = await import("./root-copies.mjs");
  const { gitAsOwner } = await import("./follow-main.mjs");
  return async ({ env, chat, state, kitRepo }) => {
    const git = (...a) => {
      const r = spawnSync("sudo", ["-u", env.OWNER, "-H", ...gitAsOwner(env.KIT, ["--no-replace-objects", ...a])], { maxBuffer: 64 << 20 });
      return r.status === 0 ? r.stdout : null;
    };
    const commit = String(git("rev-parse", "HEAD") ?? "").trim();
    // The secrets helper runs the kit that /etc/agent-stacks.conf names. A different kit folder keeps the helper as it is.
    let conf = ""; try { conf = fs.readFileSync("/etc/agent-stacks.conf", "utf8"); } catch {}
    const other = helperKit(conf) && path.resolve(helperKit(conf)) !== path.resolve(env.KIT);
    if (other) console.error(`agent-stacks-apply: /etc/agent-stacks.conf names the kit in ${helperKit(conf)}, not ${env.KIT}, so the job leaves the helper alone`);
    const get = async (url) => {
      const r = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "recursica-kit-updater" }, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    };
    const done = await refreshRootCopies({
      computer: env.COMPUTER, commit, state, kitRepo, remote: String(git("remote", "get-url", "origin") ?? "").trim(),
      copies: ROOT_COPIES.filter((c) => !(other && c.name === "agent-stacks-apply")),
      cat: (type, id) => git("cat-file", type, id),
      show: (rev, file) => git("show", "--no-textconv", `${rev}:${file}`),
      verify: (c, repo) => verifiedOnMain({ repo, commit: c, get }),
      post: (text) => chat.post(env.SLACK_CHANNEL_ID, "info", text),
    });
    for (const name of done) console.log(`${name}: replaced with the kit's file at ${commit.slice(0, 7)}`);
  };
}

// The kit services that run old code restart (restarts.mjs). Each hour, after the follow step, so a
// heavy service that waited for a quiet RecursicaChat restarts at a later hour.
async function restartKit({ env, site, control, stacks, chat, state }) {
  const { instances, realRestartDeps, restartStep, stackContainers } = await import("./restarts.mjs");
  const { serverQuiet } = await import("./quiet.mjs");
  const { stackPaths } = await import("./root-steps.mjs");
  const local = stacks.map((st) => ({ ...st, ...stackPaths(env.OWNER_HOME, st.ccDir) }));
  const done = await restartStep({
    computer: env.COMPUTER, services: instances(control ? stackContainers(local) : []), deps: realRestartDeps({ env }), state,
    quiet: () => (control ? serverQuiet(site) : { quiet: true, why: "" }),
    post: (text) => chat.post(env.SLACK_CHANNEL_ID, "info", text),
  });
  if (done.length) console.log(`kit services restarted: ${done.join(", ")}`);
}

async function main() {
  const env = process.env;
  const stateFile = "/var/lib/agent-cluster/updater.json";
  let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const { kitProblem } = await import("./kit-check.mjs");
  const problem = kitProblem(env.KIT, env);
  await tellRefused({ computer: env.COMPUTER, problem, state, post: (text) => postRefusal(env, text) });
  if (problem) {
    console.error(problem);
    fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
    process.exit(1);
  }
  const here = path.dirname(new URL(import.meta.url).pathname);
  const { check } = await import("./updates.mjs");
  const { runUpgrade } = await import("./root-steps.mjs");
  // Loaded before the follow step, so the job loads no module from the new commit.
  const rootCopies = await rootCopiesStep();
  const { makeChannel } = await import("./channel.mjs");
  const chat = makeChannel(env);
  // The kit's GitHub repo, read only from root's /etc/agent-cluster.conf (kit-repo.mjs).
  const { kitRepo: readKitRepo } = await import("./kit-repo.mjs");
  const kitRepo = readKitRepo();
  if (kitRepo.old) console.log(`kit repo: /etc/agent-cluster.conf has no KIT_REPO yet, so the job uses ${kitRepo.repo}. Run install-cluster.sh to write the setting.`);
  await check({ post: (kind, text, ref) => chat.post(env.SLACK_CHANNEL_ID, kind, text, ref) }).catch((e) => console.error(`os updates: ${e.message}`));
  // The cluster's own site.json, for the quiet check and the kit's updates.follow setting.
  let site = {}; try { site = JSON.parse(fs.readFileSync(siteFile(env.OWNER_HOME), "utf8")); } catch {}
  // A new kit release: the cluster's control computer posts the release once, with an "Install" button.
  // A kit that follows main posts no release.
  const { isClusterControl, releaseCheck } = await import("./release-gate.mjs");
  const control = isClusterControl(env.OWNER_HOME, env.COMPUTER);
  if (control && !followsMain(site)) {
    const { gitAsOwner } = await import("./follow-main.mjs");
    const git = (...a) => String(spawnSync("sudo", ["-u", env.OWNER, "-H", ...gitAsOwner(env.KIT, a)], { encoding: "utf8" }).stdout ?? "").trim();
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
  if (followsMain(site)) {
    await followStep({ env, site, control, stacks, chat, state, kitRepo }).catch((e) => console.error(`kit follows main: ${e.message}`));
    await restartKit({ env, site, control, stacks, chat, state }).catch((e) => console.error(`kit restarts: ${e.message}`));
  }
  // Each root-owned copy of a kit file gets the file's text at the checkout's commit (root-copies.mjs).
  // The step runs after the follow step, so the copies match the commit the checkout moved to.
  await rootCopies({ env, chat, state, kitRepo }).catch((e) => console.error(`root copies: ${e.message}`));
  fs.writeFileSync(stateFile, JSON.stringify(state), { mode: 0o600 });
  console.log(`${new Date().toISOString()} updater: done`);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
