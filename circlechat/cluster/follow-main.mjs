// The kit checkout follows main, with "follow": "main" in site.json's updates block. The update job
// (updater.mjs) runs the step each hour, as root, on every computer: the control computer and
// each helper. The kit's default, updates.follow "releases", installs only approved releases
// (release-gate.mjs), and the step does nothing.
//
// Each hour, on a computer whose kit follows main:
//   1. As the owner, git fetches origin/main in the kit checkout. Nothing new: the step ends.
//   2. GitHub must show each new commit as verified. Any other commit stops the update, and the
//      cluster's channel hears once about each commit that stops the update.
//   3. The update waits until RecursicaChat 2.0 is quiet, the rule of the image pins and Homebrew
//      updates (quiet.mjs). The channel hears once about each update that waits.
//   4. The checkout fast-forwards to the new commit.
//   5. The setups the change touches run again (SETUPS): setup-host.sh on the control computer,
//      and setup-node.sh and install-cluster.sh on each computer. rc-deploy never runs here.
//   6. The channel gets one line: the computer, the old and new commit, and the result.
//
// The full setups call sudo as the owner. A setup runs again only when the owner has password-free
// sudo. Otherwise the channel's line names the command to run by hand. On the control computer,
// setup-host.sh --upgrade still runs, with root's own steps (root-steps.mjs), and needs no sudo.
//
// A failed setup posts the last lines of the setup's output. The checkout stays at the new commit
// for a person to look at, and the next update waits for a newer commit on main. That update runs
// the failed setup again, with each setup the newer change touches.
import { spawnSync } from "node:child_process";
import path from "node:path";

// The kit files each setup reads. A change to one of the listed files runs the setup again. A path that
// ends in "/" is a folder.
export const SETUPS = {
  "setup-host.sh": [
    "circlechat/setup-host.sh", "circlechat/kit/", "circlechat/backup/", "circlechat/egress/", "circlechat/gateway/", "circlechat/github/",
    "circlechat/notify/", "circlechat/rc-service.sh", "circlechat/rc-session.sh", "circlechat/rc-sync.sh", "circlechat/sync-skills.sh",
    "circlechat/cluster/cloud-requests.mjs", "circlechat/cluster/windows/install-wsl-boot.ps1", "tools/kev/",
  ],
  "setup-node.sh": [
    "circlechat/setup-node.sh", "circlechat/kit/lib.sh", "circlechat/kit/render.mjs", "circlechat/egress/", "circlechat/jobd/porter-job/",
    "circlechat/rustdesk/",
  ],
  "install-cluster.sh": ["circlechat/cluster/install-cluster.sh", "circlechat/kit/lib.sh", "circlechat/cluster/firewall/"],
};
const ORDER = Object.keys(SETUPS);
// A line that a change adds to or removes from setup-host.sh or lib.sh, and that installs or
// removes a service or a job. Only the full setup-host.sh, with sudo, applies such a line.
const UNIT_LINE = /^[+-](?![+-]).*\b(un)?install_unit\b/m;

// The setups a list of changed files touches, in the order the setups run. A helper computer runs no
// setup-host.sh.
//   carried: setups an earlier update left to run, such as a setup that failed
export function touchedSetups(files, { control, carried = [] } = {}) {
  const hit = (prefix) => files.some((f) => (prefix.endsWith("/") ? f.startsWith(prefix) : f === prefix));
  return ORDER.filter((s) => (control || s !== "setup-host.sh") && (carried.includes(s) || SETUPS[s].some(hit)));
}

// The GitHub repo of the kit checkout's origin, as "owner/name", or "" for a remote off GitHub.
export function githubRepo(remote) {
  const m = String(remote).trim().match(/github\.com[/:]([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+?)(\.git)?$/);
  return m ? m[1] : "";
}

// Whether GitHub shows each new commit as verified. GitHub's compare view must list exactly the
// commits git fetched, and the old commit must be an ancestor of the new one.
//   shas: the new commits from git rev-list old..new
//   get(url): the parsed JSON of one GitHub API page
//   returns { ok: true }, { ok: false, sha, reason } for a commit that stops the update, or
//   { error } when GitHub can't be asked, and the next hour asks again
export async function checkVerified({ repo, from, to, shas, get }) {
  if (!repo) return { ok: false, sha: to, reason: "the kit checkout's origin is not on GitHub, so GitHub can't verify the commits" };
  const listed = [];
  for (let page = 1; page <= 20; page++) {
    let j;
    try { j = await get(`https://api.github.com/repos/${repo}/compare/${from}...${to}?per_page=100&page=${page}`); }
    catch (e) { return { error: `GitHub's compare view failed: ${e.message}` }; }
    if (j?.status !== "ahead") return { ok: false, sha: to, reason: `GitHub says main is ${j?.status ?? "unknown"} from the kit's commit, not ahead` };
    const commits = Array.isArray(j.commits) ? j.commits : [];
    listed.push(...commits);
    if (!commits.length || listed.length >= (j.total_commits ?? 0)) break;
  }
  const seen = new Set(listed.map((c) => c.sha));
  const missing = shas.find((s) => !seen.has(s));
  if (missing || seen.size !== shas.length) return { ok: false, sha: missing ?? to, reason: "GitHub's list of new commits differs from the commits git fetched" };
  const bad = listed.find((c) => c.commit?.verification?.verified !== true);
  if (bad) return { ok: false, sha: bad.sha, reason: `GitHub shows the commit as not verified (${bad.commit?.verification?.reason ?? "no reason given"})` };
  return { ok: true };
}

// The last lines of a setup's output for Slack, with each long token-like string hidden.
export function lastLines(text, n = 15) {
  const lines = String(text ?? "").replace(/\r/g, "").split("\n").filter((l) => l.trim());
  return lines.slice(-n).map((l) => l.replace(/\b(sk-|ghp_|gho_|ghs_|github_pat_|xox[a-z]-)[A-Za-z0-9_-]+/g, "$1<hidden>").replace(/[A-Za-z0-9+/_=-]{32,}/g, "<hidden>")).join("\n");
}

const short = (sha) => String(sha).slice(0, 7);
const list = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

// The one line for the cluster's channel after an update.
//   ran: setups that ran and passed; manual: { setup, command } for each setup that needs a person
//   failed: { setup, output } for the setup that failed
export function resultPost({ computer, from, to, count, ran = [], manual = [], failed = null, hostNote = "" }) {
  const head = `Kit on ${computer}: ${short(from)} → ${short(to)}, ${count} new commit${count === 1 ? "" : "s"} on main.`;
  if (failed) {
    const tail = lastLines(failed.output);
    return `:x: ${head} ${failed.setup} failed${ran.length ? ` after ${list(ran)} passed` : ""}. The checkout stays at ${short(to)} for a person to look at, and the next update waits for a newer commit on main.${tail ? `\n\`\`\`\n${tail}\n\`\`\`` : ""}`;
  }
  const parts = [ran.length ? `Ran ${list(ran)} again.` : manual.length ? "" : "No setup needed to run again."];
  if (manual.length) parts.push(`${list(manual.map((m) => m.setup))} need${manual.length === 1 ? "s" : ""} a person, because the owner has no password-free sudo. Run ${manual.map((m) => m.command).join(", then ")} by hand.`);
  if (hostNote) parts.push(hostNote);
  return `${manual.length || hostNote ? ":warning:" : ":white_check_mark:"} ${head} ${parts.filter(Boolean).join(" ")}`;
}

// The update's decision before any change: what to do with the kit checkout this hour.
//   head, target: the checkout's commit and origin/main's; ancestor: head is an ancestor of target
//   branch: the checkout's branch, or "" when detached; mainAncestor: the local main is an ancestor of target
export function decide({ head, target, ancestor, branch, mainAncestor }) {
  if (!target || head === target) return { action: "none" };
  if (!ancestor) return { action: "stop", key: `diverged:${head}:${target}`, reason: `the checkout's commit ${short(head)} is not on main's history, so a fast-forward to ${short(target)} can't happen. Move the checkout to main by hand` };
  if (branch !== "main" && branch !== "") return { action: "stop", key: `branch:${branch}`, reason: `the checkout is on the branch ${branch}, not main. Switch the checkout to main by hand` };
  if (branch === "" && !mainAncestor) return { action: "stop", key: `main:${target}`, reason: `the checkout's main branch has commits that origin/main lacks, so main can't fast-forward to ${short(target)}` };
  return { action: "update" };
}

// One hourly run of the step. Every outside effect comes through deps, for the tests:
//   git(...args): { status, stdout, stderr } of git in the kit checkout, run as the owner
//   get(url): GitHub API JSON; quiet(): { quiet, why }; post(text): the cluster's channel
//   sudoFree(): whether the owner has password-free sudo
//   setup(name): { status, output } of one setup run as the owner, the full setup
//   hostUpgrade(): { ok, output, problems } of setup-host.sh --upgrade with root's steps, for each local stack
//   state: the update job's state object, changed in place (state.follow)
//   returns a short word for the log: none, stopped, waiting, updated, failed
export async function followMain({ computer, control, git, get, quiet, post, sudoFree, setup, hostUpgrade, state }) {
  const follow = state.follow ?? {};
  const g = (...a) => { const r = git(...a); return { ...r, out: String(r.stdout ?? "").trim() }; };
  const fetched = g("fetch", "--quiet", "origin", "main");
  if (fetched.status !== 0) { console.error(`kit follows main: git fetch failed: ${String(fetched.stderr ?? "").trim()}`); return "none"; }
  const head = g("rev-parse", "HEAD").out, target = g("rev-parse", "refs/remotes/origin/main").out;
  const tell = async (key, text) => {
    if (follow.told === key) return;
    const r = await post(text).catch(() => ({ ok: false }));
    if (r?.ok !== false) follow.told = key;
  };
  const save = () => { state.follow = follow; };
  const ancestor = head && target ? g("merge-base", "--is-ancestor", head, target).status === 0 : false;
  const branch = g("symbolic-ref", "--short", "-q", "HEAD").out;
  const hasMain = g("rev-parse", "--verify", "-q", "refs/heads/main").status === 0;
  const mainAncestor = !hasMain || g("merge-base", "--is-ancestor", "refs/heads/main", target).status === 0;
  const d = decide({ head, target, ancestor, branch, mainAncestor });
  if (d.action === "none") { save(); return "none"; }
  if (d.action === "stop") { await tell(d.key, `:warning: Kit on ${computer} stays at ${short(head)}: ${d.reason}.`); save(); return "stopped"; }

  // 2. Every new commit must be verified by GitHub.
  const shas = g("rev-list", `${head}..${target}`).out.split("\n").filter(Boolean);
  const v = await checkVerified({ repo: githubRepo(g("remote", "get-url", "origin").out), from: head, to: target, shas, get });
  if (v.error) { console.error(`kit follows main: ${v.error}. The next hour asks again.`); save(); return "none"; }
  if (!v.ok) {
    await tell(`unverified:${v.sha}`, `:rotating_light: Kit on ${computer} stays at ${short(head)}: commit ${short(v.sha)} on main stops the update. ${v.reason}. A person checks the commit before the kit moves past the commit.`);
    save(); return "stopped";
  }
  // 3. Wait until RecursicaChat is quiet.
  const q = await quiet();
  if (!q.quiet) {
    await tell(`waiting:${target}`, `:hourglass: Kit on ${computer}: the update from ${short(head)} to ${short(target)} waits until RecursicaChat is quiet, with no agent work queued and no one online. Now: ${q.why}.`);
    save(); return "waiting";
  }
  // 4. Fast-forward. A detached checkout, such as a release tag, moves to main first.
  if (branch === "") {
    const sw = g("checkout", "--quiet", "main");
    if (sw.status !== 0) { await tell(`switch:${target}`, `:x: Kit on ${computer} stays at ${short(head)}: git could not switch the checkout to main. ${lastLines(sw.stderr, 3)}`); save(); return "stopped"; }
  }
  const ff = g("merge", "--ff-only", "--quiet", target);
  if (ff.status !== 0) {
    const now = g("rev-parse", "HEAD").out;
    await tell(`ff:${target}`, `:x: Kit on ${computer} stays at ${short(now)}: the fast-forward to ${short(target)} failed. ${lastLines(ff.stderr, 3)}`);
    save(); return "stopped";
  }
  // 5. Run each setup the change touches again, and each setup an earlier failure left.
  const files = g("diff", "--name-only", head, target).out.split("\n").filter(Boolean);
  const todo = touchedSetups(files, { control, carried: follow.failedAt === head ? follow.pending ?? [] : [] });
  const ran = [], manual = [];
  let failed = null, hostNote = "";
  const free = todo.length ? await sudoFree() : false;
  for (const s of todo) {
    if (s === "setup-host.sh" && !free) {
      // setup-host.sh --upgrade needs no sudo. The services and jobs of the full setup wait for a person.
      const r = await hostUpgrade();
      if (!r.ok) { failed = { setup: "setup-host.sh --upgrade", output: r.output }; break; }
      ran.push("setup-host.sh --upgrade");
      if (r.problems?.length) hostNote = `After setup-host.sh --upgrade, ${r.problems.join(", and ")}.`;
      if (UNIT_LINE.test(g("diff", "-U0", head, target, "--", "circlechat/setup-host.sh", "circlechat/kit/lib.sh").out)) manual.push({ setup: "setup-host.sh", command: "./circlechat/setup-host.sh" });
      continue;
    }
    if (!free) {
      manual.push({ setup: s, command: s === "setup-node.sh" ? `./circlechat/setup-node.sh ${computer}` : `./circlechat/cluster/install-cluster.sh ${computer}` });
      continue;
    }
    const r = await setup(s);
    if (r.status !== 0) { failed = { setup: s, output: r.output }; break; }
    ran.push(s);
  }
  // 6. One line in the cluster's channel.
  const text = resultPost({ computer, from: head, to: target, count: shas.length, ran, manual, failed, hostNote });
  await post(text).catch(() => {});
  if (failed) {
    const left = todo.slice(todo.findIndex((s) => failed.setup.startsWith(s)));
    state.follow = { failedAt: target, pending: left };
    return "failed";
  }
  state.follow = {};
  return "updated";
}

// The real effects, for updater.mjs. Runs as root.
//   env: /etc/agent-cluster.conf and /etc/agent-cluster.env (COMPUTER, OWNER, OWNER_HOME, KIT, PATH)
export function realDeps({ env, stacks, afterUpgrade, prepare }) {
  const asOwner = (args, opts = {}) => spawnSync("sudo", ["-u", env.OWNER, "-H", ...args], { encoding: "utf8", maxBuffer: 64 << 20, ...opts });
  const kit = env.KIT;
  const site = path.join(env.OWNER_HOME, "circlechat/site.json");
  const ownerEnv = (extra = {}) => ["env", ...Object.entries({ PATH: env.PATH, SITE: site, ...extra }).map(([k, v]) => `${k}=${v}`)];
  const output = (r) => `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}`;
  const show = (r) => { process.stdout.write(output(r)); return r; };
  const HOUR = 3600_000;
  return {
    git: (...a) => asOwner(["git", "-C", kit, ...a]),
    get: async (url) => {
      const r = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "recursica-kit-updater" }, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    sudoFree: () => asOwner(["sudo", "-n", "true"], { stdio: "ignore", timeout: 30_000 }).status === 0,
    setup: (name) => {
      const script = { "setup-host.sh": "circlechat/setup-host.sh", "setup-node.sh": "circlechat/setup-node.sh", "install-cluster.sh": "circlechat/cluster/install-cluster.sh" }[name];
      const args = name === "setup-host.sh" ? [] : [env.COMPUTER];
      // setup-host.sh sets up each stack this computer controls. The other setups serve the cluster's own stack.
      const runs = name === "setup-host.sh" ? stacks.map((st) => ({ CC_DIR: st.ccDir, WS: st.ws, SITE: path.join(st.ccDir, "site.json"), ...(st.tenant ? { TENANT: st.tenant } : {}) })) : [{}];
      let all = "";
      for (const extra of runs) {
        const r = show(asOwner([...ownerEnv(extra), "bash", path.join(kit, script), ...args], { input: "", timeout: HOUR }));
        all += output(r);
        if (r.status !== 0) return { status: r.status ?? 1, output: all };
      }
      return { status: 0, output: all };
    },
    hostUpgrade: () => {
      let all = "";
      const problems = [];
      for (const st of stacks) {
        let password;
        try { password = prepare(st.ccDir); } catch (e) { return { ok: false, output: e.message }; }
        const r = show(asOwner([...ownerEnv({ KIT_ROOT_STEPS: "1", CC_DIR: st.ccDir, WS: st.ws, SITE: path.join(st.ccDir, "site.json"), ...(st.tenant ? { TENANT: st.tenant } : {}) }),
          "bash", path.join(kit, "circlechat/setup-host.sh"), "--upgrade"], { input: `${password}\n`, timeout: HOUR }));
        all += output(r);
        if (r.status !== 0) return { ok: false, output: all };
        problems.push(...afterUpgrade({ env, ccDir: st.ccDir }));
      }
      return { ok: true, output: all, problems };
    },
  };
}

