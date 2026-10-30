#!/usr/bin/env node
// Prints a GitHub App manifest for each agent that pushes to GitHub, and the steps to create each
// app from the organization's settings. Nothing is sent to GitHub.
//
//   node circlechat/github/manifest.mjs [--prefix <name>] [--url <homepage>] [<agent>...]
//
// The agents default to every agent in site.json's github_apps block (SITE), or Alan, Betty and
// Porter. Each app's name is <prefix>-<agent>, and the prefix defaults to "recursica". The homepage
// defaults to the GitHub address of this kit checkout.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { APP_AGENTS, DEFAULT_PERMISSIONS, keySecretName, manifest } from "./apps.mjs";

const LABEL = { contents: "Contents", pull_requests: "Pull requests", issues: "Issues", metadata: "Metadata" };

export function steps(agent, m) {
  const perms = Object.entries(m.default_permissions).map(([k, v]) => `${LABEL[k] ?? k}: ${v === "write" ? "Read and write" : "Read-only"}`);
  return [
    `## ${agent}`,
    "",
    "Manifest:",
    JSON.stringify(m, null, 2),
    "",
    "1. Open the organization's settings, then Developer settings, GitHub Apps, New GitHub App.",
    `2. Set the name to ${m.name}, and the homepage URL to ${m.url}.`,
    "3. Under Webhook, clear Active.",
    `4. Under Repository permissions, set ${perms.join(", ")}. Leave every other permission at No access.`,
    "5. Under \"Where can this GitHub App be installed?\", pick Only on this account. Create the app.",
    `6. Generate a private key. Save the key's text as the GitHub environment secret ${keySecretName(agent)}.`,
    `7. Install the app on only the agent's repos. Put the app ID, the installation ID, the slug and the repos in site.json's github_apps.${agent}.`,
    "",
  ].join("\n");
}

function homepage() {
  try {
    const kit = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../..");
    const remote = execFileSync("git", ["-C", kit, "remote", "get-url", "origin"], { encoding: "utf8" }).trim();
    const m = remote.match(/github\.com[/:]([A-Za-z0-9._-]+\/[A-Za-z0-9._-]+?)(\.git)?$/);
    if (m) return `https://github.com/${m[1]}`;
  } catch {}
  return "https://github.com";
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const opt = (k) => { const i = args.indexOf(k); if (i < 0) return undefined; const v = args[i + 1]; args.splice(i, 2); return v; };
  const prefix = opt("--prefix") ?? "recursica", url = opt("--url") ?? homepage();
  let site = {}; try { site = JSON.parse(fs.readFileSync(process.env.SITE ?? "", "utf8")); } catch {}
  const agents = args.length ? args : Object.keys(site.github_apps ?? {}).length ? Object.keys(site.github_apps) : APP_AGENTS.filter((a) => a !== "otto");
  for (const agent of agents) {
    const permissions = site.github_apps?.[agent]?.permissions ?? DEFAULT_PERMISSIONS(agent);
    process.stdout.write(steps(agent, manifest(agent, { prefix, url, permissions })) + "\n");
  }
}
