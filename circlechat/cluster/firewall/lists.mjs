// The guard's two lists of addresses, kept on disk so a restart keeps them. The firewall keeps its
// blocked and allowed lists in memory only (pf's <blocked> and <allowed> tables, nftables' blocked4,
// blocked6, allowed4 and allowed6 sets), so a restart empties both. The guard writes each list to a
// root-only JSON file in its state folder, /var/lib/agent-cluster, whenever the guard blocks or
// allows an address. The firewall's start-up job loads the rules, then both files:
//
//   node /var/lib/agent-cluster/lists.mjs load [state folder] [anchor or table]
//
// install-cluster.sh copies this one file, root-owned, to /var/lib/agent-cluster in its held firewall
// step, and the start-up job runs that copy, never the kit checkout's file. So the file imports only
// node's own modules (lists.test.mjs).
// The anchor (pf) or table (nftables) is agentguard; CI names a throwaway one (circlechat/ci/lists-load.sh).
// A missing or empty file is an empty list. An entry that isn't an address is skipped, with one log
// line, and the other entries still load. A file that isn't a JSON list is read line by line.
import { execFile } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

export const LIST_FILES = { blocked: "blocked-sources.json", allowed: "allowed-sources.json" };

// Writes the list to a new file in the same folder, root-only, then renames the new file over the
// old one, so a crash never leaves half a list.
export function writeList(file, addresses) {
  const tmp = `${file}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, `${JSON.stringify([...new Set(addresses)], null, 2)}\n`, { mode: 0o600 });
  fs.chmodSync(tmp, 0o600);
  fs.renameSync(tmp, file);
}

// The addresses in a list file, each once.
export function readList(file, log = () => {}) {
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch (e) {
    if (e.code !== "ENOENT") log(`${file}: ${e.message}`);
    return [];
  }
  if (!text.trim()) return [];
  let entries;
  try {
    entries = JSON.parse(text);
    if (!Array.isArray(entries)) throw new Error("not a list");
  } catch (e) {
    log(`${file} is not a JSON list (${e.message}), so each line is read as one address`);
    entries = text.split("\n").map((l) => l.trim().replace(/^[[\s"]+|[\]\s",]+$/g, "")).filter(Boolean);
  }
  const out = [];
  for (const x of entries) {
    if (typeof x === "string" && net.isIP(x)) out.push(x);
    else log(`${file}: skipped ${JSON.stringify(x).slice(0, 80)}, not an address`);
  }
  return [...new Set(out)];
}

// The commands that add the addresses to one list: pf on macOS, nftables on Linux.
export function listCommands(platform, name, addresses, anchor = "agentguard") {
  if (!addresses.length) return [];
  if (platform === "darwin") return [["pfctl", ["-a", anchor, "-t", name, "-T", "add", ...addresses]]];
  return [[`${name}4`, addresses.filter((a) => net.isIPv4(a))], [`${name}6`, addresses.filter((a) => net.isIPv6(a))]]
    .filter(([, l]) => l.length)
    .map(([set, l]) => ["nft", ["add", "element", "inet", anchor, set, `{ ${l.join(", ")} }`]]);
}

// Loads both files into the firewall. Returns false when a command failed; each failure is logged,
// and the other list still loads.
export async function loadLists({ stateDir, platform = process.platform, anchor = "agentguard", run, log = () => {} }) {
  let ok = true;
  for (const name of ["blocked", "allowed"]) {
    const addresses = readList(path.join(stateDir, LIST_FILES[name]), log);
    for (const [cmd, args] of listCommands(platform, name, addresses, anchor)) {
      const r = await run(cmd, args);
      if (r.code !== 0) { ok = false; log(`${cmd} ${args.slice(0, 6).join(" ")} failed: ${(r.stderr || r.stdout || "").trim()}`); }
    }
    log(`${addresses.length} ${name} address${addresses.length === 1 ? "" : "es"} from ${LIST_FILES[name]}`);
  }
  return ok;
}

const run = async (cmd, args) => {
  try { const r = await promisify(execFile)(cmd, args, { timeout: 60_000 }); return { code: 0, stdout: r.stdout, stderr: r.stderr }; }
  catch (e) { return { code: typeof e.code === "number" ? e.code : 1, stdout: e.stdout ?? "", stderr: String(e.stderr || e.message || "") }; }
};

const isMain = () => { try { return fileURLToPath(import.meta.url) === fs.realpathSync(process.argv[1]); } catch { return false; } };
if (isMain() && process.argv[2] === "load") {
  const ok = await loadLists({ stateDir: process.argv[3] ?? "/var/lib/agent-cluster", anchor: process.argv[4] ?? "agentguard", run, log: (l) => console.log(`agentguard lists: ${l}`) });
  process.exit(ok ? 0 : 1);
}
