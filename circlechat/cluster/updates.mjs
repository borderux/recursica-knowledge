// The daily update check. Runs as root on each computer.
//
// Rules:
//   - Stable channels only: Ubuntu LTS security updates, Homebrew's stable releases, and the
//     operating system's own security updates with no new major version.
//   - Each update waits 7 days after this check first sees it, so the community can find problems.
//   - An update that fixes a flaw on CISA's Known Exploited Vulnerabilities list installs at once.
//   - An update with no reboot installs, and the check posts what it installed.
//   - An update that needs a reboot is held, and Slack gets the reboot buttons.
//
//   node updates.mjs check          the check (updater.mjs runs it hourly)
//   node updates.mjs install-held   install the held updates (the agent runs this before a reboot)
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { stopColimaVms } from "./colima.mjs";
import { IS_MAC, IS_WSL } from "./platform.mjs";

const exec = promisify(execFile);
const sh = async (cmd, args, opts = {}) => { try { return (await exec(cmd, args, { maxBuffer: 64 << 20, timeout: 30 * 60_000, ...opts })).stdout; } catch (e) { return e.stdout ?? ""; } };
export const SOAK_MS = 7 * 24 * 3600_000;
const REBOOT_APT = /^(linux-(image|modules|headers|generic|virtual)|libc6|systemd|dbus|libssl3|openssl)(\b|-)/;

// The decision for each update: install now, hold for a reboot, or wait.
//   update: { key, name, reboot, cves: [] }; seen: { key: firstSeenMs }; kev: Set of CVE IDs
export function decide(updates, seen, kev, now = Date.now()) {
  const out = { install: [], hold: [], wait: [] };
  for (const u of updates) {
    const first = seen[u.key] ?? now;
    seen[u.key] = first;
    const exploited = (u.cves ?? []).filter((c) => kev.has(c));
    const ready = exploited.length > 0 || now - first >= SOAK_MS;
    const item = { ...u, exploited, waitsUntil: first + SOAK_MS };
    if (!ready) out.wait.push(item);
    else if (u.reboot) out.hold.push(item);
    else out.install.push(item);
  }
  return out;
}

// apt list --upgradable:  openssl/noble-security 3.0.13-0ubuntu3.5 amd64 [upgradable from: ...]
export function parseAptUpgradable(text) {
  return text.split("\n").map((l) => l.match(/^([^/\s]+)\/(\S+)\s+(\S+)\s/)).filter(Boolean)
    .filter((m) => /-security(,|$)/.test(m[2]))
    .map((m) => ({ key: `${m[1]}@${m[3]}`, name: m[1], version: m[3], reboot: REBOOT_APT.test(m[1]) }));
}

// The CVE IDs in the newest entry of a Debian changelog.
export function cvesInChangelog(text) {
  const first = text.split(/\n(?=\S+ \([^)]+\) )/)[0] ?? "";
  return [...new Set(first.match(/CVE-\d{4}-\d{4,}/g) ?? [])];
}

// softwareupdate -l:  * Label: Safari18.1-18.1\n\tTitle: Safari, Version: 18.1, ..., Action: restart, ...
export function parseSoftwareUpdate(text, currentMajor) {
  const out = [];
  const re = /\* Label: (.+)\n\s*Title: ([^,]+), Version: ([^,]+),([^\n]*)/g;
  for (let m; (m = re.exec(text)); ) {
    const [, label, title, version, rest] = m;
    const major = Number(String(version).split(".")[0]);
    if (/^macOS/.test(title) && major > currentMajor) continue;   // a new major version: never
    out.push({ key: `${label}@${version}`, name: title.trim(), version, label: label.trim(),
      reboot: /Action: restart/.test(rest), rapid: /Rapid Security Response|Background Security Improvement/i.test(title) });
  }
  return out;
}

// Lima and Colima on Linux and WSL come from each project's GitHub releases (tenant/setup-pc.sh),
// at a pinned version and checksum, outside apt. A new release waits 7 days like any other update,
// then posts once in Slack, with the step that moves the pin. The pin moves by pull request,
// because each version carries a checksum.
export const VM_TOOLS = [
  { name: "Colima", repo: "abiosoft/colima", bin: "/usr/local/bin/colima", args: ["version"], pin: "COLIMA_VERSION" },
  { name: "Lima", repo: "lima-vm/lima", bin: "/usr/local/bin/limactl", args: ["--version"], pin: "LIMA_VERSION" },
];
// "colima version 0.10.3", "limactl version 2.2.1", or a release tag such as "v0.11.0"
export const toolVersion = (text) => (String(text).match(/(?:version\s+|^v?)(\d+\.\d+\.\d+)/m) ?? [])[1] ?? null;
const newer = (a, b) => { const x = a.split(".").map(Number), y = b.split(".").map(Number); return x[0] - y[0] || x[1] - y[1] || x[2] - y[2]; };

//   found: [{ name, pin, installed, latest }]; seen: as for decide(). Returns the Slack lines.
export function vmToolLines(found, seen, now = Date.now()) {
  const ups = found.filter((f) => f.installed && f.latest && newer(f.latest, f.installed) > 0)
    .map((f) => ({ key: `${f.name}@${f.latest}`, name: f.name, version: f.latest, installed: f.installed, pin: f.pin, reboot: false }));
  const d = decide(ups, seen, new Set(), now);
  const lines = [];
  for (const u of d.install) {
    if (seen[`reported:${u.key}`] !== undefined) continue;
    seen[`reported:${u.key}`] = now;
    lines.push(`${u.name} ${u.version} is out, and this computer runs ${u.installed}. Move ${u.pin} and its checksum in circlechat/tenant/setup-pc.sh to ${u.version} by pull request, then rerun setup-pc.sh.`);
  }
  return lines;
}

async function vmToolsFound(run, latest) {
  const out = [];
  for (const t of VM_TOOLS) {
    if (!fs.existsSync(t.bin)) continue;
    out.push({ name: t.name, pin: t.pin, installed: toolVersion(await run(t.bin, t.args)), latest: await latest(t.repo) });
  }
  return out;
}
const latestRelease = async (repo) => {
  try {
    const r = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30_000) });
    return r.ok ? toolVersion((await r.json()).tag_name) : null;
  } catch { return null; }
};

async function kevList() {
  try {
    const r = await fetch("https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json", { signal: AbortSignal.timeout(30_000) });
    return new Set((await r.json()).vulnerabilities.map((v) => v.cveID));
  } catch { return new Set(); }
}

export async function check({ env = process.env, post, stateDir = "/var/lib/agent-cluster", now = Date.now() } = {}) {
  const seenFile = path.join(stateDir, "updates-seen.json"), heldFile = path.join(stateDir, "updates-held.json");
  let seen = {}; try { seen = JSON.parse(fs.readFileSync(seenFile, "utf8")); } catch {}
  const kev = await kevList();
  const lines = [], held = [];
  const computer = env.COMPUTER;

  if (!IS_MAC) {
    await sh("apt-get", ["update", "-qq"]);
    const ups = parseAptUpgradable(await sh("apt", ["list", "--upgradable"]));
    for (const u of ups) u.cves = cvesInChangelog(await sh("apt-get", ["changelog", u.name]));
    const d = decide(ups, seen, kev, now);
    if (d.install.length) {
      await sh("apt-get", ["install", "-y", "--only-upgrade", "-o", "Dpkg::Options::=--force-confold", ...d.install.map((u) => u.name)], { env: { ...process.env, DEBIAN_FRONTEND: "noninteractive" } });
      lines.push(`Installed ${d.install.length} Linux security update(s): ${d.install.map((u) => `${u.name} ${u.version}${u.exploited.length ? ` (fixes actively exploited ${u.exploited.join(", ")})` : ""}`).join(", ")}.`);
    }
    held.push(...d.hold.map((u) => ({ kind: "apt", name: u.name, version: u.version, exploited: u.exploited })));
    lines.push(...vmToolLines(await vmToolsFound(sh, latestRelease), seen, now));
  }

  if (IS_MAC) {
    const major = Number((await sh("sw_vers", ["-productVersion"])).split(".")[0]);
    const ups = parseSoftwareUpdate(await sh("softwareupdate", ["-l"]), major);
    for (const u of ups) u.cves = u.rapid ? ["rapid-security-response"] : [];
    const d = decide(ups, seen, new Set([...kev, "rapid-security-response"]), now);
    // macOS on Apple silicon asks for an administrator's password to install a system update,
    // so macOS's own automatic updates install these overnight, with an authenticated restart.
    // The check reports each one.
    const all = [...d.install, ...d.hold];
    const seenMac = all.filter((u) => seen[`reported:${u.key}`] === undefined);
    for (const u of seenMac) seen[`reported:${u.key}`] = now;
    if (seenMac.length) lines.push(`macOS updates ready: ${seenMac.map((u) => `${u.name} ${u.version}${u.reboot ? " (restart)" : ""}`).join(", ")}. macOS installs these overnight on its own.`);
    if (env.OWNER) {
      const outdated = JSON.parse((await sh("sudo", ["-u", env.OWNER, "-H", "brew", "outdated", "--json=v2"])) || "{}");
      const brews = (outdated.formulae ?? []).map((f) => ({ key: `${f.name}@${f.current_version}`, name: f.name, version: f.current_version, reboot: false }));
      const bd = decide(brews, seen, kev, now);
      if (bd.install.length) {
        await sh("sudo", ["-u", env.OWNER, "-H", "brew", "upgrade", ...bd.install.map((u) => u.name)]);
        await afterBrewUpgrade(bd.install.map((u) => u.name), { owner: env.OWNER, run: sh });
        lines.push(`Installed ${bd.install.length} Homebrew update(s): ${bd.install.map((u) => `${u.name} ${u.version}`).join(", ")}.`);
      }
    }
  }

  if (IS_WSL) {
    const ps = "$s=(New-Object -ComObject Microsoft.Update.Session).CreateUpdateSearcher(); $r=$s.Search('IsInstalled=0 and IsHidden=0'); $p=Test-Path 'HKLM:\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\WindowsUpdate\\Auto Update\\RebootRequired'; [pscustomobject]@{ pending=@($r.Updates | ForEach-Object { $_.Title }); reboot=$p } | ConvertTo-Json -Compress";
    let w = {}; try { w = JSON.parse(await sh("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps])); } catch {}
    const pending = [].concat(w.pending ?? []);
    const newWin = pending.filter((t) => seen[`reported:${t}`] === undefined);
    for (const t of newWin) seen[`reported:${t}`] = now;
    if (newWin.length) lines.push(`Windows updates waiting (Windows installs them after its 7-day deferral): ${newWin.join("; ")}.`);
    if (w.reboot) held.push({ kind: "windows", name: "Windows updates installed and waiting for a restart" });
  }

  fs.writeFileSync(seenFile, JSON.stringify(seen), { mode: 0o600 });
  // The check runs hourly: a reboot request goes to Slack only when the held updates change.
  let before = "[]"; try { before = fs.readFileSync(heldFile, "utf8"); } catch {}
  fs.writeFileSync(heldFile, JSON.stringify(held), { mode: 0o600 });
  if (lines.length) await post("info", `:package: ${computer}: ${lines.join(" ")}`);
  if (held.length && JSON.stringify(held) !== before) {
    const ref = `upd-${new Date(now).toISOString().slice(0, 10)}`;
    await post("reboot", `:warning: ${computer} has updates that need a reboot: ${held.map((h) => `${h.name}${h.version ? ` ${h.version}` : ""}${h.exploited?.length ? ` (fixes actively exploited ${h.exploited.join(", ")})` : ""}`).join(", ")}. Pick a time to install and reboot. With no answer, nothing happens until the next check.`, ref);
  }
  return { lines, held };
}

// The tailscale daemon runs a copy of the tailscaled binary, which tailscaled install-system-daemon
// makes in /usr/local/bin. After Homebrew upgrades tailscale, the copy is replaced from Homebrew's
// new binary. The new binary is named by its Homebrew folder: tailscaled on the PATH is the old copy.
export async function afterBrewUpgrade(names, { owner, run }) {
  if (!names.includes("tailscale")) return;
  const prefix = (await run("sudo", ["-u", owner, "-H", "brew", "--prefix", "tailscale"])).trim();
  if (prefix) await run(path.join(prefix, "bin/tailscaled"), ["install-system-daemon"]);
}

// Runs before each reboot the kit starts. On a Mac, each Colima VM stops cleanly first (colima.mjs).
export async function installHeld({ stateDir = "/var/lib/agent-cluster", env = process.env, mac = IS_MAC, run = sh } = {}) {
  if (mac) await stopColimaVms({ owner: env.OWNER, ownerHome: env.OWNER_HOME, run, envPath: env.PATH });
  let held = []; try { held = JSON.parse(fs.readFileSync(path.join(stateDir, "updates-held.json"), "utf8")); } catch {}
  const apt = held.filter((h) => h.kind === "apt").map((h) => h.name);
  if (apt.length) await sh("apt-get", ["install", "-y", "--only-upgrade", "-o", "Dpkg::Options::=--force-confold", ...apt], { env: { ...process.env, DEBIAN_FRONTEND: "noninteractive" } });
  fs.writeFileSync(path.join(stateDir, "updates-held.json"), "[]");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { makeChannel } = await import("./channel.mjs");
  const chat = makeChannel(process.env);
  const post = (kind, text, ref) => chat.post(process.env.SLACK_CHANNEL_ID, kind, text, ref);
  if (process.argv[2] === "install-held") await installHeld();
  else await check({ post });
}
