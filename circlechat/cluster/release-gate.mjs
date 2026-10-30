// Kit releases install only after an approver approves the release in Slack.
//
//   - Each hour, the update job (updater.mjs) on the cluster's control computer looks for a new kit
//     release: a release with the kit's first number that no approver has approved yet. The job
//     posts the release once in the cluster's channel, with the version, the release notes and an
//     "Install" button. Until an approver presses "Install", the job posts a reminder once a day.
//   - "Install" needs an approver and a 6-digit authenticator code. The Slack app (bot.mjs) sends
//     the approval to the cluster agent on every computer, and each agent records the approval.
//   - Each computer's upgrade job (kit/upgrade.mjs) installs only an approved release, and holds
//     every other release. A new major version still asks first, and its "Upgrade now" button needs
//     an authenticator code too.
//
// Each computer keeps its approvals in release-approvals.json, and logs each press of "Install" or
// "Upgrade now" as one line in release-approvals.log: the release, the approver, the time and the
// computer.
import fs from "node:fs";
import path from "node:path";
import { parse, releaseNotes } from "../kit/upgrade.mjs";

const DAY = 24 * 3600_000;
export const TAG = /^@recursica\/knowledge@\d+\.\d+\.\d+$/;
const cmp = (a, b) => a[0] - b[0] || a[1] - b[1] || a[2] - b[2];
const version = (tag) => String(tag).split("@").pop();

// The approved releases: { "<tag>": { by, at } }, with the first approval of each release.
export function approvals(stateDir) {
  try { return JSON.parse(fs.readFileSync(path.join(stateDir, "release-approvals.json"), "utf8")); } catch { return {}; }
}

// Records one approval on this computer, and logs the approval.
export function approve({ stateDir, tag, by, computer, now = Date.now() }) {
  if (!TAG.test(tag ?? "")) return { ok: false, message: "not a release tag" };
  const at = new Date(now).toISOString();
  const all = approvals(stateDir);
  if (!all[tag]) {
    all[tag] = { by, at };
    fs.writeFileSync(path.join(stateDir, "release-approvals.json"), JSON.stringify(all), { mode: 0o600 });
  }
  fs.appendFileSync(path.join(stateDir, "release-approvals.log"), `${JSON.stringify({ tag, by, at, computer })}\n`, { mode: 0o600 });
  return { ok: true, message: `${version(tag)} approved by ${by}; ${computer} installs the release at the next hourly check` };
}

// The newest release with the kit's first number, newer than the kit, when no approver has approved
// that release yet. Otherwise null.
export function waiting(current, tags, approved = {}) {
  const cur = String(current).split(".").map(Number);
  const newer = tags.map((t) => [t, parse(t)]).filter(([, v]) => v && v[0] === cur[0] && cmp(v, cur) > 0).sort((a, b) => cmp(a[1], b[1]));
  const newest = newer.at(-1)?.[0];
  return newest && !approved[newest] ? newest : null;
}

// The cluster's control computer, from the cluster's own site.json. Only that computer posts.
export function isClusterControl(home, computer) {
  try { return JSON.parse(fs.readFileSync(path.join(home, "circlechat/site.json"), "utf8")).nodes?.find((n) => n.control)?.name === computer; } catch { return false; }
}

// The post for a release that waits, and the reminder once a day. The state, in release-gate.json,
// is the release last posted and the time of the last post.
//   post(text, tag): the post's result, { ok }
export async function announce({ stateDir, tag, notes = "", post, now = Date.now() }) {
  const f = path.join(stateDir, "release-gate.json");
  let s = {}; try { s = JSON.parse(fs.readFileSync(f, "utf8")); } catch {}
  if (!tag) { if (s.tag) fs.writeFileSync(f, "{}", { mode: 0o600 }); return null; }
  const fresh = s.tag !== tag;
  if (!fresh && now - (s.postedAt ?? 0) < DAY) return null;
  const text = fresh
    ? `:package: Kit release ${version(tag)} is ready.${notes} Every computer holds the release until an approver presses "Install" and enters an authenticator code.`
    : `:package: Reminder: kit release ${version(tag)} still waits for approval.${notes} Every computer holds the release until an approver presses "Install" and enters an authenticator code.`;
  const r = await post(text, tag);
  if (!r?.ok) return null;
  fs.writeFileSync(f, JSON.stringify({ tag, postedAt: now }), { mode: 0o600 });
  return text;
}

// The hourly check on the cluster's control computer.
//   git(...args): the output of git in the kit checkout, run as the owner
//   current: the kit's version, from the kit's package.json
export async function releaseCheck({ stateDir, git, current, post, now = Date.now() }) {
  git("fetch", "--tags", "--quiet");
  const tags = git("tag", "--list", "@recursica/knowledge@*").split("\n").filter(Boolean);
  const tag = waiting(current, tags, approvals(stateDir));
  return announce({ stateDir, tag, notes: tag ? releaseNotes(git("remote", "get-url", "origin"), tag) : "", post, now });
}
