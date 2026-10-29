// The guard's commands for each operating system: Linux, Linux inside WSL on Windows, and macOS.
// Runs as root. Settings come from /etc/agent-cluster.env (see install-cluster.sh).
import { execFile, spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { stopColimaVms } from "./colima.mjs";

const exec = promisify(execFile);
const here = path.dirname(new URL(import.meta.url).pathname);
export const IS_MAC = process.platform === "darwin";
export const IS_WSL = !IS_MAC && /microsoft/i.test(fs.readFileSync("/proc/version", "utf8"));

const sh = async (cmd, args, opts = {}) => {
  try { return (await exec(cmd, args, { maxBuffer: 32 << 20, timeout: 60_000, ...opts })).stdout; }
  catch (e) { return e.stdout ?? ""; }
};

// "192.168.1.5:22", "[fe80::1%eth0]:22", "*:22", "192.168.1.5.22" (macOS netstat style is not used)
export function splitHostPort(s) {
  const m = String(s).match(/^\[?(.*?)\]?:(\d+|\*)$/);
  return m ? { host: m[1].replace(/%.*$/, ""), port: m[2] === "*" ? 0 : Number(m[2]) } : { host: s, port: 0 };
}

// ss -Htnp state established:  0 0 192.168.1.5:22 192.168.1.77:50000 users:(("sshd",pid=10,fd=3))
export function parseSs(text) {
  return text.trim().split("\n").filter(Boolean).map((line) => {
    const f = line.trim().split(/\s+/);
    const local = splitHostPort(f[2]), remote = splitHostPort(f[3]);
    const proc = (line.match(/users:\(\("([^"]+)"/) ?? [])[1] ?? "";
    return { localPort: local.port, remote: remote.host, remotePort: remote.port, process: proc };
  });
}
export function parseSsListen(text) {
  return text.trim().split("\n").filter(Boolean).map((l) => splitHostPort(l.trim().split(/\s+/)[2]).port).filter(Boolean);
}

// lsof -nP -iTCP -sTCP:ESTABLISHED:  sshd 512 root 5u IPv4 0x.. 0t0 TCP 192.168.1.5:22->192.168.1.77:50000 (ESTABLISHED)
export function parseLsof(text) {
  return text.trim().split("\n").slice(1).filter(Boolean).map((line) => {
    const f = line.trim().split(/\s+/);
    const name = f.find((x) => x.includes("->")) ?? "";
    const [l, r] = name.split("->");
    const local = splitHostPort(l ?? ""), remote = splitHostPort(r ?? "");
    return { localPort: local.port, remote: remote.host, remotePort: remote.port, process: f[0] };
  }).filter((c) => c.remote);
}
export function parseLsofListen(text) {
  return text.trim().split("\n").slice(1).map((l) => {
    const name = l.trim().split(/\s+/).find((x) => /:\d+$/.test(x));
    return name ? splitHostPort(name).port : 0;
  }).filter(Boolean);
}

// Windows, read from WSL: Get-NetTCPConnection as JSON.
async function windowsConnections(state) {
  if (!IS_WSL) return [];
  const ps = `Get-NetTCPConnection -State ${state} -ErrorAction SilentlyContinue | ForEach-Object { [pscustomobject]@{ l=$_.LocalPort; r=$_.RemoteAddress; rp=$_.RemotePort; p=(Get-Process -Id $_.OwningProcess -ErrorAction SilentlyContinue).Name } } | ConvertTo-Json -Compress`;
  const out = await sh("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", ps]);
  try { const j = JSON.parse(out || "[]"); return (Array.isArray(j) ? j : [j]).map((x) => ({ localPort: x.l, remote: x.r, remotePort: x.rp, process: x.p ?? "" })); }
  catch { return []; }
}

// Requests to the Windows side of a computer with WSL, which a scheduled task running as SYSTEM applies
// every minute (see windows/guard-windows.ps1).
function windowsRequest(body) {
  if (!IS_WSL) return;
  const dir = "/mnt/c/ProgramData/AgentCluster/requests";
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, `${Date.now()}-${Math.random().toString(36).slice(2)}.json`), JSON.stringify(body));
}

const captures = new Set();

export function makePlatform(env = process.env) {
  const owner = env.OWNER, home = env.OWNER_HOME, kit = env.KIT;
  const sealFile = "/var/lib/agent-cluster/sealed.json";
  const secretFiles = () => {
    const list = [`${home}/circlechat/.env`, `${home}/.recursica-node.env`];
    const tenants = path.join(home, "tenants");
    if (fs.existsSync(tenants)) for (const t of fs.readdirSync(tenants)) list.push(path.join(tenants, t, "node.env"), path.join(tenants, t, "circlechat", ".env"));
    return list.filter((f) => fs.existsSync(f));
  };
  return {
    async connections() {
      if (IS_MAC) return parseLsof(await sh("lsof", ["-nP", "-iTCP", "-sTCP:ESTABLISHED"]));
      return [...parseSs(await sh("ss", ["-Htnp", "state", "established"])), ...(await windowsConnections("Established"))];
    },
    async listening() {
      if (IS_MAC) return parseLsofListen(await sh("lsof", ["-nP", "-iTCP", "-sTCP:LISTEN"]));
      return [...parseSsListen(await sh("ss", ["-Htln"])), ...(await windowsConnections("Listen")).map((c) => c.localPort)];
    },
    // Seal: close each client stack's encrypted disk image, and make every secrets file
    // unreadable. Unseal restores each file's mode. Client stacks stay closed until the Unlock
    // stack workflow runs.
    async seal(on) {
      if (on) {
        const modes = {};
        for (const f of secretFiles()) { modes[f] = fs.statSync(f).mode & 0o777; fs.chmodSync(f, 0); }
        fs.writeFileSync(sealFile, JSON.stringify(modes), { mode: 0o600 });
        if (IS_MAC && fs.existsSync(path.join(home, "tenants"))) {
          for (const t of fs.readdirSync(path.join(home, "tenants"))) {
            await sh("sudo", ["-u", owner, "-H", "bash", path.join(kit, "circlechat/tenant/disk-image.sh"), "lock", t]);
          }
        }
      } else {
        let modes = {}; try { modes = JSON.parse(fs.readFileSync(sealFile, "utf8")); } catch {}
        for (const [f, m] of Object.entries(modes)) if (fs.existsSync(f)) fs.chmodSync(f, m);
        fs.rmSync(sealFile, { force: true });
      }
    },
    async snapshot(dir) {
      const save = async (name, cmd, args) => fs.writeFileSync(path.join(dir, name), await sh(cmd, args));
      if (IS_MAC) {
        await save("connections.txt", "lsof", ["-nP", "-i"]);
        await save("processes.txt", "ps", ["auxww"]);
        await save("users.txt", "who", []);
        await save("logins.txt", "last", ["-50"]);
        await save("neighbors.txt", "arp", ["-an"]);
        await save("sign-in-log.txt", "log", ["show", "--last", "2h", "--style", "syslog", "--predicate", 'process == "sshd" OR process == "screensharingd" OR eventMessage CONTAINS "authentication"']);
      } else {
        await save("connections.txt", "ss", ["-tanp"]);
        await save("processes.txt", "ps", ["auxww"]);
        await save("users.txt", "who", []);
        await save("logins.txt", "last", ["-n", "50"]);
        await save("neighbors.txt", "ip", ["neigh"]);
        await save("sign-in-log.txt", "journalctl", ["--since", "-2h", "-o", "short-iso", "_COMM=sshd", "+", "SYSLOG_FACILITY=10"]);
        if (IS_WSL) {
          await save("windows-connections.txt", "powershell.exe", ["-NoProfile", "-Command", "Get-NetTCPConnection | Format-Table -AutoSize | Out-String -Width 300"]);
          await save("windows-processes.txt", "powershell.exe", ["-NoProfile", "-Command", "Get-Process | Format-Table -AutoSize | Out-String -Width 300"]);
          await save("windows-neighbors.txt", "arp.exe", ["-a"]);
        }
      }
    },
    // The network owner and country of a public address, from RDAP (the public whois service).
    // An office-network address gets the device's hardware address instead.
    async lookup(ip) {
      if (/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|fe80:|fd)/i.test(ip)) {
        const neigh = IS_MAC ? await sh("arp", ["-an"]) : await sh("ip", ["neigh"]);
        const line = neigh.split("\n").find((l) => l.includes(ip)) ?? "";
        return { ip, owner: "office network", hardware: (line.match(/([0-9a-f]{1,2}:){5}[0-9a-f]{1,2}/i) ?? [""])[0] };
      }
      const r = await fetch(`https://rdap.org/ip/${encodeURIComponent(ip)}`, { signal: AbortSignal.timeout(15_000) });
      const j = await r.json();
      const owner = j.name ?? j.entities?.[0]?.vcardArray?.[1]?.find((v) => v[0] === "fn")?.[3];
      return { ip, owner, country: j.country, handle: j.handle, range: [j.startAddress, j.endAddress].filter(Boolean).join(" - ") };
    },
    async captureStart(ip, file, seconds) {
      const args = IS_MAC ? ["-i", "pktap,all", "-w", file, "host", ip] : ["-i", "any", "-w", file, "host", ip];
      const p = spawn("tcpdump", args, { stdio: "ignore", detached: false });
      captures.add(p);
      setTimeout(() => { p.kill("SIGINT"); captures.delete(p); }, seconds * 1000).unref();
    },
    async captureStop() { for (const p of captures) p.kill("SIGINT"); captures.clear(); },
    async block(ip) {
      if (IS_MAC) await sh("pfctl", ["-a", "agentguard", "-t", "blocked", "-T", "add", ip]);
      else await sh("nft", ["add", "element", "inet", "agentguard", ip.includes(":") ? "blocked6" : "blocked4", `{ ${ip} }`]);
      windowsRequest({ action: "block", ip });
    },
    async unblock(ip) {
      if (IS_MAC) { await sh("pfctl", ["-a", "agentguard", "-t", "blocked", "-T", "delete", ip]); await sh("pfctl", ["-a", "agentguard", "-t", "allowed", "-T", "add", ip]); }
      else {
        await sh("nft", ["delete", "element", "inet", "agentguard", ip.includes(":") ? "blocked6" : "blocked4", `{ ${ip} }`]);
        await sh("nft", ["add", "element", "inet", "agentguard", ip.includes(":") ? "allowed6" : "allowed4", `{ ${ip} }`]);
      }
      windowsRequest({ action: "unblock", ip });
    },
    async lockdownFirewall(on) {
      if (IS_MAC) await sh("pfctl", ["-a", "agentguard", "-f", `/var/lib/agent-cluster/pf-${on ? "lockdown" : "base"}.conf`]);
      else if (on) await sh("nft", ["-f", path.join(here, "firewall/nft-lockdown.nft")]);
      else await sh("nft", ["delete", "table", "inet", "agentguard_lockdown"]);
      windowsRequest({ action: on ? "lockdown-on" : "lockdown-off" });
    },
    // Encrypt the evidence folder to the evidence public key (age, open source), and upload the
    // encrypted file. This computer holds no key that can decrypt the file.
    async encryptAndUpload(dir) {
      if (!env.EVIDENCE_RECIPIENT) return false;
      const out = `${dir}.tgz.age`;
      await exec("bash", ["-c", `tar czf - -C "$1" . | age -r "$2" -o "$3"`, "_", dir, env.EVIDENCE_RECIPIENT, out]);
      if (!env.BACKUP_REMOTE) return false;
      await exec("rclone", ["--config", `${home}/.config/rclone/rclone.conf`, "copy", out, `${env.BACKUP_REMOTE}/evidence/`]);
      return true;
    },
    async shutDown() {
      if (IS_WSL) await sh("shutdown.exe", ["/s", "/t", "60", "/c", "Agent cluster: shut down from Slack"]);
      else if (IS_MAC) await sh("shutdown", ["-h", "+1"]);
      else await sh("shutdown", ["-h", "+1"]);
    },
    async reboot() {
      if (IS_WSL) await sh("shutdown.exe", ["/r", "/t", "60", "/c", "Agent cluster: installing updates"]);
      else if (IS_MAC) {
        // Each Colima VM stops cleanly before the restart (colima.mjs).
        const { running } = await stopColimaVms({ owner, ownerHome: home, run: sh, envPath: env.PATH });
        if (running.length) console.error(`Colima VMs still running after 2 minutes: ${running.map((v) => v.name).join(", ")}`);
        await sh("shutdown", ["-r", "+1"]);
      } else await sh("shutdown", ["-r", "+1"]);
    },
  };
}
