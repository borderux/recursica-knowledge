// The network check, part of the cluster's uptime checks. Every 5 minutes, on each computer:
//
//   - The router: the computer's default route must lead to nodes[].router in site.json. Another
//     router can read and change the computer's traffic outside Tailscale.
//   - github.com: each address github.com resolves to must sit in the web ranges that
//     api.github.com/meta lists. An address outside those ranges means a changed name lookup.
//   - The office address: the computer's address on the office network. Slack hears each new
//     address, so FileVault on a Mac can be unlocked over SSH before Tailscale starts.
//
// Each problem posts once when the problem starts, and once when the problem ends.
import dns from "node:dns";
import fs from "node:fs";
import net from "node:net";

export const NETWORK_EVERY_MS = 5 * 60_000;
const META_EVERY_MS = 24 * 3600_000;

// macOS: route -n get default   ...  gateway: 192.168.1.1 / interface: en0
export function parseMacRoute(text) {
  const g = String(text).match(/^\s*gateway:\s*(\S+)/m), i = String(text).match(/^\s*interface:\s*(\S+)/m);
  return { router: g?.[1] ?? null, iface: i?.[1] ?? null };
}
// Linux: ip -4 route get 1.1.1.1   ->   1.1.1.1 via 192.168.1.1 dev eth0 src 192.168.1.20 uid 0
// No packet is sent: the kernel reports the route it would use.
export function parseLinuxRoute(text) {
  return { router: String(text).match(/\bvia\s+(\S+)/)?.[1] ?? null, office: String(text).match(/\bsrc\s+(\S+)/)?.[1] ?? null };
}
// WSL: the Windows side's default route, from PowerShell, as JSON: { "router": "...", "office": "..." }
export function parseWindowsRoute(text) {
  try { const j = JSON.parse(text); return { router: j.router || null, office: j.office || null }; } catch { return { router: null, office: null }; }
}
const WINDOWS_ROUTE = "$c = Get-NetIPConfiguration | Where-Object { $_.IPv4DefaultGateway } | Select-Object -First 1; " +
  "[pscustomobject]@{ router = $c.IPv4DefaultGateway.NextHop; office = @($c.IPv4Address)[0].IPAddress } | ConvertTo-Json -Compress";

// The computer's router and office address. run(cmd, args) returns the command's output.
export async function readNetwork({ run, mac, wsl }) {
  if (mac) {
    const r = parseMacRoute(await run("route", ["-n", "get", "default"]));
    const office = r.iface ? String(await run("ipconfig", ["getifaddr", r.iface])).trim() || null : null;
    return { router: r.router, office };
  }
  if (wsl) return parseWindowsRoute(await run("powershell.exe", ["-NoProfile", "-NonInteractive", "-Command", WINDOWS_ROUTE]));
  return parseLinuxRoute(await run("ip", ["-4", "route", "get", "1.1.1.1"]));
}

// The addresses outside GitHub's web ranges. ranges: CIDR strings, such as "140.82.112.0/20".
export function outsideRanges(addresses, ranges) {
  const list = new net.BlockList();
  for (const r of ranges) {
    const [addr, bits] = r.split("/");
    const type = net.isIPv6(addr) ? "ipv6" : "ipv4";
    list.addSubnet(addr, Number(bits ?? (type === "ipv6" ? 128 : 32)), type);
  }
  return addresses.filter((a) => !list.check(a, net.isIPv6(a) ? "ipv6" : "ipv4"));
}

const lookupGithub = async () => (await dns.promises.lookup("github.com", { all: true })).map((a) => a.address);
const fetchMeta = async () => {
  const r = await fetch("https://api.github.com/meta", { headers: { accept: "application/vnd.github+json" }, signal: AbortSignal.timeout(30_000) });
  if (!r.ok) throw new Error(`api.github.com/meta answered ${r.status}`);
  return (await r.json()).web ?? [];
};

export class NetworkWatch {
  // expectedRouter: nodes[].router for this computer, or empty for no router check.
  constructor({ computer, expectedRouter = "", post, stateFile, read, lookup = lookupGithub, meta = fetchMeta, now = () => Date.now() }) {
    Object.assign(this, { computer, expectedRouter, post, stateFile, read, lookup, meta, now });
    try { this.state = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch { this.state = {}; }
  }

  save() { fs.writeFileSync(this.stateFile, JSON.stringify(this.state), { mode: 0o600 }); }

  // Post once when a problem starts, and once when the problem ends.
  async flag(key, problem, startText, endText) {
    const was = Boolean(this.state[key]);
    if (problem && !was) await this.post(startText);
    if (!problem && was) await this.post(endText);
    this.state[key] = problem;
  }

  async tick() {
    const t = this.now();
    if (t - (this.state.lastRun ?? 0) < NETWORK_EVERY_MS) return;
    this.state.lastRun = t;
    const c = this.computer;
    const { router, office } = await this.read();

    if (this.expectedRouter && router) {
      await this.flag("wrongRouter", router !== this.expectedRouter,
        `:rotating_light: ${c}'s router is ${router}, and site.json expects ${this.expectedRouter}. Another router can read and change ${c}'s traffic outside Tailscale. Check the computer's network connection.`,
        `:white_check_mark: ${c}'s router is ${this.expectedRouter} again.`);
    }

    // GitHub's web ranges, fetched once a day. The last good list stays in the state, so a name
    // lookup that also breaks the fetch is still checked.
    if (t - (this.state.metaAt ?? 0) >= META_EVERY_MS || !this.state.web?.length) {
      try { this.state.web = await this.meta(); this.state.metaAt = t; } catch (e) { console.error(`network check: ${e.message}`); }
    }
    if (this.state.web?.length) {
      let addresses = [];
      try { addresses = await this.lookup(); } catch (e) { console.error(`network check: github.com did not resolve: ${e.message}`); }
      if (addresses.length) {
        const outside = outsideRanges(addresses, this.state.web);
        await this.flag("githubOutside", outside.length > 0,
          `:rotating_light: On ${c}, github.com resolves to ${outside.join(", ")}, outside the web addresses that api.github.com/meta lists. A changed name lookup can send the computer's GitHub traffic elsewhere. Check the computer's DNS settings and the router.`,
          `:white_check_mark: On ${c}, github.com resolves inside GitHub's web addresses again.`);
      }
    }

    if (office && office !== this.state.office) {
      this.state.office = office;
      await this.post(`:office: ${c}'s office address is now ${office}. On a Mac, unlock FileVault over SSH at this address after a restart.`);
    }
    this.save();
  }
}
