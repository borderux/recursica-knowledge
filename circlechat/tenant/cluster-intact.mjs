#!/usr/bin/env node
// After a client or demo stack is removed: does the cluster's own stack still run on this computer?
// offboard.sh check runs this. One line per check, "<what><TAB>pass" or "<what><TAB>FAIL: <why>".
//
//   node cluster-intact.mjs <the cluster's site.json> <this computer's name in it>
//
// Checks each port the cluster's own stack serves here (each model server, Kev's model and the job
// runner), each service the cluster's stack starts here, and on the control computer the gateway.
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import net from "node:net";

const answers = (port) => new Promise((resolve) => {
  const s = net.connect({ host: "127.0.0.1", port, timeout: 3000 });
  s.once("connect", () => { s.destroy(); resolve(true); });
  s.once("error", () => resolve(false));
  s.once("timeout", () => { s.destroy(); resolve(false); });
});

function unitRuns(name) {
  if (process.platform === "darwin") return spawnSync("launchctl", ["print", `system/io.recursica.${name}`], { stdio: "ignore" }).status === 0;
  const r = spawnSync("systemctl", ["is-active", "--quiet", name], { stdio: "ignore" });
  return r.error ? null : r.status === 0;
}

export async function checks(site, computer) {
  const me = (site.nodes ?? []).find((n) => n.name === computer);
  if (!me) return [[`computer ${computer}`, `FAIL: not in the cluster's site.json`]];
  const out = [];
  const ports = [
    ...(me.servers ?? []).map((sv) => [`model server ${sv.id} (port ${sv.port})`, sv.port]),
    ...(me.models ?? []).map((m) => [`model ${m.id} (port ${m.port})`, m.port]),
    ...(me.kev?.port ? [[`Kev's model (port ${me.kev.port})`, me.kev.port]] : []),
    ...(me.jobs?.port ? [[`job runner (port ${me.jobs.port})`, me.jobs.port]] : []),
  ];
  for (const [what, port] of ports) out.push([`the cluster's ${what}`, (await answers(port)) ? "pass" : "FAIL: no answer"]);
  for (const name of [...(me.services ?? []).map((s) => s.name), ...(me.jobs ? ["jobd"] : [])]) {
    const runs = unitRuns(name);
    if (runs !== null) out.push([`the cluster's service ${name}`, runs ? "pass" : "FAIL: not running"]);
  }
  if (me.control) {
    const env = { ...process.env }; delete env.DOCKER_CONTEXT;
    const ps = spawnSync("docker", ["ps", "--format", "{{.Names}}"], { encoding: "utf8", env });
    out.push(["the cluster's model gateway", (ps.stdout ?? "").split("\n").includes("cc-gateway") ? "pass" : "FAIL: cc-gateway is not running"]);
  }
  return out;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [file, computer] = process.argv.slice(2);
  const site = JSON.parse(fs.readFileSync(file, "utf8"));
  for (const [what, result] of await checks(site, computer)) console.log(`${what}\t${result}`);
}
