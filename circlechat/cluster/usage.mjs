// The usage sampler, on the control computer: every 5 minutes, the cluster agent records how much
// memory the cluster's own Docker VMs use and which models Ollama holds loaded. Each sample is one
// JSON line in /var/lib/agent-cluster/usage/samples-<day>.jsonl, the day in the cluster's time zone.
// The hourly updater copies each finished day to the folder of each program with health_report
// (usage-export.mjs). Sample files older than 15 days are deleted.
//
// A line:
//   {"time":"<ISO>","vms":[{"profile":"default","status":"Running","memory_gb":64,"used_gb":23.4}],
//    "models":[{"name":"<model>","size_gb":66.1,"expires_at":"<ISO or null>"}]}
// A GB here is 1024³ bytes, rounded to one decimal. A command or a request that fails gives null in
// its place, so a sample is always written and never throws.
import fs from "node:fs";
import path from "node:path";

export const USAGE_EVERY_MS = 5 * 60_000;
export const KEEP_DAYS = 15;
const GIB = 1024 ** 3;
const DAY_RE = /^\d{4}-\d{2}-\d{2}$/;
const SAMPLES_RE = /^samples-(\d{4}-\d{2}-\d{2})\.jsonl$/;

/** Bytes as GB, one decimal, or null for a value that is not a number. */
export const gb = (bytes) => (Number.isFinite(Number(bytes)) && bytes !== null && bytes !== "" ? Math.round((Number(bytes) / GIB) * 10) / 10 : null);

/** A function that gives the day (YYYY-MM-DD) of a moment in the time zone. One formatter serves every call, so a long log reads fast. */
export function dayOf(tz) {
  const f = new Intl.DateTimeFormat("en-CA", { timeZone: tz, year: "numeric", month: "2-digit", day: "2-digit" });
  return (ms) => f.format(new Date(ms));
}

/** The calendar day n days after a day, as YYYY-MM-DD. */
export function addDays(day, n) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + n)).toISOString().slice(0, 10);
}
export const isDay = (s) => DAY_RE.test(String(s));

// colima list --json prints one VM per line, with the VM's memory in bytes:
//   {"name":"default","status":"Running","memory":68719476736,...}
export function parseVms(text) {
  return String(text).split("\n").map((l) => { try { return JSON.parse(l); } catch { return null; } })
    .filter((v) => v?.name).map((v) => ({ profile: v.name, status: v.status ?? null, memory_gb: gb(v.memory) }));
}

/** The memory in use from /proc/meminfo, in GB: MemTotal less MemAvailable. null without both lines. */
export function usedFromMeminfo(text) {
  const kb = (name) => Number(String(text).match(new RegExp(`^${name}:\\s+(\\d+)\\s+kB`, "m"))?.[1]);
  const total = kb("MemTotal"), avail = kb("MemAvailable");
  return Number.isFinite(total) && Number.isFinite(avail) ? gb((total - avail) * 1024) : null;
}

// The cluster's own Colima VMs, in <owner home>/.colima only: a client stack's VM belongs to the
// client. Colima runs as the owner, as for the restart (colima.mjs).
//   run(cmd, args): the command's output, or null on a failure
export async function readVms({ run, owner, ownerHome, envPath = process.env.PATH }) {
  const colima = (args) => run("sudo", ["-u", owner, "-H", "env", `PATH=${envPath}`, `COLIMA_HOME=${path.join(ownerHome, ".colima")}`, "colima", ...args]);
  const list = await colima(["list", "--json"]);
  if (list === null || list === undefined) return null;
  const out = [];
  for (const v of parseVms(list)) {
    let used = null;
    if (v.status === "Running") {
      const info = await colima(["ssh", "--profile", v.profile, "--", "cat", "/proc/meminfo"]);
      used = info ? usedFromMeminfo(info) : null;
    }
    out.push({ ...v, used_gb: used });
  }
  return out;
}

// The models the control computer's Ollama holds loaded, from Ollama's /api/ps.
export async function readModels({ port, fetch = globalThis.fetch, timeoutMs = 5000 }) {
  if (!port) return null;
  try {
    const r = await fetch(`http://127.0.0.1:${port}/api/ps`, { signal: AbortSignal.timeout(timeoutMs) });
    if (!r.ok) return null;
    const j = await r.json();
    if (!Array.isArray(j?.models)) return null;
    return j.models.map((m) => ({
      name: String(m.name ?? m.model ?? ""),
      size_gb: gb(m.size),
      expires_at: typeof m.expires_at === "string" && Number.isFinite(Date.parse(m.expires_at)) ? m.expires_at : null,
    }));
  } catch { return null; }
}

/** One sample. vms(): the VMs or null; models(): the models or null. A reader that throws gives null. */
export async function takeSample({ now = Date.now(), vms, models }) {
  const safe = async (f) => { try { return (await f()) ?? null; } catch { return null; } };
  return { time: new Date(now).toISOString(), vms: await safe(vms), models: await safe(models) };
}

/** Appends a sample to its day's file, the day of the sample's time in the time zone. Returns the file. */
export function writeSample(dir, sample, tz) {
  fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
  const file = path.join(dir, `samples-${dayOf(tz)(Date.parse(sample.time))}.jsonl`);
  fs.appendFileSync(file, JSON.stringify(sample) + "\n", { mode: 0o600 });
  return file;
}

/** Deletes each sample file whose day is more than KEEP_DAYS days before today. Returns the deleted names. */
export function cleanSamples(dir, today, keep = KEEP_DAYS) {
  const oldest = addDays(today, -keep);
  let names = []; try { names = fs.readdirSync(dir); } catch { return []; }
  const gone = names.filter((n) => SAMPLES_RE.test(n) && n.match(SAMPLES_RE)[1] < oldest);
  for (const n of gone) fs.rmSync(path.join(dir, n), { force: true });
  return gone;
}

// The sampler the cluster agent ticks each minute. It samples once in each 5-minute slot of the clock,
// and only while control() says this computer is the control computer.
//   control(): the cluster's site.json when this computer is its control computer, else null
//   sample(site): one sample (takeSample)
export class UsageSampler {
  constructor({ dir, tz, control, sample, now = () => Date.now() }) {
    Object.assign(this, { dir, tz, control, sample, now, slot: null });
  }

  async tick() {
    const t = this.now();
    const slot = Math.floor(t / USAGE_EVERY_MS);
    if (slot === this.slot) return null;
    this.slot = slot;
    const site = await this.control();
    if (!site) return null;
    const s = await this.sample(site, t);
    writeSample(this.dir, s, this.tz);
    cleanSamples(this.dir, dayOf(this.tz)(t));
    return s;
  }
}
