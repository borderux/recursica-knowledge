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
//   4. The checkout fast-forwards to the new commit. Each git command runs with umask 022, and after
//      the fast-forward no file in the checkout stays writable by the group or other accounts, so
//      the next run's kit check (kit/check-kit.sh) passes.
//   5. The setups the change touches run again (SETUPS): setup-host.sh on the control computer,
//      and setup-node.sh and install-cluster.sh on each computer, each without its network steps.
//      rc-deploy never runs here.
//   6. The channel gets one line: the computer, the old and new commit, and the result. Network
//      changes that wait for a person get one post of their own.
//
// Each post about a wait for a person, such as a stop, the wait for a quiet
// RecursicaChat or held network changes, posts once. The post repeats only for a new reason, or
// 24 hours after the last post (notice.mjs).
//
// The full setups call sudo as the owner. A setup runs again only when the owner has password-free
// sudo. Otherwise the channel's line names the command to run by hand. On the control computer,
// setup-host.sh --upgrade still runs, with root's own steps (root-steps.mjs), and needs no sudo.
//
// A failed setup posts the last lines of the setup's output. The checkout stays at the new commit
// for a person to look at, and the next update waits for a newer commit on main. That update runs
// the failed setup again, with each setup the newer change touches.
//
// The step never applies a change that can cut remote access: the firewall rules, the agentguard
// anchor, pf.conf, nftables, Tailscale's settings and the guard's lockdown rules. The same hold
// covers each setup step that can interrupt running work, such as a step that removes the stack's
// jobs. Each setup runs
// with KIT_HOLD_NETWORK=1, which skips the setup's network steps (network_held, kit/lib.sh) and
// runs the rest. A change to a network step (networkChanges) waits for a person, and the channel
// hears once, with the command to run by hand. A newer network change posts again. The waiting
// change clears once a person applies it: the setup's run by hand records its kit commit
// (network_applied, kit/lib.sh), or, for the firewall rules, the installed rule files change.
// A kit from before the hold, whose lib.sh has no network_held, can't skip a network step. So each
// setup such a change touches waits whole for a person, and none of them runs.
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { siteFile } from "../kit/stack-paths.mjs";
import { notice } from "./notice.mjs";

// git in the kit checkout, as the owner, with umask 022. On Ubuntu, sudo's session can set umask 002
// (pam_umask), so a file git wrote was group-writable, and check-kit.sh then refused the checkout
// at the next run. The arguments follow "sudo -u <owner> -H".
//   gitAsOwner <kit folder> <git arguments>
export const gitAsOwner = (kit, args) => ["/bin/sh", "-c", 'umask 022 && exec git "$@"', "git", "-C", kit, ...args];

// The kit files each setup reads. A change to one of the listed files runs the setup again. A path that
// ends in "/" is a folder.
export const SETUPS = {
  "setup-host.sh": [
    "circlechat/setup-host.sh", "circlechat/kit/", "circlechat/egress/", "circlechat/gateway/", "circlechat/github/",
    "circlechat/rc-service.sh", "circlechat/rc-session.sh", "circlechat/rc-sync.sh",
    "circlechat/cluster/windows/install-wsl-boot.ps1", "tools/kev/",
  ],
  "setup-node.sh": [
    "circlechat/setup-node.sh", "circlechat/kit/lib.sh", "circlechat/kit/render.mjs", "circlechat/egress/", "circlechat/jobd/porter-job/",
    "circlechat/rustdesk/",
  ],
  "install-cluster.sh": ["circlechat/cluster/install-cluster.sh", "circlechat/kit/lib.sh", "circlechat/cluster/firewall/", "circlechat/cluster/canary-keys.sh"],
};
const ORDER = Object.keys(SETUPS);

// The network steps: each step that can cut remote access or interrupt running work. Two kinds of
// kit file hold network steps:
//   - a folder whose every file is a network file: the firewall rules
//   - a shell script with network steps, each between a "# network-step begin: <what>" line and a
//     "# network-step end" line, such as install-cluster.sh's firewall step or setup-host.sh's
//     tailscale serve steps. Each step starts with network_held (kit/lib.sh).
export const NETWORK_FOLDERS = { "circlechat/cluster/firewall/": "the firewall rules" };
// The file that holds the hold itself. A change to a network step there runs none of the setups that
// read the file: each one waits whole for a person.
export const HOLD_FILE = "circlechat/kit/lib.sh";
// A command that changes a firewall, pf.conf, nftables or Tailscale's settings, in a shell line with
// the line's quoted text left out. A read, such as tailscale serve status or nft list, is no change.
export const NETWORK_CMD = /\bpfctl\b|\bnft\s+(-f|-i|add|delete|flush|insert|replace|create|destroy)\b|\/etc\/pf\.conf\b|\/etc\/agentguard|\b(tailscale(\.exe)?|ts)\s+(serve|funnel)\b(?!\s+status)|\b(tailscale(\.exe)?|ts)\s+(set|up|down|login|logout|cert|switch)\b|\bts_serve\b|\binstall_unit\s+agentguard|\bsocketfilterfw\b|\biptables\b|\bufw\b/;
const BEGIN = /^\s*# network-step begin: (.+?)\s*$/, END = /^\s*# network-step end\s*$/;
// A kit that can hold network steps: its lib.sh defines network_held. A kit from before the hold
// can't skip a network step, so each setup the change touches waits whole for a person.
export const HOLD_READY = /^\s*network_held\(\)\s*\{/m;
// Code that a network step runs but that sits outside the steps, such as lib.sh's job installer,
// which writes the firewall's start-up job. Each part sits between a "# network-code begin: <what>"
// line and a "# network-code end" line. An edit there changes what the network step applies on its
// next run by hand, so it waits for a person, for the setups listed here. In a file with no
// network-code lines at either commit, any edit counts.
export const NETWORK_CODE = {
  "circlechat/kit/lib.sh": { setups: ["install-cluster.sh"], what: "the job installer, which writes the firewall's start-up job" },
};
const CODE_BEGIN = /^\s*# network-code begin: (.+?)\s*$/, CODE_END = /^\s*# network-code end\s*$/;
// The files that the apply scripts (APPLY_WITH_UNDO) don't load. A change to one needs the setup's
// own run by hand, which has no automatic undo.
const NOT_IN_APPLY = ["circlechat/cluster/firewall/pf-main.sh", ...Object.keys(NETWORK_CODE)];
// The scripts that apply the firewall rules with an automatic undo, for each operating system, when
// the kit checkout has one. The script loads the new rules, and puts the old rules back after 5
// minutes unless a person confirms from a new session.
export const APPLY_WITH_UNDO = { darwin: "circlechat/cluster/firewall/pf-apply-tailnet.sh", linux: "circlechat/cluster/firewall/nft-apply-tailnet.sh" };
// The installed rule files, for each operating system. A change to one clears the waiting firewall
// rules, since the apply script installs the files only on --confirm.
export const INSTALLED_RULES = {
  darwin: ["/var/lib/agent-cluster/pf-base.conf", "/var/lib/agent-cluster/pf-lockdown.conf"],
  linux: ["/etc/agentguard.nft", "/var/lib/agent-cluster/nft-lockdown.nft", "/var/lib/agent-cluster/nft-load.sh"],
};

// The network steps in one shell script: each step's name and the step's first and last line,
// counted from 1. A step with no end line runs to the end of the script.
export function networkSteps(text, begin = BEGIN, end = END) {
  const steps = [];
  let open = null;
  String(text ?? "").split("\n").forEach((line, i) => {
    const b = line.match(begin);
    if (b && !open) open = { what: b[1], first: i + 1 };
    else if (end.test(line) && open) { steps.push({ ...open, last: i + 1 }); open = null; }
  });
  if (open) steps.push({ ...open, last: Infinity });
  return steps;
}
// The network code in one file (NETWORK_CODE), in the same form.
export const networkCode = (text) => networkSteps(text, CODE_BEGIN, CODE_END);

// A shell line with the line's quoted text left out, or "" for a comment line.
const code = (line) => (/^\s*#/.test(line) ? "" : line.replace(/"(?:\\.|[^"\\])*"|'[^']*'|`(?:\\.|[^`\\])*`/g, '""'));

// The lines outside every network step that run a network command, counted from 1.
export function strayNetworkLines(text) {
  const steps = networkSteps(text);
  return String(text ?? "").split("\n").flatMap((line, i) => (NETWORK_CMD.test(code(line)) && !steps.some((s) => i + 1 >= s.first && i + 1 <= s.last) ? [i + 1] : []));
}

// The hunks of git diff -U0: the first line and the line count on each side.
export function hunks(diff) {
  return [...String(diff ?? "").matchAll(/^@@ -(\d+)(?:,(\d+))? \+(\d+)(?:,(\d+))? @@/gm)].map((m) => ({
    oldFirst: +m[1], oldCount: m[2] === undefined ? 1 : +m[2], newFirst: +m[3], newCount: m[4] === undefined ? 1 : +m[4],
  }));
}

// The lines that hold a step's begin and end lines and the network_held calls, which make the hold.
const holdLines = (text) => String(text ?? "").split("\n").map((l) => l.trim()).filter((l) => BEGIN.test(l) || END.test(l) || /\bnetwork_held\b/.test(l)).join("\n");

// The network changes between two commits, for each setup the change touches.
//   files: the changed files; control: as in touchedSetups
//   oldText(file), newText(file): the file's text at the old and the new commit, "" when missing
//   diff(file): git diff -U0 of the file
//   returns [{ setup, file, what, whole, why?, byHand? }]: what names each step; whole: the setup
//   waits whole, because the change moves the hold itself or adds a network command outside a
//   network step, and why says so; byHand: the change is in network code (NETWORK_CODE) or a file
//   the apply scripts don't load, so only the setup's own run by hand applies it
export function networkChanges({ files, control, oldText, newText, diff }) {
  const out = [];
  const within = (n, first, count) => count > 0 && n >= first && n < first + count;
  const overlaps = (s, first, count) => count > 0 && first <= s.last && first + count - 1 >= s.first;
  for (const file of files) {
    const setups = touchedSetups([file], { control });
    if (!setups.length) continue;
    const folder = Object.keys(NETWORK_FOLDERS).find((f) => file.startsWith(f));
    if (folder) {
      for (const setup of setups) out.push({ setup, file, what: [NETWORK_FOLDERS[folder]], whole: false, ...(NOT_IN_APPLY.includes(file) ? { byHand: true } : {}) });
      continue;
    }
    if (!file.endsWith(".sh")) continue;
    const before = oldText(file), after = newText(file);
    const hs = hunks(diff(file));
    // Network code: an edit inside a marked part, or anywhere in a file with no marked part.
    const code = new Set(), net = NETWORK_CODE[file];
    if (net) {
      const oldCode = networkCode(before), newCode = networkCode(after);
      if (!oldCode.length && !newCode.length) { if (hs.length) code.add(net.what); }
      else for (const h of hs) {
        for (const s of oldCode) if (overlaps(s, h.oldFirst, h.oldCount)) code.add(s.what);
        for (const s of newCode) if (overlaps(s, h.newFirst, h.newCount)) code.add(s.what);
      }
    }
    const oldSteps = networkSteps(before), newSteps = networkSteps(after);
    const oldStray = strayNetworkLines(before), newStray = strayNetworkLines(after);
    const what = new Set();
    let stray = false, added = false;
    for (const h of hs) {
      for (const s of oldSteps) if (overlaps(s, h.oldFirst, h.oldCount)) what.add(s.what);
      for (const s of newSteps) if (overlaps(s, h.newFirst, h.newCount)) what.add(s.what);
      if (oldStray.some((n) => within(n, h.oldFirst, h.oldCount))) stray = true;
      if (newStray.some((n) => within(n, h.newFirst, h.newCount))) { stray = true; added = true; }
    }
    const moved = holdLines(before) !== holdLines(after);
    if (stray) what.add("a network command outside a network step");
    const whole = added || moved || (file === HOLD_FILE && what.size > 0);
    for (const setup of setups) {
      const own = code.size && net.setups.includes(setup) ? [...code] : [];
      if (!what.size && !moved && !own.length) continue;
      out.push({
        setup, file, what: [...what, ...own], whole,
        ...(whole ? { why: "the change moves the hold or adds a network command outside a network step" } : {}),
        ...(own.length ? { byHand: true } : {}),
      });
    }
  }
  return out;
}

// The changes when the kit at the new commit can't hold network steps (HOLD_READY): each setup the
// change touches waits whole, since its run would apply every network step.
//   to: the new commit; todo: the setups the change touches
export function unheldChanges({ files, control, todo, to }) {
  return todo.map((setup) => ({
    setup, file: files.find((f) => touchedSetups([f], { control }).includes(setup)) ?? HOLD_FILE,
    what: ["every step"], whole: true,
    why: `the kit at ${short(to)} has no hold for network steps (no network_held in kit/lib.sh)`,
  }));
}

// The waiting network changes, merged with newer ones: for each setup, the files, the steps and
// whether the setup waits whole, and why; and whether only the setup's run by hand applies it.
export function mergeWaiting(waiting = {}, changes = []) {
  const out = structuredClone(waiting);
  for (const c of changes) {
    const w = (out[c.setup] ??= { files: [], what: [], whole: false });
    if (!w.files.includes(c.file)) w.files.push(c.file);
    for (const x of c.what) if (!w.what.includes(x)) w.what.push(x);
    w.whole ||= c.whole;
    if (c.why && !(w.why ??= []).includes(c.why)) w.why.push(c.why);
    if (c.byHand) w.byHand = true;
  }
  return out;
}

// The command a person runs for each waiting setup, with or without an automatic undo.
//   kit: the kit checkout's folder; platform: process.platform; applyScript: whether the new
//   checkout has the operating system's apply script (APPLY_WITH_UNDO)
export function networkCommands({ waiting, computer, kit, platform, applyScript }) {
  const k = kit.replace(/\/+$/, "");
  const script = { "setup-host.sh": `${k}/circlechat/setup-host.sh`, "setup-node.sh": `${k}/circlechat/setup-node.sh ${computer}`, "install-cluster.sh": `${k}/circlechat/cluster/install-cluster.sh ${computer}` };
  return ORDER.filter((s) => waiting[s]).map((setup) => {
    const w = waiting[setup];
    const apply = APPLY_WITH_UNDO[platform];
    if (setup === "install-cluster.sh" && !w.whole && apply && applyScript) {
      const left = w.files.filter((f) => NOT_IN_APPLY.includes(f)).map((f) => path.basename(f));
      const extra = left.length ? ` ${path.basename(apply)} loads only the anchor's rule files, so after --confirm run \`${script[setup]}\` for ${list(left)}, which has no automatic undo.` : "";
      return { setup, undo: true, text: `\`sudo ${k}/${apply}\` loads the firewall rules with an automatic undo. Then, within 5 minutes, open a new RustDesk or SSH session over Tailscale and run \`sudo ${k}/${apply} --confirm\` there. With no --confirm, the old rules come back.${extra}` };
    }
    return { setup, undo: false, text: `\`${script[setup]}\` applies ${w.whole ? "the whole setup" : w.what.join(", ")}. The command has no automatic undo: a mistake can cut remote access until a person at the computer fixes it.` };
  });
}

// The one post for network changes that wait for a person.
//   commits: "<short sha> <subject>" for each commit that touches a waiting file
export function networkPost({ computer, from, to, commits, waiting, commands }) {
  const shown = commits.slice(0, 10);
  const lines = [
    `:warning: Kit on ${computer}: network changes from ${short(from)} to ${short(to)} wait for a person. The update job never applies a change that can cut remote access or interrupt running work.`,
    "Commits:",
    ...shown.map((c) => `• ${c}`),
    ...(commits.length > shown.length ? [`• and ${commits.length - shown.length} more`] : []),
    "What waits:",
    ...ORDER.filter((s) => waiting[s]).map((s) => `• ${s}: ${waiting[s].whole ? `the whole setup waits, since ${(waiting[s].why ?? ["the change moves the hold or adds a network command outside a network step"]).join(", and ")}` : "the network steps wait"}. Steps: ${waiting[s].what.join(", ")} (${waiting[s].files.join(", ")}).`),
    `To apply, run on ${computer}, in a RustDesk or SSH session over Tailscale:`,
    ...commands.map((c) => `• ${c.text}`),
  ];
  return lines.join("\n");
}
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
//   network: network changes in this update wait for a person, in a post of their own
export function resultPost({ computer, from, to, count, ran = [], manual = [], failed = null, hostNote = "", network = false }) {
  const head = `Kit on ${computer}: ${short(from)} → ${short(to)}, ${count} new commit${count === 1 ? "" : "s"} on main.`;
  if (failed) {
    const tail = lastLines(failed.output);
    return `:x: ${head} ${failed.setup} failed${ran.length ? ` after ${list(ran)} passed` : ""}. The checkout stays at ${short(to)} for a person to look at, and the next update waits for a newer commit on main.${network ? " Network changes wait for a person, in the next message." : ""}${tail ? `\n\`\`\`\n${tail}\n\`\`\`` : ""}`;
  }
  const parts = [ran.length ? `Ran ${list(ran)} again.` : manual.length || network ? "" : "No setup needed to run again."];
  if (manual.length) parts.push(`${list(manual.map((m) => m.setup))} need${manual.length === 1 ? "s" : ""} a person, because the owner has no password-free sudo. Run ${manual.map((m) => m.command).join(", then ")} by hand.`);
  if (hostNote) parts.push(hostNote);
  if (network) parts.push("Network changes wait for a person, in the next message.");
  return `${manual.length || hostNote || network ? ":warning:" : ":white_check_mark:"} ${head} ${parts.filter(Boolean).join(" ")}`;
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
//   setup(name): { status, output } of one setup run as the owner, the full setup, with KIT_HOLD_NETWORK=1
//   hostUpgrade(): { ok, output, problems } of setup-host.sh --upgrade with root's steps, for each
//   local stack, with KIT_HOLD_NETWORK=1
//   kit: the kit checkout's folder; platform: process.platform
//   applied(setup): the kit commit of the setup's last run by hand (network_applied), or ""
//   installed(): a fingerprint of the installed firewall rule files (INSTALLED_RULES)
//   state: the update job's state object, changed in place (state.follow)
//   returns a short word for the log: none, stopped, waiting, updated, failed
//   tidy(): { status } of removing group and other write in the checkout, after each fast-forward
//   now(): the time in ms, for the notices' 24 hours
export async function followMain({ computer, control, git, get, quiet, post, sudoFree, setup, hostUpgrade, state, kit = "", platform = process.platform, applied = async () => "", installed = async () => "", tidy = async () => ({ status: 0 }), now = () => Date.now() }) {
  const follow = state.follow ?? {};
  const g = (...a) => { const r = git(...a); return { ...r, out: String(r.stdout ?? "").trim() }; };
  // Network changes that wait for a person: each one a person applied clears, and an unsent post is sent.
  if (follow.network) {
    const n = follow.network, rulesNow = await installed();
    for (const s of Object.keys(n.waiting)) {
      const mark = String((await applied(s)) ?? "").trim();
      const byHand = /^[0-9a-f]{40}$/.test(mark) && g("merge-base", "--is-ancestor", n.to, mark).status === 0;
      const rules = s === "install-cluster.sh" && !n.waiting[s].whole && !n.waiting[s].byHand && rulesNow !== n.installed;
      if (byHand || rules) delete n.waiting[s];
    }
    if (!Object.keys(n.waiting).length) { delete follow.network; console.log("kit follows main: a person applied the network changes that waited"); }
  }
  // Held network changes: one post, again for a newer change or 24 hours later.
  const tellNetwork = async () => {
    const n = follow.network;
    if (!n) return;
    await notice(n, "told", n.to, () => {
      const files = [...new Set(Object.values(n.waiting).flatMap((w) => w.files))];
      const commits = g("log", "--format=%h %s", `${n.from}..${n.to}`, "--", ...files).out.split("\n").filter(Boolean);
      const applyScript = Boolean(APPLY_WITH_UNDO[platform]) && g("cat-file", "-e", `${n.to}:${APPLY_WITH_UNDO[platform]}`).status === 0;
      const commands = networkCommands({ waiting: n.waiting, computer, kit, platform, applyScript });
      return networkPost({ computer, from: n.from, to: n.to, commits, waiting: n.waiting, commands });
    }, post, now());
  };
  await tellNetwork();
  const fetched = g("fetch", "--quiet", "origin", "main");
  if (fetched.status !== 0) { console.error(`kit follows main: git fetch failed: ${String(fetched.stderr ?? "").trim()}`); return "none"; }
  const head = g("rev-parse", "HEAD").out, target = g("rev-parse", "refs/remotes/origin/main").out;
  // A stop or a wait: one post, again for a new reason or 24 hours later.
  const tell = (key, text) => notice(follow, "told", key, text, post, now());
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
    await tell(`waiting:${target}`, `:hourglass: Kit on ${computer}: the update from ${short(head)} to ${short(target)} waits until RecursicaChat is quiet, with no agent turn running or queued and no service run open. Now: ${q.why}.`);
    save(); return "waiting";
  }
  // 4. Fast-forward. A detached checkout, such as a release tag, moves to main first.
  if (branch === "") {
    const sw = g("checkout", "--quiet", "main");
    if (sw.status !== 0) { await tell(`switch:${target}`, `:x: Kit on ${computer} stays at ${short(head)}: git could not switch the checkout to main. ${lastLines(sw.stderr, 3)}`); save(); return "stopped"; }
  }
  const ff = g("merge", "--ff-only", "--quiet", target);
  if (ff.status !== 0) {
    const at = g("rev-parse", "HEAD").out;
    await tell(`ff:${target}`, `:x: Kit on ${computer} stays at ${short(at)}: the fast-forward to ${short(target)} failed. ${lastLines(ff.stderr, 3)}`);
    save(); return "stopped";
  }
  // No file in the checkout stays writable by the group or other accounts, so the next run's kit check passes.
  const tidied = await tidy();
  if (tidied?.status !== 0) console.error(`kit follows main: removing group and other write in the checkout failed: ${String(tidied?.stderr ?? "").trim()}`);
  // 5. Run each setup the change touches again, and each setup an earlier failure left.
  const files = g("diff", "--name-only", head, target).out.split("\n").filter(Boolean);
  // Network changes wait for a person. A setup that waits whole doesn't run.
  const show = (rev, f) => { const r = g("show", `${rev}:${f}`); return r.status === 0 ? String(r.stdout ?? "") : ""; };
  const touched = touchedSetups(files, { control, carried: follow.failedAt === head ? follow.pending ?? [] : [] });
  // A kit from before the hold can't skip a network step: each setup the change touches waits whole.
  const ready = HOLD_READY.test(show(target, HOLD_FILE));
  const changes = ready
    ? networkChanges({ files, control, oldText: (f) => show(head, f), newText: (f) => show(target, f), diff: (f) => String(g("diff", "-U0", head, target, "--", f).stdout ?? "") })
    : unheldChanges({ files, control, todo: touched, to: target });
  if (changes.length) {
    const base = follow.network ?? { from: head, waiting: {}, installed: await installed() };
    follow.network = { ...base, to: target, waiting: mergeWaiting(base.waiting, changes) };
  }
  // A setup that waits whole stays held until a person runs it, through every later update.
  const whole = new Set(Object.entries(follow.network?.waiting ?? {}).filter(([, w]) => w.whole).map(([s]) => s));
  const todo = touched.filter((s) => !whole.has(s));
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
  const text = resultPost({ computer, from: head, to: target, count: shas.length, ran, manual, failed, hostNote, network: changes.length > 0 });
  await post(text).catch(() => {});
  await tellNetwork();
  const network = follow.network ? { network: follow.network } : {};
  if (failed) {
    const left = todo.slice(todo.findIndex((s) => failed.setup.startsWith(s)));
    state.follow = { failedAt: target, pending: left, ...network };
    return "failed";
  }
  state.follow = network;
  return "updated";
}

// The real effects, for updater.mjs. Runs as root.
//   env: /etc/agent-cluster.conf and /etc/agent-cluster.env (COMPUTER, OWNER, OWNER_HOME, KIT, PATH)
//   spawn, read: spawnSync and a file read, for the tests
// Every setup runs with KIT_HOLD_NETWORK=1, so no setup applies a network step.
export function realDeps({ env, stacks, afterUpgrade, prepare, platform = process.platform, spawn = spawnSync, read = (f) => fs.readFileSync(f) }) {
  const asOwner = (args, opts = {}) => spawn("sudo", ["-u", env.OWNER, "-H", ...args], { encoding: "utf8", maxBuffer: 64 << 20, ...opts });
  const kit = env.KIT;
  const site = siteFile(env.OWNER_HOME);
  const ownerEnv = (extra = {}) => ["env", ...Object.entries({ PATH: env.PATH, SITE: site, KIT_HOLD_NETWORK: "1", ...extra }).map(([k, v]) => `${k}=${v}`)];
  const tryRead = (f) => { try { return read(f); } catch { return ""; } };
  const output = (r) => `${r.stdout ?? ""}${r.stderr ?? ""}${r.error ? `\n${r.error.message}` : ""}`;
  const show = (r) => { process.stdout.write(output(r)); return r; };
  const HOUR = 3600_000;
  return {
    kit,
    platform,
    git: (...a) => asOwner(gitAsOwner(kit, a)),
    // After each fast-forward: the group and other accounts can change no file in the checkout.
    tidy: () => asOwner(["chmod", "-R", "go-w", kit]),
    // The kit commit the setup's last run by hand recorded (network_applied, kit/lib.sh).
    applied: (name) => String(tryRead(path.join(env.OWNER_HOME, ".recursica-kit/network-applied", path.basename(name)))).trim(),
    installed: () => {
      const h = createHash("sha256");
      for (const f of INSTALLED_RULES[platform] ?? []) h.update(`${f}\0`).update(tryRead(f)).update("\0");
      return h.digest("hex");
    },
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

