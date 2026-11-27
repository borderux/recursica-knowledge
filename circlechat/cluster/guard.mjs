// The intrusion guard: one lockdown at a time.
//
//   normal --(an incoming connection no rule allows, or a touch on a decoy)--> watching
//   watching: client stacks sealed, packets recorded; Slack gets the alert and the buttons
//   watching --(10 minutes, or "Cut off now")--> cut off: only Tailscale and the guard's own
//   Slack connection stay open; the evidence is fingerprinted, encrypted and uploaded
//   The cut-off reads the firewall back. When the lockdown rules or a blocked source aren't in
//   place, it is "cut-off-failed", never "cut-off": one loud Slack alert, and another try each minute.
//   "Release lockdown" or "Allow this source" (both with an authenticator code) --> normal
// Each minute, whatever the state, the guard also checks that the firewall applies its rules at all.
// When it doesn't, Slack gets one loud alert, and one line when the rules apply again.
//
// The OS commands come in as `platform`, so the logic runs the same on every computer.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { suspicious } from "./classify.mjs";
import { LIST_FILES, readList, writeList } from "./firewall/lists.mjs";

export const WATCH_MS = 10 * 60_000;
export const EXTEND_MS = 30 * 60_000;

export class Guard {
  constructor({ platform, notify, stateDir, computer, now = () => Date.now(), watchMs = WATCH_MS }) {
    Object.assign(this, { platform, notify, stateDir, computer, now, watchMs });
    fs.mkdirSync(path.join(stateDir, "evidence"), { recursive: true, mode: 0o700 });
  }
  file(name) { return path.join(this.stateDir, name); }
  get state() { try { return JSON.parse(fs.readFileSync(this.file("lockdown.json"), "utf8")); } catch { return { status: "normal" }; } }
  set state(s) { fs.writeFileSync(this.file("lockdown.json"), JSON.stringify(s, null, 2), { mode: 0o600 }); }
  get allowed() { try { return JSON.parse(fs.readFileSync(this.file("allowed-sources.json"), "utf8")); } catch { return []; } }
  // The blocked and allowed addresses, kept on disk: the firewall's own lists empty at each restart,
  // and the firewall's start-up job loads both files again (firewall/lists.mjs).
  list(name) { return readList(this.file(LIST_FILES[name])); }
  saveList(name, addresses) { writeList(this.file(LIST_FILES[name]), addresses); }

  // One check: called every minute, and whenever the decoys log a touch.
  async tick(canaryHits = []) {
    await this.checkEnforced();
    const s = this.state;
    if (s.status === "watching" && this.now() >= s.cutAt) return this.cutOff("the watch window ended");
    if (s.status === "cut-off-failed") return this.cutOff(s.reason);
    if (s.status !== "normal") return s;
    const [conns, listening] = await Promise.all([this.platform.connections(), this.platform.listening()]);
    const found = suspicious(conns, listening, this.allowed).map((c) => ({ ...c, why: "incoming connection" }))
      .concat(canaryHits.map((h) => ({ remote: h.src_host, remotePort: h.src_port, localPort: h.dst_port, process: "decoy", why: `touched a decoy (${h.logtype ?? "decoy"})` })));
    if (!found.length) return s;
    return this.lock(found);
  }

  // Whether the firewall applies the guard's rules. On macOS the main rules must use the agentguard
  // anchor: a macOS update replaces /etc/pf.conf with Apple's own, and the anchor's rules, though
  // loaded, then never apply. Kept in firewall.json, so each change is posted once.
  async checkEnforced() {
    if (!this.platform.firewallState) return;
    const fw = await this.platform.firewallState().catch(() => null);
    if (!fw || typeof fw.enforced !== "boolean") return;
    const file = this.file("firewall.json");
    let was = {};
    try { was = JSON.parse(fs.readFileSync(file, "utf8")); } catch {}
    if (!fw.enforced && !was.offSince) {
      fs.writeFileSync(file, JSON.stringify({ offSince: this.now() }), { mode: 0o600 });
      await this.notify("info", `:rotating_light: <!channel> *The firewall on ${this.computer} doesn't apply the guard's rules.* The main pf rules don't use the agentguard anchor, so incoming connections aren't refused, and a lockdown can't cut the computer off. A macOS update replaces /etc/pf.conf with Apple's own. The next start-up builds the main rules again; to apply them now, run install-cluster.sh.`);
    } else if (fw.enforced && was.offSince) {
      fs.writeFileSync(file, JSON.stringify({}), { mode: 0o600 });
      await this.notify("info", `:white_check_mark: The firewall on ${this.computer} applies the guard's rules again.`);
    }
  }

  async lock(found) {
    const id = `lock-${new Date(this.now()).toISOString().replace(/[:.]/g, "-")}`;
    const dir = path.join(this.stateDir, "evidence", id);
    fs.mkdirSync(dir, { recursive: true, mode: 0o700 });
    const sources = [...new Set(found.map((f) => f.remote))];
    // Seal first, so the intruder finds no client data and no secrets.
    await this.platform.seal(true);
    fs.writeFileSync(path.join(dir, "trigger.json"), JSON.stringify({ found, at: new Date(this.now()).toISOString(), computer: this.computer }, null, 2));
    await this.platform.snapshot(dir);
    const lookups = await Promise.all(sources.map((ip) => this.platform.lookup(ip).catch((e) => ({ ip, error: e.message }))));
    fs.writeFileSync(path.join(dir, "lookup.json"), JSON.stringify(lookups, null, 2));
    for (const ip of sources) await this.platform.captureStart(ip, path.join(dir, `capture-${ip.replace(/[:.]/g, "_")}.pcap`), Math.ceil(this.watchMs / 1000));
    const s = { status: "watching", id, dir, sources, started: this.now(), cutAt: this.now() + this.watchMs };
    this.state = s;
    const who = lookups.map((l) => `${l.ip}${l.owner ? ` (${l.owner}${l.country ? `, ${l.country}` : ""})` : ""}`).join(", ");
    await this.notify("lockdown", `:rotating_light: *Lockdown on ${this.computer}.* ${found.map((f) => `${f.remote} → port ${f.localPort}: ${f.why}`).join("; ")}. Source: ${who}. Client stacks are sealed. Recording for ${Math.round(this.watchMs / 60000)} minutes, then cutting off.`, id);
    return s;
  }

  async cutOff(reason) {
    const s = this.state;
    if (s.status !== "watching" && s.status !== "cut-off-failed") return s;
    if (s.status === "watching") await this.platform.captureStop();
    // The lockdown rules first: loading them can define the blocked table anew, so each source is
    // added after them. Then the firewall is read back: a command that reports success proves nothing.
    const loaded = (await this.platform.lockdownFirewall(true)) ?? { ok: true };
    const blocks = [];
    for (const ip of s.sources) blocks.push({ ip, ...((await this.platform.block(ip)) ?? { ok: true }) });
    this.saveList("blocked", [...this.list("blocked"), ...s.sources]);
    const fw = await this.platform.firewallState().catch((e) => ({ lockdown: false, blocked: [], error: e.message }));
    const problems = [];
    if (fw.enforced === false) problems.push("the main firewall rules don't use the agentguard anchor, so none of its rules apply");
    if (!fw.lockdown) problems.push(`the lockdown rules aren't loaded${loaded.ok ? "" : ` (${loaded.error})`}`);
    for (const b of blocks) if (!fw.blocked.includes(b.ip)) problems.push(`${b.ip} isn't blocked${b.ok ? "" : ` (${b.error})`}`);
    if (fw.error) problems.push(`the firewall couldn't be read (${fw.error})`);
    const manifest = s.manifest ?? (await this.preserve(s.dir));
    const evidence = `Evidence ${s.id}: ${manifest.files} files, fingerprints in manifest.json, ${manifest.uploaded ? "encrypted copy uploaded" : "kept on this computer"}.`;
    if (problems.length) {
      const next = { ...s, status: "cut-off-failed", reason, failedAt: s.failedAt ?? this.now(), tries: (s.tries ?? 0) + 1, problems, manifest };
      this.state = next;
      // One alert, at the first failure; each minute's try after it is quiet until one works.
      if (s.status !== "cut-off-failed") {
        await this.notify("cut-off-failed", `:rotating_light: <!channel> *${this.computer} is NOT cut off.* The cut-off (${reason}) failed: ${problems.join("; ")}. The computer stays sealed, and the guard tries again each minute. Press "Cut off now" to try at once, or "Shut down". ${evidence}`, s.id);
      }
      return next;
    }
    const { problems: _p, failedAt, tries, ...rest } = s;
    const next = { ...rest, status: "cut-off", cutOffAt: this.now(), reason, manifest };
    this.state = next;
    const after = tries ? ` after ${tries + 1} tries, the first failed at ${new Date(failedAt).toISOString().slice(11, 16)} UTC` : "";
    await this.notify("info", `:lock: ${this.computer} is cut off (${reason})${after}. The firewall holds the lockdown rules and blocks ${s.sources.join(", ")}. Only Tailscale and the guard's Slack connection stay open. ${evidence}`);
    return next;
  }

  async keepWatching() {
    const s = this.state;
    if (s.status !== "watching") return { ok: false, message: "no watch window is open" };
    s.cutAt = Math.max(s.cutAt, this.now()) + EXTEND_MS;
    this.state = s;
    for (const ip of s.sources) await this.platform.captureStart(ip, path.join(s.dir, `capture-${ip.replace(/[:.]/g, "_")}-more.pcap`), Math.ceil(EXTEND_MS / 1000));
    return { ok: true, message: `recording 30 more minutes, until ${new Date(s.cutAt).toISOString().slice(11, 16)} UTC` };
  }

  async release(allowSource = false) {
    const s = this.state;
    if (s.status === "normal") return { ok: false, message: "no lockdown is active" };
    if (s.status === "watching") await this.cutOff("released while watching");
    if (allowSource) {
      this.saveList("allowed", [...this.allowed, ...s.sources]);
      this.saveList("blocked", this.list("blocked").filter((ip) => !s.sources.includes(ip)));
    }
    await this.platform.lockdownFirewall(false);
    if (allowSource) for (const ip of s.sources) await this.platform.unblock(ip);
    await this.platform.seal(false);
    this.state = { status: "normal", last: s.id };
    return { ok: true, message: `lockdown ${s.id} released${allowSource ? `; ${s.sources.join(", ")} allowed from now on` : ""}. Client stacks stay locked until the Unlock stack workflow runs.` };
  }

  // Fingerprint each evidence file (SHA-256, with UTC times), then encrypt the folder to the
  // evidence public key and upload the encrypted copy. The computer holds no key that decrypts it.
  async preserve(dir) {
    const files = fs.readdirSync(dir).filter((f) => f !== "manifest.json");
    const entries = files.map((f) => {
      const p = path.join(dir, f);
      return { file: f, sha256: crypto.createHash("sha256").update(fs.readFileSync(p)).digest("hex"), bytes: fs.statSync(p).size, modified: fs.statSync(p).mtime.toISOString() };
    });
    const manifest = { computer: this.computer, sealed: new Date(this.now()).toISOString(), entries };
    fs.writeFileSync(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
    const uploaded = await this.platform.encryptAndUpload(dir).catch(() => false);
    return { files: entries.length, uploaded };
  }
}
