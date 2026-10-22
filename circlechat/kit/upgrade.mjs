// Upgrade the stack to each new release of the knowledge repo (tags @recursica/knowledge@X.Y.Z).
// Runs hourly on the control computer when site.json sets upgrade.auto, as the account that owns
// the stack, instead of the hourly pull of main.
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
import path from "node:path";
import { stackSlack } from "./slack.mjs";

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

async function main() {
  const ws = process.env.WS, ccDir = process.env.CC_DIR, k = path.join(ws, "recursica-knowledge");
  const here = path.dirname(new URL(import.meta.url).pathname);
  const stateFile = path.join(ccDir, "kit-out/upgrade-state.json");
  let state = {}; try { state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const git = (...a) => execFileSync("git", ["-C", k, ...a], { encoding: "utf8" }).trim();
  const post = stackSlack(ccDir);
  const say = (text) => { post(text).catch(() => {}); };
  // CircleChat: each new commit on the fork's branch is rebuilt, checked and rolled back on a
  // failure. The weekly upstream sync brings the original project's changes to that branch.
  const saveState = () => fs.writeFileSync(stateFile, JSON.stringify(state));
  try { pickUpCircleChat(ccDir, say, state, saveState); } catch (e) { say(`:x: CircleChat update failed to start: ${e.message}`); }
  git("fetch", "--tags", "--quiet");
  const current = JSON.parse(fs.readFileSync(path.join(k, "package.json"), "utf8")).version;
  const tags = git("tag", "--list", "@recursica/knowledge@*").split("\n").filter(Boolean);
  const wanted = process.argv[2];
  const d = wanted ? { action: "upgrade", tag: wanted } : decide(current, tags, state);
  if (d.action === "ask") {
    const post = spawnSync(process.execPath, [path.join(here, "../cluster/post.mjs"), "upgrade", `:arrow_up: Knowledge repo ${d.tag.split("@").pop()} is a new major version (the stack runs ${current}). Release notes: https://github.com/borderux/recursica-knowledge/releases/tag/${encodeURIComponent(d.tag)}`, process.env.COMPUTER ?? "", d.tag], { encoding: "utf8" });
    if (post.status === 0) { state.asked = { ...(state.asked ?? {}), [d.tag]: Date.now() }; fs.writeFileSync(stateFile, JSON.stringify(state)); }
    return;
  }
  if (d.action !== "upgrade") return;
  const before = git("rev-parse", "HEAD");
  const run = () => {
    const opts = { env: { ...process.env, NO_PULL: "1" }, stdio: "inherit" };
    const a = spawnSync("bash", [path.join(k, "circlechat/setup-host.sh"), "--upgrade"], opts);
    const b = a.status === 0 ? spawnSync("bash", [path.join(k, "circlechat/sync-skills.sh")], opts) : a;
    return a.status === 0 && b.status === 0;
  };
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
