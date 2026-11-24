// kit/lima-override.yaml: the ports the stack's own Colima VM, the one the gateway's containers run
// in, forwards to the Mac; and kit/lima-override.sh, which installs the file as the owner.
//
// The VM's forwarder is Lima's ssh forwarder (colima.yaml portForwarder: ssh). The test runs Lima's
// rules for it through a copy of Lima v2.3.0's portForwarder.forwardingAddresses
// (pkg/hostagent/port.go): first the rules that ignore the VM's sshd, then the file's rules, then
// Colima v0.10.3's rules (environment/vm/lima/yaml.go), then Lima's own last rule. The ssh forwarder
// forwards TCP only.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, mkdtempSync, mkdirSync, writeFileSync, symlinkSync, lstatSync, statSync, readdirSync, chmodSync, unlinkSync } from "node:fs";
import { spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const here = dirname(fileURLToPath(import.meta.url));
const text = readFileSync(join(here, "lima-override.yaml"), "utf8");
const override = parse(text).portForwards;

// FillPortForwardDefaults, for the fields these rules use.
const fill = (r) => {
  const guestIP = r.guestIP ?? (r.guestIPMustBeZero ? "0.0.0.0" : "127.0.0.1");
  return {
    proto: r.proto ?? "any",
    guestIP,
    mustBeZero: r.guestIPMustBeZero ?? guestIP === "0.0.0.0",
    hostIP: r.hostIP ?? "127.0.0.1",
    range: r.guestPortRange ?? (r.guestPort ? [r.guestPort, r.guestPort] : [1, 65535]),
    ignore: Boolean(r.ignore),
  };
};
// Lima's first rules for the ssh forwarder: the VM's sshd port, on any address, ignored.
const SSHD = [{ guestIP: "0.0.0.0", guestIPMustBeZero: false, guestPort: 22, ignore: true }];
// Colima's rules for ports, in Colima's order: 0.0.0.0 to 0.0.0.0, then 127.0.0.1 to 127.0.0.1.
const COLIMA = [
  { guestIPMustBeZero: true, guestIP: "0.0.0.0", hostIP: "0.0.0.0", proto: "tcp" },
  { guestIPMustBeZero: true, guestIP: "0.0.0.0", hostIP: "0.0.0.0", proto: "udp" },
  { guestIP: "127.0.0.1", hostIP: "127.0.0.1", proto: "tcp" },
  { guestIP: "127.0.0.1", hostIP: "127.0.0.1", proto: "udp" },
];
const LIMA_LAST = {}; // Lima's own last rule: 127.0.0.1 to 127.0.0.1
const unspecified = (ip) => ip === "0.0.0.0" || ip === "::";

/** The Mac address a TCP port the VM opens is forwarded to, or null for no forward. */
function forward(rules, ip, port) {
  for (const r of rules.map(fill)) {
    if (r.proto !== "any" && r.proto !== "tcp") continue;
    if (port < r.range[0] || port > r.range[1]) continue;
    const matches = unspecified(ip) || ip === r.guestIP || (ip === "::1" && r.guestIP === "127.0.0.1") || (unspecified(r.guestIP) && !r.mustBeZero);
    if (!matches) continue;
    if (r.ignore) {
      if (unspecified(ip) && !unspecified(r.guestIP)) continue;
      return null;
    }
    return `${r.hostIP}:${port}`;
  }
  return null;
}
const withFile = [...SSHD, ...override, ...COLIMA, LIMA_LAST];
const without = [...SSHD, ...COLIMA, LIMA_LAST];
const GUEST = ["0.0.0.0", "::", "127.0.0.1", "::1", "192.168.5.1", "fe80::1"];

test("the stack's VM keeps the same rules as the RecursicaChat 2.0 server's VM", () => {
  const server = parse(readFileSync(join(here, "../recursicachat/lima-override.yaml"), "utf8")).portForwards;
  assert.deepEqual(override, server);
});

test("without the file, a port a container publishes with no address reaches every address of the Mac", () => {
  assert.equal(forward(without, "0.0.0.0", 8080), "0.0.0.0:8080");
  assert.equal(forward(without, "::", 8080), "0.0.0.0:8080");
});

test("with the file, the gateway's ports on 127.0.0.1 in the VM still reach 127.0.0.1, and a bare publish goes there too", () => {
  // the gateway's ports, the agents' local port and the app preview, each published on 127.0.0.1
  for (const port of [4001, 4005, 5173]) assert.equal(forward(withFile, "127.0.0.1", port), `127.0.0.1:${port}`, String(port));
  for (const ip of ["0.0.0.0", "::"]) assert.equal(forward(withFile, ip, 8080), "127.0.0.1:8080", ip);
});

test("every forward goes to 127.0.0.1 at port 1024 or above; the VM's sshd and DNS server are never forwarded", () => {
  for (const ip of GUEST)
    for (const port of [1, 22, 53, 80, 443, 1023, 1024, 3000, 4001, 8080, 65535]) {
      const to = forward(withFile, ip, port);
      if (to === null) continue;
      assert.equal(to, `127.0.0.1:${port}`, `${ip}:${port}`);
      assert.ok(port >= 1024, `${ip}:${port} is below 1024`);
    }
  for (const ip of GUEST) for (const port of [22, 53]) assert.equal(forward(withFile, ip, port), null, `${ip}:${port}`);
});

test("the file holds no socket rule, so Docker's socket forwards are untouched, and never turns all forwarding off", () => {
  for (const r of override) assert.equal(r.guestSocket, undefined);
  const first = fill(override[0]);
  assert.ok(!(first.ignore && first.range[0] === 1 && first.range[1] === 65535));
});

// lima-override.sh, run on a stand-in Mac: uname says Darwin, and COLIMA_HOME is a scratch folder.
function stage() {
  const dir = mkdtempSync(join(tmpdir(), "lima-override-"));
  const bin = join(dir, "bin");
  mkdirSync(bin);
  writeFileSync(join(bin, "uname"), "#!/bin/sh\necho Darwin\n", { mode: 0o755 });
  const home = join(dir, "colima");
  const run = () => spawnSync("bash", [join(here, "lima-override.sh")], { env: { ...process.env, PATH: `${bin}:/usr/bin:/bin`, COLIMA_HOME: home }, encoding: "utf8" });
  return { dir, dest: join(home, "_lima/_config/override.yaml"), run };
}
const mode = (f) => statSync(f).mode & 0o777;

test("lima-override.sh installs the file as the owner, mode 600, and leaves it when it matches", () => {
  const s = stage();
  const first = s.run();
  assert.equal(first.status, 0, first.stdout + first.stderr);
  assert.match(first.stdout, /installed at .*override\.yaml/);
  assert.match(first.stdout, /sudo launchctl kickstart -k system\/io\.recursica\.colima/, "it prints the restart, and never restarts the VM");
  assert.equal(readFileSync(s.dest, "utf8"), text);
  assert.equal(mode(s.dest), 0o600);
  assert.match(s.run().stdout, /^lima-override\.yaml is unchanged$/m);
  // a wrong mode or changed text installs it again
  chmodSync(s.dest, 0o644);
  assert.match(s.run().stdout, /installed at/);
  assert.equal(mode(s.dest), 0o600);
  writeFileSync(s.dest, text + "# changed\n");
  assert.match(s.run().stdout, /installed at/);
  assert.equal(readFileSync(s.dest, "utf8"), text);
  assert.deepEqual(readdirSync(dirname(s.dest)), ["override.yaml"], "no file left behind");
});

test("lima-override.sh replaces a link, and leaves the file the link pointed to alone", () => {
  const s = stage();
  s.run();
  const target = join(s.dir, "elsewhere");
  writeFileSync(target, "keep\n");
  unlinkSync(s.dest);
  symlinkSync(target, s.dest);
  const r = s.run();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.equal(lstatSync(s.dest).isSymbolicLink(), false);
  assert.equal(readFileSync(s.dest, "utf8"), text);
  assert.equal(readFileSync(target, "utf8"), "keep\n");
});

test("lima-override.sh never runs as root, writes nothing off a Mac, and setup-host installs it before Colima's daemon", () => {
  const script = readFileSync(join(here, "lima-override.sh"), "utf8");
  assert.match(script, /\[ "\$\(id -u\)" != 0 \] \|\| \{ echo "Run lima-override\.sh as the owner/);
  assert.match(script, /mktemp "\$DIR\/override\.yaml\.XXXXXX"/, "a new file, never one a link names");
  assert.doesNotMatch(script, /^\s*(sudo|colima|limactl|launchctl)\b/m, "it starts, stops and restarts nothing");
  const linux = spawnSync("bash", [join(here, "lima-override.sh")], { env: { ...process.env, PATH: "/usr/bin:/bin" }, encoding: "utf8" });
  if (process.platform !== "darwin") assert.match(linux.stdout, /Nothing to do on/);
  const lib = readFileSync(join(here, "lib.sh"), "utf8");
  const at = lib.indexOf('"$kit/lima-override.sh" || return 1');
  assert.ok(at > 0 && at < lib.indexOf("UNIT_EXIT_TIMEOUT=150 install_unit colima"), "installed before the daemon, so a new VM starts with it");
});
