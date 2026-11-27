// Kev engine restarts that wait for a person. A Kev engine never stops on its own: when a running
// engine's unit would change, setup-node.sh leaves the engine running with the old unit, prints the
// command that applies the change, and records the held change in
// ~/.recursica-kit/held-restarts/<service> (kev_held in setup-node.sh, unit_held in kit/lib.sh).
// The setup records the change whether a person or the update job ran the setup.
//
// Each hour, the update job (updater.mjs) reads the records as root and posts once in the cluster's
// channel for each held change, with the command a person runs. The post repeats only for a new
// change, or 24 hours after the last post while the same change waits (notice.mjs), as the post for
// held network changes does. A record clears once a person applies the change with
// KIT_RESTART_KEV=1, or once the unit no longer changes: setup-node.sh then removes the record.
//
// The owner can write the records, and root reads them. So a post holds only the record's checked
// words, never the record's own text, and a record that is a link, a large file or another kind of
// file is skipped.
import fs from "node:fs";
import path from "node:path";
import { notice } from "./notice.mjs";

// The records' folder, in the owner's home folder.
export const HELD_DIR = ".recursica-kit/held-restarts";
const SERVICE = /^kev-engine(-[a-z0-9][a-z0-9-]{0,39})?$/;
const WHAT = { command: "the command", settings: "the secrets file the engine reads", other: "the unit's other lines" };
const MAX_BYTES = 1024;

// One record: { service, want, what } from the record's text, or null for text that isn't a record.
// want is the fingerprint of the unit the kit wants; what lists the parts that would change.
export function parseHeld(service, text) {
  if (!SERVICE.test(service)) return null;
  const v = Object.fromEntries(String(text ?? "").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  if (!/^[0-9a-f]{16}$/.test(v.want ?? "")) return null;
  const what = String(v.what ?? "").split(",").filter(Boolean);
  if (!what.length || what.some((w) => !Object.hasOwn(WHAT, w))) return null;
  return { service, want: v.want, what };
}

// The records in the folder, by service name. A missing folder has none.
export function readHeld(dir) {
  let names = [];
  try { names = fs.readdirSync(dir); } catch { return []; }
  const out = [];
  for (const name of names.sort()) {
    if (!SERVICE.test(name)) continue;
    let fd;
    try {
      // O_NOFOLLOW refuses a link. O_NONBLOCK keeps a named pipe from holding the job.
      fd = fs.openSync(path.join(dir, name), fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW | fs.constants.O_NONBLOCK);
      const st = fs.fstatSync(fd);
      if (!st.isFile() || st.nlink !== 1 || st.size > MAX_BYTES) continue;
      const rec = parseHeld(name, fs.readFileSync(fd, "utf8"));
      if (rec) out.push(rec);
    } catch {
      // An unreadable record is skipped.
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
    }
  }
  return out;
}

const list = (names) => (names.length < 2 ? names.join("") : `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`);

// The post for one held change.
//   kit: the kit checkout's folder
export function heldPost({ computer, kit, held }) {
  const k = String(kit).replace(/\/+$/, "");
  return `:warning: ${held.service} on ${computer} waits for a person: the unit of ${held.service} would change (${list(held.what.map((w) => WHAT[w]))}), and ${held.service} keeps running with the old unit. The kit never stops a Kev engine on its own. To restart ${held.service} with the change, run \`KIT_RESTART_KEV=1 ${k}/circlechat/setup-node.sh ${computer}\` on ${computer}, as the owner, when the engine is idle. The engine stops while the engine loads the model again.`;
}

// One post for each held change: again for a new change, or 24 hours later. A record that cleared
// clears the change's notice, so a later hold posts at once.
//   held: readHeld's records; state: the update job's state, changed in place (state.heldRestarts)
//   post(text): { ok } of one post in the cluster's channel
//   returns the services the job posted about
export async function tellHeld({ computer, kit, held, state, post, now = Date.now() }) {
  const store = (state.heldRestarts ??= {});
  for (const s of Object.keys(store)) {
    if (held.some((h) => h.service === s)) continue;
    delete store[s];
    console.log(`kev hold: ${s} has no held change now`);
  }
  const posted = [];
  for (const h of held) {
    if (await notice(store, h.service, h.want, () => heldPost({ computer, kit, held: h }), post, now)) posted.push(h.service);
  }
  if (!Object.keys(store).length) delete state.heldRestarts;
  return posted;
}
