// Updates that interrupt work wait until RecursicaChat 2.0 on this computer is quiet. Runs as root,
// in the update job (updater.mjs), which reads the server's database and every process's sockets.
//
// Quiet means both:
//   - no agent work: no delivery queued or in a running turn (deliveries in state queued or
//     injected), in the server's database, read-only;
//   - no person online: no web app open. A person reaches the server through tailscale serve, and an
//     open app holds a WebSocket from tailscaled to the server's port on 127.0.0.1.
// A computer without a recursicachat block in site.json runs no server, and is always quiet. A
// database that can't be read counts as busy: an update waits rather than cut a turn short.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { RC_DEFAULTS } from "../kit/render.mjs";

// Homebrew formulae whose update interrupts work: Tailscale's update restarts tailscaled
// (updates.mjs afterBrewUpgrade), Ollama's restarts the model server, and Colima's and Lima's
// change the tools that run the VMs. Every other formula installs as before.
export const DISRUPTIVE_BREWS = ["tailscale", "ollama", "colima", "lima"];
export const disruptive = (name) => DISRUPTIVE_BREWS.includes(name);

// The connections from tailscaled to the server's port, in `lsof -nP -iTCP:<port> -sTCP:ESTABLISHED`.
// lsof cuts each command to 9 characters, so tailscaled is "tailscale".
export function viewers(lsofText, port) {
  return String(lsofText).split("\n").filter((l) => /^tailscale/.test(l) && l.includes(`->127.0.0.1:${port} `)).length;
}

// Why the server is busy, or "" when it is quiet.
export function busyReason({ work, people }) {
  const why = [];
  if (work === null) why.push("its database can't be read");
  else if (work > 0) why.push(`${work} agent message(s) queued or in a turn`);
  if (people > 0) why.push(`${people} web app connection(s) open`);
  return why.join(", and ");
}

const exec = promisify(execFile);
const lsof = async (port) => { try { return (await exec("lsof", ["-nP", `-iTCP:${port}`, "-sTCP:ESTABLISHED"])).stdout; } catch (e) { return e.stdout ?? ""; } };
async function openWork(file) {
  try {
    if (!fs.existsSync(file)) return null;
    const { DatabaseSync } = await import("node:sqlite");
    const db = new DatabaseSync(file, { readOnly: true });
    try { return db.prepare("SELECT COUNT(*) AS n FROM deliveries WHERE state IN ('queued', 'injected')").get().n; } finally { db.close(); }
  } catch { return null; }
}

// { quiet, why } for the RecursicaChat 2.0 server that site.json names.
export async function serverQuiet(site, { work = openWork, sockets = lsof } = {}) {
  const rc = site?.recursicachat;
  if (!rc) return { quiet: true, why: "" };
  const port = new URL(rc.url ?? RC_DEFAULTS.url).port || "3100";
  const why = busyReason({ work: await work(path.join(rc.data ?? RC_DEFAULTS.data, "circlechat.db")), people: viewers(await sockets(port), port) });
  return { quiet: !why, why };
}
