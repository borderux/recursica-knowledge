// Upgrade the stack to each new release of the knowledge repo (tags @recursica/knowledge@X.Y.Z).
// Runs hourly on the control computer when site.json sets upgrade.auto, as the account that owns
// the stack.
//
// The kit checkout this script runs from moves to each release: root runs that checkout, which
// sits outside the agents' workspace. The setup runs from the kit checkout, and the agents' skills
// and personas come from it. The script never runs git in the workspace's checkouts: agents can
// change them, and the agents update their own checkouts from inside their containers.
//
//   - A release with the same first number installs on its own: check out the release, rerun the
//     setup, sync the agents, and check the stack. On a failure, the stack goes back to the
//     version it ran, and Slack gets a message.
//   - A release with a higher first number (a major version) asks first, in Slack.
//
//   node upgrade.mjs              the hourly check
//   node upgrade.mjs <tag>        upgrade to one release now (the Slack button runs this)
import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { kitProblem } from "../cluster/kit-check.mjs";
import { stackSlack } from "./slack.mjs";
import { readFile as readInPlace, writeFile as writeInPlace } from "./safe-files.mjs";

const TAG = /^@recursica\/knowledge@(\d+)\.(\d+)\.(\d+)$/;
export const parse = (t) => { const m = String(t).match(TAG); return m ? m.slice(1).map(Number) : null; };
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];

// What to do: nothing, upgrade on its own, or ask (a new major version, asked once per release).
export function decide(current, tags, state = {}) {
  const cur = String(current).split(".").map(Number);
  const newer = tags.map((t) => [t, parse(t)]).filter(([, v]) => v && cmp(v, cur) > 0).sort((a, b) => cmp(a[1], b[1]));
  if (!newer.length) return { action: "none" };
  // A release that failed once is skipped until a newer one appears, or a person presses
  // "Upgrade now", so a broken release never restarts the stack every hour.
  const sameMajor = newer.filter(([t, v]) => v[0] === cur[0] && !state.failed?.[t]);
  if (sameMajor.length) return { action: "upgrade", tag: sameMajor[sameMajor.length - 1][0] };
  const majors = newer.filter(([, v]) => v[0] > cur[0]);
  if (!majors.length) return { action: "none" };
  const [tag] = majors[majors.length - 1];
  if (state.asked?.[tag] || state.skipped?.[tag]) return { action: "none" };
  return { action: "ask", tag };
}

function pickUpCircleChat(ccDir, say, state, saveState) {
  const cc = (...a) => execFileSync("git", ["-C", ccDir, ...a], { encoding: "utf8" }).trim();
  const branch = cc("rev-parse", "--abbrev-ref", "HEAD");
  if (branch === "HEAD") return;
  cc("fetch", "--quiet", "origin", branch);
  const before = cc("rev-parse", "HEAD"), after = cc("rev-parse", `origin/${branch}`);
  if (before === after || state.ccFailed === after) return;
  const port = (fs.readFileSync(path.join(ccDir, ".env"), "utf8").match(/^CC_API_BASE=http:\/\/localhost:(\d+)/m) ?? [])[1] ?? "8080";
  const rebuild = () => spawnSync("docker", ["compose", "up", "-d", "--build"], { cwd: ccDir, stdio: "inherit" }).status === 0
    && spawnSync("bash", ["-c", `for i in $(seq 1 30); do curl -fsS -o /dev/null http://localhost:${port}/ && exit 0; sleep 10; done; exit 1`]).status === 0;
  cc("merge", "--ff-only", "--quiet", `origin/${branch}`);
  if (rebuild()) { console.log(`CircleChat updated to ${after.slice(0, 7)}`); return; }
  cc("reset", "--hard", "--quiet", before);
  rebuild();
  state.ccFailed = after; saveState();
  say(`:x: The CircleChat update to ${after.slice(0, 7)} failed its health check. CircleChat is back on ${before.slice(0, 7)}, and stays there until the next CircleChat commit.`);
}

// The release notes of a tag, on the GitHub repo the kit checkout came from, or nothing for a
// checkout from somewhere else.
export function releaseNotes(remote, tag) {
  const m = String(remote).trim().match(/github\.com[/:]([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+?)(\.git)?$/);
  return m ? ` Release notes: https://github.com/${m[1]}/releases/tag/${encodeURIComponent(tag)}` : "";
}

// Recursica's own npm package, @recursica/mcp: same rule as the knowledge repo, applied hourly.
// A release with the same first number goes in at once; a new major version asks in Slack.
export function decideMcp(current, latest, state = {}) {
  const cur = String(current).trim().split(".").map(Number), lat = String(latest).trim().split(".").map(Number);
  if (lat.length !== 3 || lat.some(Number.isNaN) || cmp(lat, cur) <= 0) return { action: "none" };
  if (lat[0] === cur[0]) return { action: "upgrade", version: latest };
  const tag = `@recursica/mcp@${latest}`;
  if (state.asked?.[tag] || state.skipped?.[tag]) return { action: "none" };
  return { action: "ask", tag };
}

async function updateMcp(ws, stateFile, state, say) {
  // Agents can change the workspace: the file is read and written without following a symlink.
  const file = path.join(ws, ".recursica-mcp-version");
  const current = readInPlace(ws, file)?.trim();
  if (!current) return;
  const r = await fetch("https://registry.npmjs.org/@recursica/mcp/latest", { signal: AbortSignal.timeout(20_000) }).catch(() => null);
  if (!r?.ok) return;
  const latest = (await r.json()).version;
  const d = decideMcp(current, latest, state);
  if (d.action === "upgrade") { writeInPlace(ws, file, `${d.version}\n`); console.log(`@recursica/mcp ${current} -> ${d.version}`); }
  if (d.action === "ask") {
    const here = path.dirname(new URL(import.meta.url).pathname);
    const post = spawnSync(process.execPath, [path.join(here, "../cluster/post.mjs"), "upgrade", `:arrow_up: @recursica/mcp ${latest} is a new major version (the agents run ${current}).`, process.env.COMPUTER ?? "", d.tag], { encoding: "utf8" });
    if (post.status === 0) { state.asked = { ...(state.asked ?? {}), [d.tag]: Date.now() }; fs.writeFileSync(stateFile, JSON.stringify(state)); }
  }
}

// The setup for one release, as the owner. With KIT_ROOT_STEPS, the root process that started this
// script (cluster/root-steps.mjs) prepared the gateway's files, and passed the database role's
// password on stdin. The setup then takes only the Docker steps, and the owner needs no sudo. After
// this script ends, the root process runs the skill sync as the owner, then the key check. Without
// KIT_ROOT_STEPS, such as a run by hand in a terminal, the setup uses sudo as before, and the skill
// sync runs here as the owner.
//   record(): called before each run of setup-host.sh, so the root process knows the setup ran
export function setupRunner({ kit, rootSteps, password = "", record = () => {}, run = spawnSync }) {
  return () => {
    record();
    const env = { ...process.env };
    if (!rootSteps) {
      const opts = { env, stdio: "inherit" };
      const a = run("bash", [path.join(kit, "circlechat/setup-host.sh"), "--upgrade"], opts);
      const b = a.status === 0 ? run("bash", [path.join(kit, "circlechat/sync-skills.sh")], opts) : a;
      return a.status === 0 && b.status === 0;
    }
    const a = run("bash", [path.join(kit, "circlechat/setup-host.sh"), "--upgrade"], { env: { ...env, KIT_ROOT_STEPS: "1" }, input: `${password}\n`, stdio: ["pipe", "inherit", "inherit"] });
    return a.status === 0;
  };
}

// The database role's password, which the root process passes on stdin with KIT_ROOT_STEPS.
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
  // CircleChat: each new commit on the fork's branch is rebuilt, checked and rolled back on a
  // failure. The weekly upstream sync brings the original project's changes to that branch.
  const saveState = () => fs.writeFileSync(stateFile, JSON.stringify(state));
  try { pickUpCircleChat(ccDir, say, state, saveState); } catch (e) { say(`:x: CircleChat update failed to start: ${e.message}`); }
  await updateMcp(ws, stateFile, state, say).catch((e) => console.error(`@recursica/mcp check: ${e.message}`));
  git("fetch", "--tags", "--quiet");
  const current = JSON.parse(fs.readFileSync(path.join(kit, "package.json"), "utf8")).version;
  const tags = git("tag", "--list", "@recursica/knowledge@*").split("\n").filter(Boolean);
  const wanted = process.argv[2];
  const d = wanted ? { action: "upgrade", tag: wanted } : decide(current, tags, state);
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
    // The upgrade syncs only the agents' skills and personas. A release that changes the rest of an
    // agent's setup, such as the agent's gateway access, needs setup-agent.sh by hand.
    if (git("diff", "--name-only", before, "HEAD", "--", "circlechat/setup-agent.sh", "circlechat/gateway/hermes-access.mjs")) say(`:information_source: Upgraded to ${d.tag.split("@").pop()}. This release changes the agents' setup: run setup-agent.sh once by hand for each agent.`);
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
