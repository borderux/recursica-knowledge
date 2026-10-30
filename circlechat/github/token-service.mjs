#!/usr/bin/env node
// The GitHub token service: one root service for each stack, on the stack's control computer
// (setup-host.sh installs the service when site.json has a github_apps block).
//
//   - The service reads each agent's private key from a root-owned file (apps.mjs, keyFile), which
//     the secrets helper writes. No agent, container, .env file or backup holds a private key.
//   - Each minute, the service checks each agent's installation token. A token that ends within 15
//     minutes is replaced. Each token covers only the agent's repos and permissions, and is valid
//     for at most one hour.
//   - The agent's token reaches the agent through the existing secrets path: the agent's own .env
//     in the agent's Hermes home, as <AGENT>_GITHUB_TOKEN. Git's author and committer go in the same
//     .env: the app's bot identity, <app-slug>[bot], with the app's noreply email address.
//   - A port job on another computer asks for a token over Tailscale:
//       POST /token   Authorization: Bearer <the job's task key>   { "repo": "<owner/name>" }
//     The task key must be a valid key from the stack's gateway (gateway/keys.mjs). The token covers
//     only the requested repo, which must be one of the task's agent's repos.
//
// Settings, from the environment: CC_DIR (the stack's folder), STACK (the stack's GitHub
// environment), TOKEN_HOSTS (the addresses to listen on), TOKEN_PORT.
import fs from "node:fs";
import http from "node:http";
import net from "node:net";
import path from "node:path";
import { KEYS_ROOT, botIdentity, envLines, keyFile, mintToken, setLines } from "./apps.mjs";
import { loadKeys, taskSecret, verify } from "../gateway/keys.mjs";
import { readFile, writeFile } from "../kit/safe-files.mjs";

const MINUTE = 60_000;
export const RENEW_BEFORE = 15 * MINUTE;

// Loopback, and Tailscale's IPv4 and IPv6 ranges. Every other source is refused.
const CLUSTER = new net.BlockList();
CLUSTER.addSubnet("127.0.0.0", 8, "ipv4");
CLUSTER.addSubnet("100.64.0.0", 10, "ipv4");
CLUSTER.addAddress("::1", "ipv6");
CLUSTER.addSubnet("fd7a:115c:a1e0::", 48, "ipv6");
export function fromCluster(address = "") {
  const a = String(address).replace(/^::ffff:/, "");
  return CLUSTER.check(a, net.isIPv6(a) ? "ipv6" : "ipv4");
}

export class TokenService {
  // site: the stack's site.json; homes: the stack's hermes-homes folder; gatewayState: the
  // gateway's state folder, for the task keys; fetchFn and api: GitHub's API, for the tests
  constructor({ site, stack, ccDir, keysRoot = KEYS_ROOT, fetchFn = fetch, api = "https://api.github.com", now = () => Date.now(), log = console.log }) {
    Object.assign(this, { site, stack, keysRoot, fetchFn, api, now, log });
    this.homes = path.join(ccDir, "hermes-homes");
    this.gatewayState = path.join(ccDir, "gateway-state");
    this.tokens = {};       // agent -> { token, expiresAt }
    this.who = {};          // agent -> { name, email }
  }
  apps() { return this.site.github_apps ?? {}; }

  // The private key, from the root-owned file, never through a symlink.
  pem(agent) {
    const f = keyFile(this.stack, agent, this.keysRoot);
    const fd = fs.openSync(f, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
    try { return fs.readFileSync(fd, "utf8"); } finally { fs.closeSync(fd); }
  }

  async mint(agent, repos) {
    const app = this.apps()[agent];
    return mintToken({ app, pem: this.pem(agent), repos, fetchFn: this.fetchFn, api: this.api, now: this.now() });
  }

  // Each agent's token, renewed before the token ends, and written to the agent's .env.
  async tick() {
    const done = [];
    for (const agent of Object.keys(this.apps())) {
      const home = path.join(this.homes, `.hermes-${agent}`);
      if (!fs.existsSync(path.join(home, ".env"))) continue;   // setup-agent.sh makes the .env
      const t = this.tokens[agent];
      if (t && t.expiresAt - this.now() > RENEW_BEFORE) continue;
      try {
        const fresh = await this.mint(agent);
        this.who[agent] ??= await botIdentity({ slug: this.apps()[agent].slug, token: fresh.token, fetchFn: this.fetchFn, api: this.api });
        // The agent can change the agent's home, so the write never follows a symlink.
        writeFile(home, path.join(home, ".env"), setLines(readFile(home, path.join(home, ".env")), envLines(agent, fresh.token, this.who[agent])));
        this.tokens[agent] = fresh;
        done.push(agent);
      } catch (e) { this.log(`github token for ${agent}: ${e.message}`); }
    }
    return done;
  }

  // POST /token for a port job.
  async handle(req, res) {
    const send = (code, body) => { res.writeHead(code, { "content-type": "application/json" }); res.end(JSON.stringify(body)); };
    try {
      if (!fromCluster(req.socket.remoteAddress)) return send(403, { error: "outside_cluster" });
      if (req.method !== "POST" || new URL(req.url, "http://x").pathname !== "/token") return send(404, { error: "not_found" });
      const auth = String(req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
      // The gateway makes the secret that signs task keys. Without the secret, no task key is valid.
      if (!fs.existsSync(path.join(this.gatewayState, "task-key.secret"))) return send(503, { error: "no_gateway", detail: "The stack's gateway has not started yet." });
      const who = verify(auth, loadKeys(this.gatewayState), taskSecret(this.gatewayState));
      if (!who?.task) return send(401, { error: "task_key_needed", detail: "Send the job's task key." });
      const app = this.apps()[who.agent];
      if (!app) return send(403, { error: "no_app", detail: `Agent ${who.agent} has no GitHub App in site.json.` });
      let raw = ""; for await (const c of req) { raw += c; if (raw.length > 10_000) return send(413, { error: "too_large" }); }
      let repo; try { repo = JSON.parse(raw || "{}").repo; } catch { return send(400, { error: "bad_json" }); }
      // A repo may come as a clone URL, such as https://github.com/owner/name.git.
      repo = String(repo ?? "").replace(/^https:\/\/github\.com\//, "").replace(/\.git$/, "");
      if (!app.repos.some((r) => r.toLowerCase() === repo.toLowerCase())) return send(403, { error: "repo_not_allowed", detail: `${repo} is not one of ${who.agent}'s repos.` });
      const t = await this.mint(who.agent, [repo]);
      this.who[who.agent] ??= await botIdentity({ slug: app.slug, token: t.token, fetchFn: this.fetchFn, api: this.api });
      this.log(`github token for a port job: agent ${who.agent}, task ${who.task}, repo ${repo}`);
      return send(200, { token: t.token, expires_at: new Date(t.expiresAt).toISOString(), ...this.who[who.agent] });
    } catch (e) { return send(500, { error: "internal", detail: e.message }); }
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const env = process.env;
  // Root runs the service only from a kit checkout outside the agents' workspace.
  const { requireKit } = await import("../cluster/kit-check.mjs");
  requireKit(env.KIT, env);
  const ccDir = env.CC_DIR;
  const site = JSON.parse(fs.readFileSync(path.join(ccDir, "site.json"), "utf8"));
  const svc = new TokenService({ site, stack: env.STACK, ccDir });
  const loop = () => svc.tick().catch((e) => console.error(e.message));
  loop(); setInterval(loop, MINUTE);
  for (const host of String(env.TOKEN_HOSTS ?? "127.0.0.1").split(",").map((h) => h.trim()).filter(Boolean)) {
    const srv = http.createServer((req, res) => svc.handle(req, res));
    srv.on("error", (e) => { console.error(`token service cannot listen on ${host}: ${e.message}`); process.exit(1); });
    srv.listen(Number(env.TOKEN_PORT ?? 4010), host);
  }
  console.log(`github token service for stack ${env.STACK}: ${Object.keys(site.github_apps ?? {}).join(", ") || "no apps"}`);
}
