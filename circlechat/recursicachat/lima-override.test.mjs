// lima-override.yaml: the ports the RecursicaChat 2.0 server's Colima VM forwards to the Mac.
//
// The test runs the file's rules, then the rules Colima writes, then Lima's own last rule, through a
// copy of Lima's rule matching. The matching follows Lima v2.3.0's Forwarder.forwardingAddresses
// (pkg/portfwd/forward.go) and FillPortForwardDefaults (pkg/limayaml/defaults.go). Colima's rules
// follow Colima v0.10.3 (environment/vm/lima/yaml.go), with network.hostAddresses off.
//
// On macOS, Lima listens on every address of the Mac for a forward to 127.0.0.1 below port 1024
// (pkg/portfwd/listener_darwin.go), because only root can listen there. So every forward must go to
// 127.0.0.1 at port 1024 or above to stay off the Mac's other addresses.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { render } from "./render.mjs";

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
// Colima's rules for ports, in Colima's order: 0.0.0.0 to 0.0.0.0, then 127.0.0.1 to 127.0.0.1.
const COLIMA = [
  { guestIPMustBeZero: true, guestIP: "0.0.0.0", hostIP: "0.0.0.0", proto: "tcp" },
  { guestIPMustBeZero: true, guestIP: "0.0.0.0", hostIP: "0.0.0.0", proto: "udp" },
  { guestIP: "127.0.0.1", hostIP: "127.0.0.1", proto: "tcp" },
  { guestIP: "127.0.0.1", hostIP: "127.0.0.1", proto: "udp" },
];
const LIMA_LAST = {}; // Lima's own last rule: 127.0.0.1 to 127.0.0.1, TCP and UDP
const unspecified = (ip) => ip === "0.0.0.0" || ip === "::";

/** The Mac address a port the VM opens is forwarded to, or null for no forward. */
function forward(rules, ip, port, proto) {
  for (const r of rules.map(fill)) {
    if (r.proto !== "any" && r.proto !== proto) continue;
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
const withFile = [...override, ...COLIMA, LIMA_LAST];
const without = [...COLIMA, LIMA_LAST];

// Addresses a program in the VM can open a port on: every address, loopback, the VM's own network
// (192.168.5.1, where the VM's DNS server listens) and an IPv6 link-local address.
const GUEST = ["0.0.0.0", "::", "127.0.0.1", "::1", "192.168.5.1", "fe80::1"];

test("without the file, the VM's DNS server and an every-address port reach every address of the Mac", () => {
  assert.equal(forward(without, "127.0.0.1", 53, "tcp"), "127.0.0.1:53", "below 1024, so Lima listens on every address");
  assert.equal(forward(without, "0.0.0.0", 8080, "tcp"), "0.0.0.0:8080");
});

test("port 53 is never forwarded, from any address in the VM, TCP or UDP", () => {
  for (const ip of GUEST) for (const proto of ["tcp", "udp"]) assert.equal(forward(withFile, ip, 53, proto), null, `${ip} ${proto}`);
});

test("every forward goes to 127.0.0.1 at port 1024 or above, and no port below 1024 is forwarded", () => {
  for (const ip of GUEST)
    for (const proto of ["tcp", "udp"])
      for (const port of [1, 22, 53, 80, 443, 1023, 1024, 3000, 8080, 65535]) {
        const to = forward(withFile, ip, port, proto);
        if (to === null) continue;
        assert.equal(to, `127.0.0.1:${port}`, `${ip}:${port} ${proto}`);
        assert.ok(port >= 1024, `${ip}:${port} ${proto} is below 1024`);
      }
});

test("a port at 1024 or above that the VM opens on every address or on loopback still reaches 127.0.0.1", () => {
  for (const ip of ["0.0.0.0", "::", "127.0.0.1", "::1"]) for (const proto of ["tcp", "udp"]) assert.equal(forward(withFile, ip, 8080, proto), "127.0.0.1:8080", `${ip} ${proto}`);
  for (const ip of ["192.168.5.1", "fe80::1"]) assert.equal(forward(withFile, ip, 8080, "tcp"), null, `${ip}: not forwarded, as before`);
});

test("the file never turns off all of Lima's port forwarding", () => {
  // Lima turns off TCP or UDP forwarding when the first rules ignore ports 1 to 65535 (hostagent.go).
  const first = fill(override[0]);
  assert.ok(!(first.ignore && first.range[0] === 1 && first.range[1] === 65535));
  for (const r of override) assert.equal(r.guestSocket, undefined, "the file holds no socket rule");
});

test("render copies the file as it is, and install.sh writes it as the server's account, never as root", () => {
  assert.equal(render({ recursicachat: { google_client_id: "123456-abc123.apps.googleusercontent.com", google_domain: "example.com", public_url: "https://chat.example.ts.net/", node: "/opt/node/v24.0.0/bin/node" } }, { ownerHome: "/Users/owner", kit: "/Users/owner/kit/circlechat", ccDir: "/Users/owner/recursica-stack", ws: "/Users/owner/recursica-workspace" })["lima-override.yaml"], text);
  const install = readFileSync(join(here, "install.sh"), "utf8");
  assert.match(install, /^LIMA_CONFIG="\$RC_HOME\/\.colima\/_lima\/_config"$/m);
  assert.match(install, /^as_server\(\) \{ \/usr\/bin\/sudo -u _recursicachat -H "\$@"; \}$/m);
  assert.match(install, /as_server \/bin\/sh -c 'umask 077 && mkdir -p "\$1" && cat > "\$1\/override\.yaml\.new" && mv -f "\$1\/override\.yaml\.new" "\$1\/override\.yaml"' sh "\$LIMA_CONFIG" < "\$OUT\/lima-override\.yaml"/);
  assert.match(install, /\[ ! -L "\$1" \] && cmp -s - "\$1" && \[ "\$\(stat -f %Lp "\$1"\)" = 600 \]/, "a link, changed text or a wrong mode installs the file again");
  assert.doesNotMatch(install, /install [^\n]*override\.yaml/, "root never writes into the server account's folder");
});
