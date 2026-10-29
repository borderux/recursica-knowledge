#!/usr/bin/env node
// Kev's review data: Barb's Kev disagreement notes, kept in a private repo (data.repo in
// site.json), never in the knowledge repo or any public repo. push-data.sh and pull-kev-notes.sh
// call this file for each step that talks to GitHub's API. No dependencies.
//
//   node kev-data.mjs check <owner/name> <knowledge repo URL>
//       Passes only for a private repo that is not the knowledge repo. Run before each push.
//   node kev-data.mjs pr <owner/name> <branch>
//       Opens a pull request from the branch into main, for a person to review, and closes each
//       older open pull request from a notes branch. Prints the new pull request's address.
//
// The token is KEV_DATA_GITHUB_PAT, the job's own, from the environment.
const API = process.env.GITHUB_API ?? "https://api.github.com";
export const NOTES_BRANCH_PREFIX = "kev-notes/";

const REPO_RE = /^[A-Za-z0-9-]+\/[A-Za-z0-9._-]+$/;

// "https://github.com/acme/kb.git", "git@github.com:acme/kb" -> "acme/kb"
export function repoOf(url) {
  const m = String(url ?? "").match(/github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?\/?$/i);
  return m ? m[1].toLowerCase() : "";
}

function headers(token) {
  return { accept: "application/vnd.github+json", authorization: `Bearer ${token}`, "user-agent": "recursica-kev-data", "x-github-api-version": "2022-11-28" };
}

// Throws with the reason when the push must not happen.
export async function checkRepo({ repo, knowledge, token, fetch = globalThis.fetch }) {
  if (!REPO_RE.test(repo ?? "")) throw new Error(`data.repo must be owner/name, such as acme/recursica-kev-data, not "${repo}"`);
  if (!token) throw new Error("no KEV_DATA_GITHUB_PAT: deploy the job's token first (circlechat/README.md, \"Kev's review data\")");
  const kb = repoOf(knowledge);
  if (kb && repo.toLowerCase() === kb) throw new Error(`${repo} is the knowledge repo. Kev's review data goes to a private repo of its own`);
  const r = await fetch(`${API}/repos/${repo}`, { headers: headers(token) });
  if (!r.ok) throw new Error(`GitHub answered ${r.status} for ${repo}. The token must be able to read the repo`);
  const j = await r.json();
  // A renamed or moved repo answers under its new name, so the knowledge repo is checked again.
  if (kb && String(j.full_name ?? "").toLowerCase() === kb) throw new Error(`${repo} is the knowledge repo. Kev's review data goes to a private repo of its own`);
  if (j.private !== true || (j.visibility && j.visibility !== "private")) throw new Error(`${repo} is ${j.visibility ?? "public"}. Kev's review data goes to a private repo only`);
  return j;
}

// Opens the pull request, and closes each older one from a notes branch: each branch holds every
// note, so the newest pull request replaces the older ones.
export async function openPull({ repo, branch, token, fetch = globalThis.fetch }) {
  const h = { ...headers(token), "content-type": "application/json" };
  const body = JSON.stringify({
    title: `Kev disagreement notes, ${branch.slice(NOTES_BRANCH_PREFIX.length)}`,
    head: branch, base: "main",
    body: "Barb's Kev disagreement notes, pushed by the kev-data-push job. Read each note before you merge: Kev's training reads the notes on main only.",
  });
  const r = await fetch(`${API}/repos/${repo}/pulls`, { method: "POST", headers: h, body });
  if (!r.ok) throw new Error(`GitHub answered ${r.status} to the pull request for ${branch}`);
  const pr = await r.json();
  const open = await fetch(`${API}/repos/${repo}/pulls?state=open&base=main&per_page=100`, { headers: headers(token) });
  if (open.ok) {
    for (const old of await open.json()) {
      const ref = old.head?.ref ?? "";
      if (old.number === pr.number || !ref.startsWith(NOTES_BRANCH_PREFIX) || old.head?.repo?.full_name?.toLowerCase() !== repo.toLowerCase()) continue;
      await fetch(`${API}/repos/${repo}/issues/${old.number}/comments`, { method: "POST", headers: h, body: JSON.stringify({ body: `Replaced by #${pr.number}, which holds every note.` }) });
      await fetch(`${API}/repos/${repo}/pulls/${old.number}`, { method: "PATCH", headers: h, body: JSON.stringify({ state: "closed" }) });
    }
  }
  return pr.html_url;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, repo, arg] = process.argv.slice(2);
  const token = process.env.KEV_DATA_GITHUB_PAT ?? "";
  try {
    if (cmd === "check") await checkRepo({ repo, knowledge: arg, token });
    else if (cmd === "pr") console.log(await openPull({ repo, branch: arg, token }));
    else throw new Error("usage: kev-data.mjs check <owner/name> <knowledge repo URL> | pr <owner/name> <branch>");
  } catch (e) {
    console.error(`Refused: ${e.message}. Nothing was pushed.`);
    process.exit(1);
  }
}
