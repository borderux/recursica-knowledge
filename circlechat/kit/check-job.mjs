#!/usr/bin/env node
// The drill's check job (check-job.sh): sends one check job to one node's job runner, waits for the
// job to end, and prints one PASS or FAIL line for each part of the port-job path.
//
//   node kit/check-job.mjs <node> [--repo <clone URL>]
//
// Reads the drill key's JSON (keys.mjs drill) on stdin, so the key is never an argument. Reads
// site.json from SITE, and JOBD_TOKEN from $CC_DIR/.env. Exits 0 when every part passes, 1 when a
// part fails, and 2 for a wrong setting.
import fs from "node:fs";
import path from "node:path";

// The check job's parts, in the order the job runs them (jobd/porter-job/check.sh).
export const PARTS = ["image", "gateway", "token"];

// The node's job runner. The drill runs on the control computer, outside Docker, so the drill uses
// each node's Tailscale address, where jobd listens (setup-node.sh).
export function jobdUrl(site, name) {
  const n = (site.nodes ?? []).find((x) => x.name === name);
  if (!n) throw new Error(`site.json has no node ${name}. The nodes: ${(site.nodes ?? []).map((x) => x.name).join(", ")}`);
  if (!n.jobs) throw new Error(`node ${name} has no jobs block in site.json, so the node runs no job runner`);
  return `http://${n.tailnet_address ?? n.address}:${n.jobs.port ?? 7400}`;
}

// Runs the drill. Returns { ok, lines, id }.
//   url, token  the job runner and JOBD_TOKEN
//   key         the drill key
//   repo        a repository on the job runner's allowlist (site.json porter.targets)
export async function drill({ url, token, key, repo, node, fetchFn = fetch, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), timeoutMs = 180_000, pollMs = 5000, now = Date.now }) {
  const line = (part, ok, detail) => `check-job ${node}: ${part.padEnd(8)} ${ok ? "PASS" : "FAIL"}  ${detail}`;
  const headers = { authorization: `Bearer ${token}`, "content-type": "application/json" };
  let r;
  try {
    r = await fetchFn(`${url}/jobs`, { method: "POST", headers, body: JSON.stringify({ type: "check", repo, label: `drill ${node}`, gateway_key: key }) });
  } catch (e) { return { ok: false, lines: [line("jobd", false, `no answer from ${url}: ${e.cause?.code ?? e.message}`)] }; }
  const started = await r.json().catch(() => ({}));
  if (r.status !== 201) {
    const why = started.error === "unknown_job_type" ? "the job runner has no check job: rerun setup-node.sh on the node" : `${started.error ?? ""} ${started.detail ?? ""}`.trim();
    return { ok: false, lines: [line("jobd", false, `${r.status} ${why}`)] };
  }
  const lines = [line("jobd", true, `${r.status} ${started.id}`)];
  const end = now() + timeoutMs;
  let meta = { status: "running" };
  while (meta.status === "running") {
    if (now() >= end) {
      lines.push(line("check", false, `the check job did not end in ${Math.round(timeoutMs / 60_000)} minutes. Read GET /jobs/${started.id}/log on the node.`));
      return { ok: false, lines, id: started.id };
    }
    await sleep(pollMs);
    try { meta = await (await fetchFn(`${url}/jobs/${started.id}`, { headers })).json(); } catch { /* the next poll tries again */ }
  }
  for (const part of PARTS) {
    const c = meta.checks?.[part];
    lines.push(line(part, Boolean(c?.ok), c?.detail ?? `the check job wrote no result (status ${meta.status})`));
  }
  return { ok: meta.status === "succeeded" && PARTS.every((p) => meta.checks?.[p]?.ok), lines, id: started.id };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  const node = args[0];
  const at = args.indexOf("--repo");
  const fail = (text) => { console.error(text); process.exit(2); };
  if (!node || node.startsWith("--")) fail("usage: check-job.mjs <node> [--repo <clone URL>]");
  let site, key, token;
  try { site = JSON.parse(fs.readFileSync(process.env.SITE, "utf8")); } catch (e) { fail(`cannot read site.json (SITE): ${e.message}`); }
  try { key = JSON.parse(fs.readFileSync(0, "utf8")).key; } catch { fail("no drill key on stdin. check-job.sh gets the key with keys.mjs drill."); }
  try { token = (fs.readFileSync(path.join(process.env.CC_DIR, ".env"), "utf8").match(/^JOBD_TOKEN=(.+)$/m) ?? [])[1]?.trim(); } catch { /* the line below says so */ }
  if (!token) fail(`no JOBD_TOKEN in ${path.join(process.env.CC_DIR ?? "$CC_DIR", ".env")}. Deploy the stack's secrets first.`);
  const repo = at >= 0 ? args[at + 1] : site.porter?.targets?.[0];
  if (!repo) fail("no repository: site.json has no porter.targets. Pass --repo <clone URL>.");
  let url; try { url = jobdUrl(site, node); } catch (e) { fail(e.message); }
  const out = await drill({ url, token, key, repo, node, timeoutMs: Number(process.env.CHECK_JOB_TIMEOUT_MS ?? 180_000), pollMs: Number(process.env.CHECK_JOB_POLL_MS ?? 5000) });
  for (const l of out.lines) console.log(l);
  process.exit(out.ok ? 0 : 1);
}
