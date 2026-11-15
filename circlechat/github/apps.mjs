// GitHub Apps for the agents that push to GitHub: Alan, Betty, Porter, and later Otto. Each agent
// has a GitHub App of the agent's own, in place of a personal access token.
//
// site.json's github_apps block names each agent's app:
//
//   "github_apps": {
//     "alan": { "app_id": 1, "installation_id": 2, "slug": "acme-alan",
//               "repos": ["acme/knowledge"],
//               "permissions": { "contents": "write", "pull_requests": "write", "issues": "write" } }
//   }
//
// Each app's private key is the GitHub environment secret APP_KEY_<AGENT>. The secrets helper
// writes the key to a root-owned file (keyFile), and only the token service (token-service.mjs)
// reads the file. A stack with no github_apps block has no push access.
import crypto from "node:crypto";
import path from "node:path";

export const APP_AGENTS = ["alan", "betty", "porter", "otto"];
export const PERMISSIONS = ["contents", "pull_requests", "issues"];
// Each agent's permissions: Contents and Pull requests, plus Issues for Alan.
export const DEFAULT_PERMISSIONS = (agent) => ({ contents: "write", pull_requests: "write", ...(agent === "alan" ? { issues: "write" } : {}) });
// The retired personal access tokens.
export const RETIRED = ["ALAN_GITHUB_PAT", "BETTY_GITHUB_PAT", "PORTER_GITHUB_PAT", "KEV_DATA_GITHUB_PAT"];

// The Kev notes push (kit/push-data.sh) has a GitHub App of the push's own, in site.json's
// data.github_app: { app_id, installation_id, slug }. The app's one repo is data.repo. The push
// pushes a branch and opens a pull request, so the app has Contents and Pull requests. The
// permissions are fixed here, so site.json can never add a permission.
export const KEV_DATA = "kev-data";
export const KEV_DATA_PERMISSIONS = { contents: "write", pull_requests: "write" };
// The push's app, in the form mintToken takes, or null without data.github_app and data.repo.
export function dataApp(site = {}) {
  const a = site.data?.github_app, repo = site.data?.repo;
  return a && repo ? { ...a, repos: [repo], permissions: KEV_DATA_PERMISSIONS } : null;
}
// True when the stack has an app: an agent's app, or the push's app. The token service runs only then.
export const hasApps = (site = {}) => Boolean(site.github_apps || site.data?.github_app);
// The root-owned folder for the apps' private keys, one folder per stack (the GitHub environment).
export const KEYS_ROOT = "/var/lib/agent-stacks/github-apps";
export const keyFile = (stack, agent, root = KEYS_ROOT) => path.join(root, stack, `${agent}.pem`);
export const keySecretName = (agent) => `APP_KEY_${agent.toUpperCase().replace(/[-.]/g, "_")}`;
// The variable that holds an agent's token in the agent's .env. Hermes removes GITHUB_TOKEN and
// GH_TOKEN from every shell Hermes starts, so each token has a name of the agent's own.
export const tokenName = (agent) => `${agent.toUpperCase().replace(/[-.]/g, "_")}_GITHUB_TOKEN`;
export const DEFAULT_TOKEN_PORT = 4010;

const REPO = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SLUG = /^[a-z0-9][a-z0-9-]{0,33}$/;
const HANDLE = /^[a-z0-9][a-z0-9._-]{0,39}$/;

// The config check's messages for the github_apps block.
export function validateApps(site) {
  const errs = [];
  const apps = site.github_apps;
  if (apps === undefined) return errs;
  if (!apps || typeof apps !== "object" || Array.isArray(apps)) return ["github_apps must map each agent to the agent's GitHub App"];
  for (const [agent, a] of Object.entries(apps)) {
    const at = `github_apps.${agent}`;
    if (!HANDLE.test(agent)) { errs.push(`${at}: "${agent}" is not an agent handle`); continue; }
    if (agent === KEV_DATA) { errs.push(`${at}: "${KEV_DATA}" is the Kev notes push's app. Put the push's app in data.github_app`); continue; }
    if (!a || typeof a !== "object") { errs.push(`${at} must be an object`); continue; }
    for (const k of ["app_id", "installation_id"]) if (!Number.isInteger(a[k]) || a[k] < 1) errs.push(`${at}.${k} must be the app's number from GitHub`);
    if (!SLUG.test(a.slug ?? "")) errs.push(`${at}.slug must be the app's slug, the app's name in its GitHub address`);
    if (!Array.isArray(a.repos) || !a.repos.length || !a.repos.every((r) => REPO.test(r))) errs.push(`${at}.repos must list the app's repos as owner/name`);
    else if (new Set(a.repos.map((r) => r.split("/")[0].toLowerCase())).size > 1) errs.push(`${at}.repos must all belong to one owner, the account the app is installed on`);
    const p = a.permissions;
    if (!p || typeof p !== "object") errs.push(`${at}.permissions must name each permission, such as { "contents": "write" }`);
    else {
      for (const [k, v] of Object.entries(p)) {
        if (!PERMISSIONS.includes(k)) errs.push(`${at}.permissions.${k}: an app takes only ${PERMISSIONS.join(", ")}`);
        else if (!["read", "write"].includes(v)) errs.push(`${at}.permissions.${k} must be "read" or "write"`);
      }
      for (const k of ["contents", "pull_requests"]) if (p[k] !== "write") errs.push(`${at}.permissions.${k} must be "write", so the agent can push and open pull requests`);
    }
  }
  return errs;
}

// The config check's messages for data.github_app, the Kev notes push's app.
export function validateDataApp(site) {
  const a = site.data?.github_app;
  if (a === undefined) return [];
  const at = "data.github_app";
  if (!a || typeof a !== "object" || Array.isArray(a)) return [`${at} must hold the app's app_id, installation_id and slug`];
  const errs = [];
  if (!site.data?.repo) errs.push(`${at} needs data.repo: the app's one repo is the private notes repo`);
  for (const k of ["app_id", "installation_id"]) if (!Number.isInteger(a[k]) || a[k] < 1) errs.push(`${at}.${k} must be the app's number from GitHub`);
  if (!SLUG.test(a.slug ?? "")) errs.push(`${at}.slug must be the app's slug, the app's name in its GitHub address`);
  for (const k of Object.keys(a)) if (!["app_id", "installation_id", "slug"].includes(k)) errs.push(`${at}.${k}: the push's app takes only app_id, installation_id and slug. The repo is data.repo, and the kit sets the permissions`);
  return errs;
}

// The app's sign-in for GitHub's API: a JSON Web Token, signed with the app's private key, valid
// for 9 minutes. GitHub accepts at most 10.
export function appJwt(appId, pem, now = Date.now()) {
  const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const t = Math.floor(now / 1000);
  const body = `${b64({ alg: "RS256", typ: "JWT" })}.${b64({ iat: t - 60, exp: t + 540, iss: String(appId) })}`;
  return `${body}.${crypto.sign("RSA-SHA256", Buffer.from(body), pem).toString("base64url")}`;
}

// An installation token for some of the app's repos, with the app's permissions. GitHub makes each
// installation token valid for one hour.
//   repos: owner/name, each one of the app's repos
export async function mintToken({ app, pem, repos = app.repos, fetchFn = fetch, api = "https://api.github.com", now = Date.now() }) {
  const allowed = new Set(app.repos.map((r) => r.toLowerCase()));
  if (!repos.length || !repos.every((r) => allowed.has(r.toLowerCase()))) throw new Error(`a repo outside the app's repos: ${repos.join(", ")}`);
  const r = await fetchFn(`${api}/app/installations/${app.installation_id}/access_tokens`, {
    method: "POST",
    headers: { authorization: `Bearer ${appJwt(app.app_id, pem, now)}`, accept: "application/vnd.github+json", "user-agent": "recursica-token-service", "content-type": "application/json" },
    body: JSON.stringify({ repositories: repos.map((x) => x.split("/")[1]), permissions: app.permissions }),
  });
  if (!r.ok) throw new Error(`GitHub refused the token: ${r.status}`);
  const j = await r.json();
  const expiresAt = Math.min(Date.parse(j.expires_at), now + 3600_000);
  return { token: j.token, expiresAt };
}

// The app's bot identity for commits: <slug>[bot], with the bot's noreply email address.
export async function botIdentity({ slug, token, fetchFn = fetch, api = "https://api.github.com" }) {
  const name = `${slug}[bot]`;
  const r = await fetchFn(`${api}/users/${encodeURIComponent(name)}`, { headers: { authorization: `Bearer ${token}`, accept: "application/vnd.github+json", "user-agent": "recursica-token-service" } });
  if (!r.ok) throw new Error(`no GitHub user ${name}: ${r.status}`);
  const { id } = await r.json();
  return { name, email: `${id}+${name}@users.noreply.github.com` };
}

// The lines the agent's .env gets: the token, and git's author and committer.
export function envLines(agent, token, who) {
  return {
    [tokenName(agent)]: token,
    GIT_AUTHOR_NAME: who.name, GIT_AUTHOR_EMAIL: who.email,
    GIT_COMMITTER_NAME: who.name, GIT_COMMITTER_EMAIL: who.email,
  };
}

// Replaces or adds each KEY=value line, and keeps every other line.
export function setLines(text, values) {
  const keys = new Set(Object.keys(values));
  const kept = String(text ?? "").split("\n").filter((l) => l && !keys.has(l.slice(0, l.indexOf("="))));
  return [...kept, ...Object.entries(values).map(([k, v]) => `${k}=${v}`)].join("\n") + "\n";
}

// A GitHub App manifest for one agent: the name, the permissions and no webhook. A person creates
// the app from the organization's settings with the manifest's values (github/manifest.mjs).
//   url: the app's homepage, such as the knowledge repo's address on GitHub
export function manifest(agent, { prefix = "recursica", url, permissions = agent === KEV_DATA ? KEV_DATA_PERMISSIONS : DEFAULT_PERMISSIONS(agent) } = {}) {
  return {
    name: `${prefix}-${agent}`,
    url,
    description: agent === KEV_DATA
      ? "The Kev notes push's access to GitHub: pushes a notes branch to the private notes repo and opens a pull request."
      : `The ${agent} agent's access to GitHub: pushes branches and opens pull requests.`,
    public: false,
    // No hook_attributes and no events: the app has no webhook.
    default_permissions: { metadata: "read", ...permissions },
    default_events: [],
  };
}
