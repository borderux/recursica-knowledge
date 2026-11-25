// The kit's GitHub repo, which GitHub's checks of a kit commit ask: the follow step
// (follow-main.mjs) and the root-owned helper step (root-copies.mjs). The repo's name is a setting
// in root's own file, /etc/agent-cluster.conf, as KIT_REPO=<owner>/<name>:
//   - install-cluster.sh writes the setting as root, from site.json's repos.knowledge, the address
//     of the kit's repo or the client's fork (siteKitRepo). Without repos.knowledge, the setting
//     is DEFAULT_KIT_REPO. A fork off GitHub gets an empty setting, and GitHub can verify nothing.
//   - The update job reads the setting only from that file, never from the kit checkout or the
//     owner's site.json, which the owner can change (kitRepo). The file must be a plain file that
//     root owns and only root can change.
//   - The kit checkout's origin must name the same repo (originOk). An origin at another repo
//     stops both steps, and the cluster's channel gets one alert.
import fs from "node:fs";
import { notice } from "./notice.mjs";

// The kit's repo without a repos.knowledge in site.json, and on a computer whose
// /etc/agent-cluster.conf is from before the setting, until install-cluster.sh runs again.
export const DEFAULT_KIT_REPO = "borderux/recursica-knowledge";
export const CLUSTER_CONF = "/etc/agent-cluster.conf";
const REPO_NAME = /^[A-Za-z0-9._-]+\/[A-Za-z0-9._-]+$/;

// The GitHub repo of a git remote's address, as "owner/name", or "" for an address off GitHub. The
// address must start with GitHub's own host, so "https://acme.com/github.com/owner/name" is off GitHub.
export function githubRepo(remote) {
  const m = String(remote ?? "").trim().match(/^(?:https:\/\/(?:[^@/\s]+@)?github\.com\/|ssh:\/\/git@github\.com(?::22)?\/|git@github\.com:)([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+?)(?:\.git)?\/?$/i);
  return m ? m[1] : "";
}

// The setting install-cluster.sh writes, from the parsed site.json: the GitHub repo of
// repos.knowledge, DEFAULT_KIT_REPO without repos.knowledge, or "" for a repo off GitHub.
export function siteKitRepo(site) {
  const address = site?.repos?.knowledge;
  return address ? githubRepo(address) : DEFAULT_KIT_REPO;
}

// The kit's repo from root's file: { repo }, with repo "" for a fork off GitHub, or { problem }
// for a file the job can't trust. A file from before the setting gives DEFAULT_KIT_REPO, with old: true.
//   fsx: { lstat, read } for the tests
export function kitRepo({ conf = CLUSTER_CONF, fsx = { lstat: fs.lstatSync, read: (f) => fs.readFileSync(f, "utf8") } } = {}) {
  let st;
  try { st = fsx.lstat(conf); } catch { return { problem: `${conf} is missing. Run install-cluster.sh` }; }
  if (!st.isFile() || st.uid !== 0 || (st.mode & 0o022) !== 0) return { problem: `${conf} is not a plain file that only root can change. Run install-cluster.sh, which writes the file as root` };
  const m = fsx.read(conf).match(/^KIT_REPO=(.*)$/m);
  if (!m) return { repo: DEFAULT_KIT_REPO, old: true };
  const repo = m[1].trim();
  if (repo && !REPO_NAME.test(repo)) return { problem: `KIT_REPO in ${conf} is not a GitHub repo's name, such as acme/kit. Set repos.knowledge in site.json, and run install-cluster.sh` };
  return { repo };
}

// Whether the origin names the kit's repo. The address must be on GitHub, and GitHub ignores case
// in a repo's name.
export const isRepo = (remote, repo) => Boolean(repo) && githubRepo(remote).toLowerCase() === repo.toLowerCase();

// The alert for an origin the update job refuses. The alert never shows the origin's address,
// which can hold a token.
//   kit: kitRepo's answer
export function originAlert(computer, remote, kit) {
  const stop = "The update job moves the checkout to no new commit and replaces no root-owned helper.";
  const byHand = "Until then, rerun install-secrets-helper.sh and setup-pc.sh by hand after each kit change.";
  if (kit.problem) return `:rotating_light: Kit on ${computer}: ${kit.problem}. ${stop} ${byHand}`;
  if (!kit.repo) return `:rotating_light: Kit on ${computer}: the kit's repo is off GitHub (repos.knowledge in site.json), so GitHub can verify no kit commit. ${stop} Rerun install-secrets-helper.sh and setup-pc.sh by hand after each kit change.`;
  const repo = githubRepo(remote);
  return `:rotating_light: Kit on ${computer}: the kit checkout's origin names ${repo ? `the GitHub repo ${repo}` : "a repo off GitHub"}, not ${kit.repo}, the kit's repo in ${CLUSTER_CONF}. ${stop} To follow another repo, set repos.knowledge in site.json and run install-cluster.sh. To keep ${kit.repo}, run \`git remote set-url origin https://github.com/${kit.repo}.git\` in the kit checkout. ${byHand}`;
}

// Whether the origin names the kit's repo. Otherwise the cluster's channel gets one alert, shared
// by every step that checks the origin, then again for another reason or after 24 hours
// (notice.mjs). A passing origin clears the record, so the next refusal alerts at once.
//   kit: kitRepo's answer
//   state: the update job's state object, changed in place (state.kitOrigin)
//   post(text): { ok } of one post in the cluster's channel
export async function originOk({ computer, remote, kit, state, post, now = Date.now() }) {
  if (!kit.problem && isRepo(remote, kit.repo)) { delete state.kitOrigin; return true; }
  const key = kit.problem ? `conf:${kit.problem}` : `origin:${String(kit.repo).toLowerCase()}:${githubRepo(remote).toLowerCase() || "off-github"}`;
  await notice(state, "kitOrigin", key, originAlert(computer, remote, kit), post, now);
  return false;
}
