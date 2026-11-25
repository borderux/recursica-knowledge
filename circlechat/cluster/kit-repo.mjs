// The kit's own GitHub repo, the one place that names the repo. GitHub's checks of a kit commit ask
// this repo: the follow step (follow-main.mjs) and the root-owned helpers (root-copies.mjs). The
// owner can change the kit checkout's origin, so no check reads the repo's name from the origin.
// An origin that names another repo stops both steps, and the cluster's channel gets one alert.
import { notice } from "./notice.mjs";

export const KIT_REPO = "borderux/recursica-knowledge";

// The GitHub repo of a git remote's address, as "owner/name", or "" for an address off GitHub. The
// address must start with GitHub's own host, so "https://acme.com/github.com/owner/name" is off GitHub.
export function githubRepo(remote) {
  const m = String(remote ?? "").trim().match(/^(?:https:\/\/(?:[^@/\s]+@)?github\.com\/|ssh:\/\/git@github\.com(?::22)?\/|git@github\.com:)([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+?)(?:\.git)?\/?$/i);
  return m ? m[1] : "";
}

// Whether the remote's address names the kit's repo. GitHub ignores case in a repo's name.
export const isKitRepo = (remote) => githubRepo(remote).toLowerCase() === KIT_REPO.toLowerCase();

// The alert for an origin that names another repo. The alert never shows the address, which can
// hold a token.
export function originAlert(computer, remote) {
  const repo = githubRepo(remote);
  return `:rotating_light: Kit on ${computer}: the kit checkout's origin names ${repo ? `the GitHub repo ${repo}` : "a repo off GitHub"}, not ${KIT_REPO}. The update job moves the checkout to no new commit and replaces no root-owned helper. On a fork of the kit, rerun install-secrets-helper.sh and setup-pc.sh by hand after each kit change. Otherwise, set the origin back with \`git remote set-url origin https://github.com/${KIT_REPO}.git\` in the kit checkout.`;
}

// Whether the origin names the kit's repo. For another repo, the cluster's channel gets one alert,
// shared by every step that checks the origin, then again for another repo or after 24 hours
// (notice.mjs). The kit's repo clears the record, so the next change alerts at once.
//   state: the update job's state object, changed in place (state.kitOrigin)
//   post(text): { ok } of one post in the cluster's channel
export async function originOk({ computer, remote, state, post, now = Date.now() }) {
  if (isKitRepo(remote)) { delete state.kitOrigin; return true; }
  await notice(state, "kitOrigin", `origin:${githubRepo(remote).toLowerCase() || "off-github"}`, originAlert(computer, remote), post, now);
  return false;
}
