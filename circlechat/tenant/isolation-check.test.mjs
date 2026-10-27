// isolation-check.sh: the rows that need no Docker VM. A stand-in docker answers nothing, as on a
// computer where the stack's engine is down, so those rows fail and the check exits 1.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);

function setup() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), "iso-"));
  const bin = path.join(home, "bin");
  fs.mkdirSync(bin);
  fs.writeFileSync(path.join(bin, "docker"), "#!/usr/bin/env bash\nexit 1\n", { mode: 0o755 });
  const site = (dir, ports) => {
    fs.mkdirSync(path.join(home, dir), { recursive: true });
    const [port, preview_port, gateway_port] = ports;
    fs.writeFileSync(path.join(home, dir, "site.json"), JSON.stringify({ site: { port, preview_port, gateway_port } }));
  };
  const run = () => spawnSync("bash", [path.join(here, "isolation-check.sh"), "acme"], {
    env: { ...process.env, HOME: home, PATH: `${bin}:${process.env.PATH}` }, encoding: "utf8",
  });
  return { home, site, run };
}

test("passes the ports row when no other stack uses the stack's ports", () => {
  const { site, run } = setup();
  site("circlechat", [8080, 8081, 8082]);
  site("tenants/acme/circlechat", [9080, 9081, 9082]);
  site("tenants/other/circlechat", [9180, 9181, 9182]);
  const r = run();
  assert.match(r.stdout, /ports 9080 9081 9082 used by no other stack\s+pass/);
  assert.notEqual(r.status, 0, "the Docker rows fail with no engine");
  assert.match(r.stdout, /Docker engine of colima-acme answers\s+FAIL/);
});

test("fails the ports row on a port another stack uses", () => {
  const { site, run } = setup();
  site("tenants/acme/circlechat", [9080, 9081, 9082]);
  site("tenants/other/circlechat", [9180, 9081, 9182]);
  assert.match(run().stdout, /ports used by no other stack\s+FAIL: 9081\(.*tenants\/other/);
});

test("fails the mount row when the Docker VM mounts the home folder", () => {
  const { home, site, run } = setup();
  site("tenants/acme/circlechat", [9080, 9081, 9082]);
  fs.mkdirSync(path.join(home, "tenants/acme/colima/acme"), { recursive: true });
  fs.writeFileSync(path.join(home, "tenants/acme/colima/acme/colima.yaml"), `mounts:\n  - location: ${home}\n    writable: true\n`);
  assert.match(run().stdout, /Docker VM mounts .* only\s+FAIL/);
});
