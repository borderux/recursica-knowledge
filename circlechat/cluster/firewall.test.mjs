// The firewall rules and the outgoing filter's config, checked by the tools that load them. Each
// test skips when its tool is missing; CI installs nftables and Squid.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import http from "node:http";
import net from "node:net";
import { spawn, spawnSync } from "node:child_process";
import { render } from "../kit/render.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const has = (cmd) => spawnSync("bash", ["-c", `command -v ${cmd}`]).status === 0;
const asRoot = (args) => (process.getuid?.() === 0 ? args : ["sudo", "-n", ...args]);

test("the Linux firewall rules parse", { skip: !has("nft") && "nftables is not installed" }, (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "nft-"));
  fs.writeFileSync(path.join(tmp, "base.nft"), fs.readFileSync(path.join(here, "firewall/nft-base.nft"), "utf8").replaceAll("@CANARY_PORTS@", "2222, 2121, 8088"));
  for (const f of [path.join(tmp, "base.nft"), path.join(here, "firewall/nft-lockdown.nft")]) {
    const [cmd, ...args] = asRoot(["nft", "-c", "-f", f]);
    const r = spawnSync(cmd, args, { encoding: "utf8" });
    if (/Operation not permitted|password is required/.test(r.stderr)) return t.skip("nft -c needs root here");
    assert.equal(r.status, 0, `${f}: ${r.stderr}`);
  }
});

const example = JSON.parse(fs.readFileSync(path.join(here, "../site.example.json"), "utf8"));
function squidFiles() {
  const r = render(example);
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "squid-"));
  fs.chmodSync(dir, 0o755);   // Squid reads the files as its own account, after dropping root
  fs.mkdirSync(path.join(dir, "log"));
  fs.chmodSync(path.join(dir, "log"), 0o777);
  fs.writeFileSync(path.join(dir, "allow.txt"), r.egress.allow);
  fs.writeFileSync(path.join(dir, "allow-once.txt"), "nothing.invalid\n");
  return { dir, conf: r.egress.conf.replaceAll("/etc/egress", dir).replace("/var/log/egress", path.join(dir, "log")).replace("deny_info ERR_EGRESS_BLOCKED all", "deny_info ERR_ACCESS_DENIED all") };
}

test("the outgoing filter's config parses", { skip: !has("squid") && "Squid is not installed" }, () => {
  const { dir, conf } = squidFiles();
  fs.writeFileSync(path.join(dir, "squid.conf"), conf);
  const r = spawnSync("squid", ["-k", "parse", "-f", path.join(dir, "squid.conf")], { encoding: "utf8" });
  assert.equal(r.status, 0, r.stderr);
  assert.doesNotMatch(r.stderr, /ERROR|FATAL/);
});

test("the running filter refuses a site that is not on the list, and logs the refusal", { skip: !has("squid") && "Squid is not installed" }, async () => {
  const { dir, conf } = squidFiles();
  const port = await new Promise((resolve) => { const s = net.createServer().listen(0, () => { const p = s.address().port; s.close(() => resolve(p)); }); });
  fs.writeFileSync(path.join(dir, "squid.conf"), conf.replace("http_port 3128", `http_port 127.0.0.1:${port}`));
  const squid = spawn("squid", ["-N", "-f", path.join(dir, "squid.conf")], { stdio: ["ignore", "ignore", "pipe"] });
  let err = ""; squid.stderr.on("data", (d) => (err += d));
  try {
    let status = 0;
    for (let i = 0; i < 120 && !status; i++) {
      await new Promise((r) => setTimeout(r, 250));
      status = await new Promise((resolve) => {
        const req = http.request({ host: "127.0.0.1", port, method: "GET", path: "http://blocked.example.invalid/" }, (res) => { res.resume(); resolve(res.statusCode); });
        req.on("error", () => resolve(0)); req.end();
      });
    }
    assert.equal(status, 403, `Squid did not answer: ${err.slice(-500)}`);
    await new Promise((r) => setTimeout(r, 500));
    assert.match(fs.readFileSync(path.join(dir, "log/access.log"), "utf8"), /blocked\.example\.invalid\/ 403 TCP_DENIED/);
  } finally { squid.kill("SIGKILL"); }
});
