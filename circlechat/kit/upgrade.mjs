// Upgrade the stack to each new release of the knowledge repo (tags @recursica/knowledge@X.Y.Z).
// Runs hourly on the control computer when site.json sets upgrade.auto, as the account that owns
// the stack.
//
// The kit checkout this script runs from moves to each release: root runs that checkout, which
// sits outside the agents' workspace. The setup runs from the kit checkout. The script never runs
// git in the workspace's checkouts: agents can change them.
//
//   - A release with the same first number installs once an approver approves the release in
//     Slack, with an authenticator code (cluster/release-gate.mjs). The root process that starts
//     this script passes the approved releases in KIT_APPROVED. The install checks out the release,
//     reruns the setup, and checks the stack. On a failure, the stack goes back to
//     the version it ran, and Slack gets a message. Until an approval, the release is held.
//   - A release with a higher first number (a major version) asks first, in Slack.
//   - With updates.follow "main" in the cluster's site.json, no release installs, not even with
//     "Upgrade now". The update job moves the checkout to each verified commit on main instead
//     (cluster/follow-main.mjs).
//
//   node upgrade.mjs              the hourly check
//   node upgrade.mjs <tag>        upgrade to one release now (the Slack button runs this)
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { kitProblem } from "../cluster/kit-check.mjs";
import { followsMain } from "./render.mjs";
import { stackSlack } from "./slack.mjs";
import { siteFile } from "./stack-paths.mjs";

const TAG = /^@recursica\/knowledge@(\d+)\.(\d+)\.(\d+)$/;
export const parse = (t) => { const m = String(t).match(TAG); return m ? m.slice(1).map(Number) : null; };
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// What to do: nothing, upgrade, hold (a release no approver has approved yet), or ask (a new major
// version, asked once per release).
//   approved: the approved release tags
export function decide(current, tags, state = {}, approved = []) {
  const cur = String(current).split(".").map(Number);
  const newer = tags.map((t) => [t, parse(t)]).filter(([, v]) => v && cmp(v, cur) > 0).sort((a, b) => cmp(a[1], b[1]));
  if (!newer.length) return { action: "none" };
  // A release that failed once is skipped until a newer one appears, or a person presses
  // "Upgrade now", so a broken release never restarts the stack every hour.
  const sameMajor = newer.filter(([t, v]) => v[0] === cur[0] && !state.failed?.[t]);
  if (sameMajor.length) {
    // The newest approved release installs. With none approved, the newest release is held.
    const ok = sameMajor.filter(([t]) => approved.includes(t));
    return ok.length ? { action: "upgrade", tag: ok[ok.length - 1][0] } : { action: "hold", tag: sameMajor[sameMajor.length - 1][0] };
  }
  const majors = newer.filter(([, v]) => v[0] > cur[0]);
  if (!majors.length) return { action: "none" };
  const [tag] = majors[majors.length - 1];
  if (state.asked?.[tag] || state.skipped?.[tag]) return { action: "none" };
  return { action: "ask", tag };
}

// The release notes of a tag, on the GitHub repo the kit checkout came from, or nothing for a
// checkout from somewhere else.
export function releaseNotes(remote, tag) {
  const m = String(remote).trim().match(/github\.com[/:]([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+?)(\.git)?$/);
  return m ? ` Release notes: https://github.com/${m[1]}/releases/tag/${encodeURIComponent(tag)}` : "";
}

// The setup for one release, as the owner. With KIT_ROOT_STEPS, the root process that started this
// script (cluster/root-steps.mjs) prepared the gateway's files. The setup then takes only the Docker
// steps, and the owner needs no sudo. The root process may pass one line on stdin, which the setup
// reads and ignores: an older setup read the database role's password of CircleChat 1.x there.
// Without KIT_ROOT_STEPS, such as a run by hand in a terminal, the setup uses sudo as before.
//   record(): called before each run of setup-host.sh, so the root process knows the setup ran
export function setupRunner({ kit, rootSteps, password = "", record = () => {}, run = spawnSync }) {
  return () => {
    record();
    const env = { ...process.env };
    if (!rootSteps) {
      return run("bash", [path.join(kit, "circlechat/setup-host.sh"), "--upgrade"], { env, stdio: "inherit" }).status === 0;
    }
    const a = run("bash", [path.join(kit, "circlechat/setup-host.sh"), "--upgrade"], { env: { ...env, KIT_ROOT_STEPS: "1" }, input: `${password}\n`, stdio: ["pipe", "inherit", "inherit"] });
    return a.status === 0;
  };
}

// The line the root process passes on stdin with KIT_ROOT_STEPS, passed on to the setup.
const rootPassword = process.env.KIT_ROOT_STEPS && import.meta.url === `file://${process.argv[1]}` ? (() => { try { return fs.readFileSync(0, "utf8").split("\n")[0].trim(); } catch { return ""; } })() : "";

async function main() {
  const ws = process.env.WS, ccDir = process.env.CC_DIR;
  const here = path.dirname(new URL(import.meta.url).pathname);
  const kit = path.resolve(here, "../..");
  const stateFile = path.join(ccDir, "kit-out/upgrade-state.json");
  let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  // git runs only in the kit checkout, never in the workspace.
  const git = (...a) => execFileSync("git", ["-C", kit, ...a], { encoding: "utf8" }).trim();
  const post = stackSlack(ccDir);
  const say = (text) => { post(text).catch(() => {}); };
  // A kit checkout that the setup would refuse stops the upgrade. Slack hears each new reason once.
  const problem = kitProblem(kit, { OWNER: os.userInfo().username, OWNER_HOME: os.homedir(), WS: ws });
  if (problem) {
    if (state.kitProblem !== problem) { state.kitProblem = problem; fs.writeFileSync(stateFile, JSON.stringify(state)); await post(`:x: The upgrade job stopped. ${problem}`).catch(() => {}); }
    process.exit(1);
  }
  delete state.kitProblem;
  const saveState = () => fs.writeFileSync(stateFile, JSON.stringify(state));
  // A kit that follows main never checks out a release tag.
  let clusterSite = {}; try { clusterSite = JSON.parse(fs.readFileSync(siteFile(os.homedir()), "utf8")); } catch {}
  if (followsMain(clusterSite)) {
    console.log(`The kit follows main (updates.follow in ${siteFile(os.homedir())}), so no release installs${process.argv[2] ? `, not even ${process.argv[2]}` : ""}.`);
    return;
  }
  git("fetch", "--tags", "--quiet");
  const current = JSON.parse(fs.readFileSync(path.join(kit, "package.json"), "utf8")).version;
  const tags = git("tag", "--list", "@recursica/knowledge@*").split("\n").filter(Boolean);
  const wanted = process.argv[2];
  const approved = String(process.env.KIT_APPROVED ?? "").split(",").filter(Boolean);
  const d = wanted ? { action: "upgrade", tag: wanted } : decide(current, tags, state, approved);
  if (d.action === "hold") {
    console.log(`held ${d.tag}: the release waits for "Install" in the cluster's Slack channel. Run upgrade.mjs ${d.tag} to install the release by hand.`);
    return;
  }
  if (d.action === "ask") {
    const post = spawnSync(process.execPath, [path.join(here, "../cluster/post.mjs"), "upgrade", `:arrow_up: Knowledge repo ${d.tag.split("@").pop()} is a new major version (the stack runs ${current}).${releaseNotes(git("remote", "get-url", "origin"), d.tag)}`, process.env.COMPUTER ?? "", d.tag], { encoding: "utf8" });
    if (post.status === 0) { state.asked = { ...(state.asked ?? {}), [d.tag]: Date.now() }; fs.writeFileSync(stateFile, JSON.stringify(state)); }
    return;
  }
  if (d.action !== "upgrade") return;
  const before = git("rev-parse", "HEAD");
  const run = setupRunner({ kit, rootSteps: Boolean(process.env.KIT_ROOT_STEPS), password: rootPassword, record: () => { state.setupRanAt = Date.now(); saveState(); } });
  git("checkout", "--quiet", d.tag);
  if (run()) {
    // A release that changes the services or timers needs the full setup, which asks for sudo.
    const changed = git("diff", "--name-only", before, "HEAD", "--", "circlechat/kit/lib.sh", "circlechat/setup-node.sh", "circlechat/cluster/install-cluster.sh");
    if (changed || /install_unit/.test(git("diff", before, "HEAD", "--", "circlechat/setup-host.sh"))) say(`:information_source: Upgraded to ${d.tag.split("@").pop()}. This release changes the computer's services: run setup-host.sh, setup-node.sh and install-cluster.sh once by hand to apply them.`);
    console.log(`upgraded to ${d.tag}`);
    return;
  }
  git("checkout", "--quiet", before);
  run();
  state.failed = { ...(state.failed ?? {}), [d.tag]: Date.now() }; saveState();
  say(`:x: The upgrade of the knowledge repo to ${d.tag.split("@").pop()} failed on the setup or the checks. The stack is back on ${current}, and skips ${d.tag.split("@").pop()} until a newer release appears.`);
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main();
