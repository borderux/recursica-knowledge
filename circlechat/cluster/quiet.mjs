// Updates that interrupt work wait until RecursicaChat 2.0 on this computer is quiet. Runs as root,
// in the update job (updater.mjs), which reads the server's database, read-only.
//
// Quiet means no agent work. Open web apps and people online don't count. Agent work is either:
//   - an agent turn running or queued: a delivery in state queued or injected;
//   - a run by a service that drives an agent (the server's service accounts): a request the
//     service has open, in state pending or taken (service_requests). The service marks the
//     request done or declined when the run ends. A request unchanged for OPEN_RUN_MS counts as
//     abandoned, so a service that crashed can't hold every update for good.
// A computer without a recursicachat block in site.json runs no server, and is always quiet. A
// database that can't be read counts as busy: an update waits rather than cut a turn short. A server
// too old to have service requests has no such runs.
import fs from "node:fs";
import path from "node:path";
import { RC_DEFAULTS } from "../kit/render.mjs";

// Homebrew formulae whose update interrupts work: Tailscale's update restarts tailscaled
// (updates.mjs afterBrewUpgrade), Ollama's restarts the model server, and Colima's and Lima's
// change the tools that run the VMs. Every other formula installs as before.
export const DISRUPTIVE_BREWS = ["tailscale", "ollama", "colima", "lima"];
export const disruptive = (name) => DISRUPTIVE_BREWS.includes(name);

// How long a service's open request counts as a run going: one day since the request last changed.
export const OPEN_RUN_MS = 24 * 60 * 60 * 1000;

// Why the server is busy, or "" when it is quiet. work: { turns, runs }, or null when unread.
export function busyReason(work) {
  if (work === null) return "its database can't be read";
  const why = [];
  if (work.turns > 0) why.push(`${work.turns} agent message(s) queued or in a turn`);
  if (work.runs > 0) why.push(`${work.runs} service request(s) open for a driven agent`);
  return why.join(", and ");
}

// The agent work in the server's database file: { turns, runs }, or null when unread.
export async function openWork(file, now = Date.now()) {
  try {
    if (!fs.existsSync(file)) return null;
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      const turns = db.prepare("SELECT COUNT(*) AS n FROM deliveries WHERE state IN ('queued', 'injected')").get().n;
      const hasRequests = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'service_requests'").get();
      const runs = hasRequests ? db.prepare("SELECT COUNT(*) AS n FROM service_requests WHERE state IN ('pending', 'taken') AND updated_at > ?").get(now - OPEN_RUN_MS).n : 0;
      return { turns, runs };
    } finally { db.close(); }
  } catch { return null; }
}

// { quiet, why } for the RecursicaChat 2.0 server that site.json names.
export async function serverQuiet(site, { work = openWork } = {}) {
  const rc = site?.recursicachat;
  if (!rc) return { quiet: true, why: "" };
  const why = busyReason(await work(path.join(rc.data ?? RC_DEFAULTS.data, "circlechat.db")));
  return { quiet: !why, why };
}

// One agent's work on the server: { exists, turns, runs }, or null when the database can't be
// read. turns and runs count as openWork does, for this agent alone. An agent the server doesn't
// have, archived ones included, has exists false.
export async function agentWork(file, handle, now = Date.now()) {
  try {
    if (!fs.existsSync(file)) return null;
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(file, { readOnly: true });
    try {
      const agent = db.prepare("SELECT id FROM agents WHERE handle = ?").get(handle);
      if (!agent) return { exists: false, turns: 0, runs: 0 };
      const turns = db.prepare("SELECT COUNT(*) AS n FROM deliveries WHERE agent_id = ? AND state IN ('queued', 'injected')").get(agent.id).n;
      const hasRequests = db.prepare("SELECT 1 FROM sqlite_master WHERE type = 'table' AND name = 'service_requests'").get();
      const runs = hasRequests ? db.prepare("SELECT COUNT(*) AS n FROM service_requests WHERE agent_id = ? AND state IN ('pending', 'taken') AND updated_at > ?").get(agent.id, now - OPEN_RUN_MS).n : 0;
      return { exists: true, turns, runs };
    } finally { db.close(); }
  } catch { return null; }
}

// One agent's state on the RecursicaChat 2.0 server that site.json names, for a kev-engine key
// rotation (deploy/apply-secrets.sh), which restarts kev-engine only while Barb isn't running:
//   "none"      the server has no agent with the handle, or site.json names no server
//   "idle"      the agent has no turn queued or running, and no service request open
//   "busy: ..." the agent has work, and why
//   "unknown"   the server's database can't be read, which a rotation counts as busy
export async function agentState(site, handle, { work = agentWork } = {}) {
  const rc = site?.recursicachat;
  if (!rc) return "none";
  const w = await work(path.join(rc.data ?? RC_DEFAULTS.data, "circlechat.db"), handle);
  if (w === null) return "unknown";
  if (!w.exists) return "none";
  const why = busyReason(w);
  return why ? `busy: ${why}` : "idle";
}
