// The knowledge MCP server's exports. The server serves one commit of the knowledge repo, read-only,
// from /opt/recursica-knowledge/current (kit/knowledge.mjs). Each hour, on the control computer of
// a stack with a knowledge block, the update job (updater.mjs) runs this step, as root:
//
//   1. The kit checkout's origin must name the kit's repo (kit-repo.mjs). As the owner, git fetches
//      origin/main in the kit checkout: the knowledge repo is the kit's repo. The step follows main
//      whatever updates.follow says, because the skills change on main.
//   2. Nothing new: main's commit is the one `current` names, and the step ends.
//   3. GitHub must show the commit as verified, on main (root-copies.mjs verifiedOnMain). Any other
//      commit stops the step, and the cluster's channel hears once.
//   4. The export, as the export account, which has no other power: git archive of the commit, run
//      as the owner, unpacked by the export account into a new folder of its own, with no .git. Then
//      Kev's packages, from tools/kev's lock file, with npm ci --omit=dev --ignore-scripts, as the
//      export account: no package's install script runs.
//   5. Root takes the folder: root owns every file, no account can change one, every account can
//      read one. A link that leads out of the export stops the step. The folder gets the commit's
//      name, /opt/recursica-knowledge/<commit>, and .knowledge-export.json, with the commit and
//      its date, because an export has no .git to say which commit it is.
//   6. The switch: a new link, renamed over `current` in one step. The server resolves the link at
//      the start of each call, so a call is answered from one commit, and the next call from the
//      new one, with no restart.
//   7. The last few exports stay (KEEP), so a call that began on an older one finishes on it. Older
//      exports, and any folder a failed run left, are removed.
//   8. When the server's own code changed between the two exports, the server restarts, so it runs
//      the new code, once RecursicaChat is quiet (quiet.mjs). Until then the old code serves the new
//      commit. A change of the skills alone restarts nothing.
// A failed export leaves `current` as it was, and the next hour tries again.
//
//   node knowledge-export.mjs once     the step once, for setup-host.sh's first export, with the
//                                      settings in the environment (OWNER, OWNER_HOME, KIT)
import crypto from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { gitAsOwner } from "./follow-main.mjs";
import { isRepo } from "./kit-repo.mjs";
import { notice } from "./notice.mjs";
import { verifiedOnMain } from "./root-copies.mjs";
import { KNOWLEDGE_EXPORTS, KNOWLEDGE_STATE, KNOWLEDGE_UNIT, knowledgeAccounts } from "../kit/knowledge.mjs";

export const KEEP = 3;
export const EXPORT_FILE = ".knowledge-export.json";
// The server's own code: a change here restarts the server.
export const SERVER_CODE = "tools/knowledge-mcp/server.mjs";
const SHA = /^[0-9a-f]{40}$/;
const short = (sha) => String(sha ?? "").slice(0, 7);

/** The commit `current` names, or "". */
export function currentCommit(exportsDir = KNOWLEDGE_EXPORTS, fsx = fs) {
  try {
    const name = path.basename(fsx.readlinkSync(path.join(exportsDir, "current")));
    return SHA.test(name) ? name : "";
  } catch { return ""; }
}

/**
 * The exports to remove: every commit folder but the current one and the KEEP newest, by the time
 * each was exported, and every folder or link a failed run left.
 *   exports: [{ name, exportedAt }] of the folder's entries, with exportedAt in ms, or 0 when unknown
 */
export function stale(exports, current, keep = KEEP) {
  const newest = exports.filter((e) => SHA.test(e.name)).sort((a, b) => b.exportedAt - a.exportedAt).slice(0, keep).map((e) => e.name);
  const kept = new Set([current, ...newest]);
  return exports.map((e) => e.name).filter((n) => (SHA.test(n) && !kept.has(n)) || /^\.new-/.test(n));
}

/** Each entry of the exports folder, with the time its export was made. */
function listExports(exportsDir, fsx) {
  return fsx.readdirSync(exportsDir).map((name) => {
    let exportedAt = 0;
    try { exportedAt = Date.parse(JSON.parse(fsx.readFileSync(path.join(exportsDir, name, EXPORT_FILE), "utf8")).exportedAt) || 0; } catch {}
    return { name, exportedAt };
  });
}

/**
 * Why the unpacked tree can't be served, or null: a link whose target leads out of the tree, or a
 * file that is neither a plain file, a folder nor a link.
 */
export function treeProblem(dir, fsx = fs) {
  const walk = (d) => {
    for (const e of fsx.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, e.name);
      if (e.isSymbolicLink()) {
        const target = path.resolve(path.dirname(p), fsx.readlinkSync(p));
        if (target !== dir && !target.startsWith(`${dir}${path.sep}`)) return `${path.relative(dir, p)} links out of the export`;
      } else if (e.isDirectory()) {
        const inner = walk(p);
        if (inner) return inner;
      } else if (!e.isFile()) return `${path.relative(dir, p)} is not a plain file`;
    }
    return null;
  };
  return walk(dir);
}

/** Root owns the tree, and every account can read it and none can change it. Never through a link. */
export function seal(dir, fsx = fs) {
  const walk = (p) => {
    const st = fsx.lstatSync(p);
    fsx.lchownSync(p, 0, 0);
    if (st.isSymbolicLink()) return;
    // chown before chmod: chown clears the setuid and setgid bits.
    fsx.chmodSync(p, st.isDirectory() ? 0o755 : (st.mode & 0o111 ? 0o755 : 0o644));
    if (st.isDirectory()) for (const n of fsx.readdirSync(p)) walk(path.join(p, n));
  };
  walk(dir);
}

/**
 * One run of the step. Every outside effect comes through deps, for the tests:
 *   git(...args): { status, stdout, stderr } of git in the kit checkout, as the owner
 *   verify(commit): verifiedOnMain's answer; quiet(): { quiet, why }; post(text): the cluster's channel
 *   unpack(commit, dir): { status, output } of git archive as the owner, unpacked by the export account
 *   npm(dir): { status, output } of npm ci in dir, as the export account
 *   claim(dir): makes dir, empty, the export account's; seal(dir), problem(dir): as above
 *   restart(): { ok, output } of the server's restart; installed(): whether the server's unit exists
 *   fsx: the file effects; state: the update job's state, changed in place (state.knowledge)
 *   returns a word for the log: none, stopped, failed, exported
 */
export async function exportStep({ computer, kitRepo, git, verify, quiet, post, unpack, npm, claim, sealTree = seal, problem = treeProblem, restart, installed, state, exportsDir = KNOWLEDGE_EXPORTS, fsx = fs, now = () => Date.now(), log = console.log }) {
  const k = (state.knowledge ??= {});
  const g = (...a) => { const r = git(...a); return { ...r, out: String(r.stdout ?? "").trim() }; };
  const tell = (key, text) => notice(k, "told", key, text, post, now());
  const current = currentCommit(exportsDir, fsx);

  // A restart that waited for a quiet RecursicaChat.
  const restartIfDue = async () => {
    if (!k.restart || !(await installed())) { delete k.restart; return; }
    const q = await quiet();
    if (!q.quiet) { log(`knowledge: the server's restart for ${short(k.restart)} waits until RecursicaChat is quiet (${q.why})`); return; }
    const r = await restart();
    if (r?.ok) log(`knowledge: restarted the server for ${short(k.restart)}, so it runs the new code`);
    else await post(`:x: Knowledge on ${computer}: the knowledge MCP server's restart for ${short(k.restart)} failed. ${String(r?.output ?? "").trim().split("\n").slice(-3).join(" ")}`.trim()).catch(() => {});
    delete k.restart;
  };

  if (kitRepo?.problem || !isRepo(g("remote", "get-url", "origin").out, kitRepo?.repo)) {
    // The follow step and the root copies' step already post about the kit's repo.
    log("knowledge: the kit checkout's origin is not the kit's repo, so no export");
    return "stopped";
  }
  const fetched = g("fetch", "--quiet", "origin", "main");
  if (fetched.status !== 0) { log(`knowledge: git fetch failed: ${String(fetched.stderr ?? "").trim()}`); await restartIfDue(); return "none"; }
  const target = g("rev-parse", "refs/remotes/origin/main").out;
  if (!SHA.test(target)) { log("knowledge: origin/main names no commit"); return "none"; }
  if (target === current) { await restartIfDue(); return "none"; }

  const v = await verify(target);
  if (v.error) { log(`knowledge: ${v.error}. The next hour asks again.`); return "none"; }
  if (!v.ok) {
    await tell(`unverified:${target}`, `:rotating_light: Knowledge on ${computer} stays at ${short(current) || "no export"}: commit ${short(target)} on main isn't served. ${v.reason}. A person checks the commit.`);
    return "stopped";
  }

  const fresh = path.join(exportsDir, `.new-${target}`);
  const fail = async (why) => {
    fsx.rmSync(fresh, { recursive: true, force: true });
    await tell(`failed:${target}:${why.slice(0, 80)}`, `:x: Knowledge on ${computer} stays at ${short(current) || "no export"}: the export of ${short(target)} failed. ${why}`);
    return "failed";
  };
  const final = path.join(exportsDir, target);
  if (!fsx.existsSync(path.join(final, EXPORT_FILE))) {
    fsx.rmSync(fresh, { recursive: true, force: true });
    try { claim(fresh); } catch (e) { return fail(e.message); }
    const u = await unpack(target, fresh);
    if (u.status !== 0) return fail(`git archive failed: ${String(u.output ?? "").trim().split("\n").slice(-3).join(" ")}`);
    if (fsx.existsSync(path.join(fresh, "tools/kev/package-lock.json"))) {
      const n = await npm(path.join(fresh, "tools/kev"));
      if (n.status !== 0) return fail(`npm ci in tools/kev failed: ${String(n.output ?? "").trim().split("\n").slice(-3).join(" ")}`);
    }
    const p = problem(fresh, fsx);
    if (p) return fail(p);
    sealTree(fresh, fsx);
    const committedAt = g("log", "-1", "--format=%cI", target).out || null;
    fsx.writeFileSync(path.join(fresh, EXPORT_FILE), `${JSON.stringify({ commit: target, committedAt, exportedAt: new Date(now()).toISOString() })}\n`, { mode: 0o644 });
    fsx.rmSync(final, { recursive: true, force: true });
    fsx.renameSync(fresh, final);
  }

  // The switch, in one step.
  const link = path.join(exportsDir, `.new-current-${crypto.randomBytes(4).toString("hex")}`);
  fsx.symlinkSync(target, link);
  fsx.renameSync(link, path.join(exportsDir, "current"));
  log(`knowledge: now serving ${target}${current ? `, was ${current}` : ""}`);

  // The server's own code changed, or this is the first export: the server restarts once
  // RecursicaChat is quiet, when its unit is installed. Until then it serves the new commit with its
  // old code, or, with no export before, fails to start until this one.
  const code = (sha) => { try { return fsx.readFileSync(path.join(exportsDir, sha, SERVER_CODE), "utf8"); } catch { return null; } };
  if (!current || code(current) !== code(target)) k.restart = target;

  // The last few exports stay, so a call that began on one finishes on it.
  for (const n of stale(listExports(exportsDir, fsx), target)) fsx.rmSync(path.join(exportsDir, n), { recursive: true, force: true });
  await restartIfDue();
  delete k.told;
  return "exported";
}

/** Whether the server's unit is installed (kit/lib.sh install_unit). */
const unitFile = (mac) => (mac ? `/Library/LaunchDaemons/io.recursica.${KNOWLEDGE_UNIT}.plist` : `/etc/systemd/system/${KNOWLEDGE_UNIT}.service`);

/**
 * The real effects, as root. env: OWNER, KIT, PATH. The export account's work folder, its HOME and
 * npm's cache, is /var/lib/recursica-knowledge/export-home.
 */
export function realExportDeps({ env, platform = process.platform, spawn = spawnSync }) {
  const mac = platform === "darwin";
  const { exporter } = knowledgeAccounts(platform);
  const home = path.join(KNOWLEDGE_STATE, "export-home");
  const nodeBin = path.dirname(process.execPath);
  const run = (cmd, args, opts = {}) => {
    const r = spawn(cmd, args, { encoding: "utf8", maxBuffer: 64 << 20, timeout: 30 * 60_000, ...opts });
    return { status: r.status ?? 1, output: `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}`, stdout: r.stdout, stderr: r.stderr };
  };
  const asExporter = (args, opts) => run("sudo", ["-u", exporter, "-H", "env", `HOME=${home}`, `PATH=${nodeBin}:/usr/bin:/bin`, `npm_config_cache=${path.join(home, "npm-cache")}`, ...args], opts);
  return {
    git: (...a) => run("sudo", ["-u", env.OWNER, "-H", ...gitAsOwner(env.KIT, a)]),
    get: async (url) => {
      const r = await fetch(url, { headers: { Accept: "application/vnd.github+json", "User-Agent": "recursica-kit-updater" }, signal: AbortSignal.timeout(30_000) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    },
    // The owner's git writes the archive; the export account unpacks it, so no file is root's yet.
    unpack: (commit, dir) => run("/bin/bash", ["-o", "pipefail", "-c",
      'sudo -u "$1" -H /bin/sh -c \'umask 022 && exec git -C "$1" archive --format=tar "$2"\' sh "$2" "$3" | sudo -u "$4" -H /bin/sh -c \'umask 022 && exec tar -x -f - -C "$1"\' sh "$5"',
      "unpack", env.OWNER, env.KIT, commit, exporter, dir]),
    npm: (dir) => asExporter(["/bin/sh", "-c", 'umask 022 && cd "$1" && exec npm ci --omit=dev --ignore-scripts --no-audit --no-fund', "sh", dir]),
    claim: (dir) => {
      fs.mkdirSync(dir, { mode: 0o700 });
      const uid = Number(String(run("id", ["-u", exporter]).stdout).trim());
      const gid = Number(String(run("id", ["-g", exporter]).stdout).trim());
      if (!Number.isInteger(uid) || !Number.isInteger(gid) || uid === 0) throw new Error(`there is no account ${exporter}. Run setup-host.sh`);
      fs.chownSync(dir, uid, gid);
    },
    restart: () => {
      const r = mac ? run("launchctl", ["kickstart", "-k", `system/io.recursica.${KNOWLEDGE_UNIT}`]) : run("systemctl", ["restart", `${KNOWLEDGE_UNIT}.service`]);
      return { ok: r.status === 0, output: r.output };
    },
    installed: () => fs.existsSync(unitFile(mac)),
  };
}

/** The step, with the real effects. Returns the word for the log. */
export async function runExport({ env, kitRepo, state, post, quiet, platform = process.platform }) {
  if (!fs.existsSync(KNOWLEDGE_EXPORTS)) { console.log(`knowledge: no ${KNOWLEDGE_EXPORTS} yet. setup-host.sh makes it.`); return "none"; }
  const deps = realExportDeps({ env, platform });
  return exportStep({ computer: env.COMPUTER, kitRepo, state, post, quiet, ...deps, verify: (commit) => verifiedOnMain({ repo: kitRepo.repo, commit, get: deps.get }) });
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  if (process.argv[2] !== "once") { console.error("usage: knowledge-export.mjs once"); process.exit(2); }
  if (process.getuid?.() !== 0) { console.error("Run it as root."); process.exit(2); }
  const { kitRepo } = await import("./kit-repo.mjs");
  const repo = kitRepo();
  if (repo.problem) { console.error(`knowledge: ${repo.problem}. The first export waits for it.`); process.exit(1); }
  const env = process.env;
  const word = await runExport({ env, kitRepo: repo, state: {}, post: async (text) => { console.log(text); return { ok: true }; }, quiet: async () => ({ quiet: true, why: "" }) });
  console.log(`knowledge: ${word}`);
  process.exit(word === "failed" || word === "stopped" ? 1 : 0);
}
