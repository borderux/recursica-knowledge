#!/usr/bin/env node
// Release watcher: when a watched repository publishes a new GitHub release, wake the agent that
// handles it through a CircleChat workflow webhook. Runs hourly on the control machine (setup-host.sh
// installs the job when site.json has `watches`). No dependencies.
//
//   WATCHES='[{"repo":"owner/name","hook":"PORTER"}]' STATE=/path/state.json node release-watch.mjs
//   (or WATCHES_FILE=/path/watches.json, which setup-host.sh renders from site.json)
//
// For each watch, the webhook URL and signing secret are read from <HOOK>_HOOK_URL and
// <HOOK>_HOOK_SECRET in the environment. The first run only records the current release, so a new
// install never starts work for an old release. The delivery id is "<repo>@<tag>", and CircleChat
// drops a repeated delivery, so a release is announced once even when the state file is lost.
import crypto from "node:crypto";
import fs from "node:fs";

const API = process.env.GITHUB_API ?? "https://api.github.com";
const STATE = process.env.STATE ?? "./release-watch.json";

export function sign(secret, ts, body) {
  return "sha256=" + crypto.createHmac("sha256", secret).update(ts).update(".").update(body).digest("hex");
}

export async function check(watches, state, env = process.env) {
  const fired = [];
  for (const w of watches) {
    const headers = { accept: "application/vnd.github+json", "user-agent": "recursica-release-watch" };
    if (env.GITHUB_TOKEN_READ) headers.authorization = `Bearer ${env.GITHUB_TOKEN_READ}`;
    const r = await fetch(`${API}/repos/${w.repo}/releases/latest`, { headers });
    if (r.status === 404) continue;                       // no release yet
    if (!r.ok) { console.error(`${w.repo}: GitHub ${r.status}`); continue; }
    const rel = await r.json();
    const seen = state[w.repo];
    state[w.repo] = rel.tag_name;
    if (seen === undefined || seen === rel.tag_name) continue;   // first run, or nothing new
    const url = env[`${w.hook}_HOOK_URL`], secret = env[`${w.hook}_HOOK_SECRET`];
    if (!url || !secret) { console.error(`${w.repo}: ${w.hook}_HOOK_URL / ${w.hook}_HOOK_SECRET not set`); state[w.repo] = seen; continue; }
    const body = JSON.stringify({ event: "release", repo: w.repo, tag: rel.tag_name, url: rel.html_url, name: rel.name ?? rel.tag_name });
    const ts = String(Math.floor(Date.now() / 1000));
    const h = await fetch(url, { method: "POST", body, headers: { "content-type": "application/json",
      "x-circlechat-delivery": `${w.repo}@${rel.tag_name}`, "x-circlechat-timestamp": ts, "x-circlechat-signature": sign(secret, ts, body) } });
    if (!h.ok) { console.error(`${w.repo}: webhook ${h.status}`); state[w.repo] = seen; continue; }  // retry next hour
    fired.push(`${w.repo}@${rel.tag_name}`);
  }
  return fired;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const watches = JSON.parse(process.env.WATCHES_FILE ? fs.readFileSync(process.env.WATCHES_FILE, "utf8") : process.env.WATCHES ?? "[]");
  let state = {};
  try { state = JSON.parse(fs.readFileSync(STATE, "utf8")); } catch {}
  const fired = await check(watches, state);
  fs.writeFileSync(STATE, JSON.stringify(state, null, 2));
  for (const f of fired) console.log(`announced ${f}`);
}
