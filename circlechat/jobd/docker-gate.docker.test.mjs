// jobd and jobd's Docker filter with real Docker: a job runs to the end through the filter, and
// the docker CLI's other calls through the filter are refused. The test needs Docker, and runs only
// with JOBD_GATE_DOCKER_TEST=1, as in the kit's CI (.github/workflows/kit.yml).
import assert from "node:assert/strict";
import { spawn, spawnSync } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { startJobd } from "./test-jobd.mjs";

const on = process.env.JOBD_GATE_DOCKER_TEST === "1";
const here = path.dirname(new URL(import.meta.url).pathname);
const tag = crypto.randomBytes(4).toString("hex");
const IMAGE = `recursica/porter-job-gate-test:${tag}`, NET = `jobs-egress-gate-test-${tag}`, REPO = "https://github.com/acme/adapter-x";
const docker = (args, env = process.env) => spawnSync("docker", args, { encoding: "utf8", env });

test("a job runs through jobd's Docker filter, and every other call is refused", { skip: !on && "set JOBD_GATE_DOCKER_TEST=1 to run with real Docker" }, async (t) => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "docker-gate-real-"));
  fs.chmodSync(tmp, 0o755);
  const workRoot = path.join(tmp, "work"), sock = path.join(tmp, "gate.sock");
  fs.mkdirSync(workRoot); fs.chmodSync(workRoot, 0o2750);

  // A job image whose user is in no group of the computer: the user writes the report through
  // the group the filter adds. The report shows the process's no_new_privs flag.
  const build = path.join(tmp, "image");
  fs.mkdirSync(build);
  fs.writeFileSync(path.join(build, "Dockerfile"), [
    "FROM busybox:1.36",
    "USER 4242:4242",
    `ENTRYPOINT ["sh", "-c", "{ cat /work/package.md; echo; grep NoNewPrivs /proc/self/status; echo TARGET_REPO=$TARGET_REPO; } > /work/report.md"]`,
  ].join("\n"));
  assert.equal(docker(["build", "-q", "-t", IMAGE, build]).status, 0);
  assert.equal(docker(["network", "create", "--internal", NET]).status, 0);

  const cfg = { listen: sock, docker: "/var/run/docker.sock", image: IMAGE, network: NET, memoryBytes: 2 ** 30, nanoCpus: 0, pidsLimit: 256,
    workRoot, groupId: process.getgid(), envNames: ["TARGET_REPO", "PORTER_REPORT", "ANTHROPIC_BASE_URL", "ANTHROPIC_AUTH_TOKEN", "GITHUB_TOKEN_URL", "PORTER_MODEL"] };
  fs.writeFileSync(path.join(tmp, "gate.json"), JSON.stringify(cfg));
  const logs = [];
  const gate = spawn(process.execPath, [path.join(here, "docker-gate.mjs"), path.join(tmp, "gate.json")], { stdio: ["ignore", "pipe", "pipe"] });
  gate.stderr.on("data", (d) => logs.push(String(d)));
  await new Promise((resolve, reject) => { gate.stdout.once("data", resolve); gate.once("exit", (c) => reject(new Error(`the filter stopped: ${logs.join("")}`))); });

  const viaGate = { ...process.env, DOCKER_HOST: `unix://${sock}`, DOCKER_CONTEXT: "" };
  const { proc: jobd, port } = await startJobd(path.join(here, "jobd.mjs"), { ...viaGate,
    JOBD_TOKEN: "t", JOBD_DIR: path.join(tmp, "jobs"), JOBD_WORK_ROOT: workRoot, JOBD_PORTER_IMAGE: IMAGE, JOBD_NETWORK: NET,
    JOBD_MEMORY_GB: "1", JOBD_ALLOWED_REPOS: REPO, JOBD_POLL_MS: "500", JOBD_GATEWAY_URL: "http://cc-gateway:4000", PORTER_MODEL: "sonnet" });
  t.after(() => {
    jobd.kill(); gate.kill();
    const ids = docker(["ps", "-aq", "--filter", "label=io.recursica.jobd=1", "--filter", `ancestor=${IMAGE}`]).stdout.split("\n").filter(Boolean);
    if (ids.length) docker(["rm", "-f", ...ids]);
    docker(["network", "rm", NET]); docker(["rmi", "-f", IMAGE]);
  });

  const call = (method, p, body) => fetch(`http://127.0.0.1:${port}${p}`, { method, headers: { authorization: "Bearer t", "content-type": "application/json" }, body: body && JSON.stringify(body) });
  const r = await call("POST", "/jobs", { type: "porter", repo: REPO, label: "gate test", package: "# Port the new prop", gateway_key: "cct_eyJhIjoicG9ydGVyIn0.c2lnbmF0dXJl" });
  assert.equal(r.status, 201, await r.clone().text());
  const { id } = await r.json();
  let meta;
  for (let i = 0; i < 120; i++) {
    meta = await (await call("GET", `/jobs/${id}`)).json();
    if (meta.status !== "running") break;
    await new Promise((res) => setTimeout(res, 500));
  }
  assert.equal(meta.status, "succeeded", `${JSON.stringify(meta)}\n${logs.join("")}`);
  const report = await (await call("GET", `/jobs/${id}/report`)).text();
  assert.match(report, /^# Port the new prop\n/);
  assert.match(report, /NoNewPrivs:\s+1/, "the filter adds no-new-privileges");
  assert.match(report, new RegExp(`TARGET_REPO=${REPO}`));
  assert.doesNotMatch(logs.join(""), /^refused /m, "jobd's own calls pass the filter");

  // A job's container that stays, for the exec below. The filter creates the container.
  const kept = `job-exec-${tag}`;
  const made = docker(["create", "--name", kept, "--network", NET, "--dns", "127.0.0.1", "--memory", "1g", "--memory-swap", "1g", "-v", `${workRoot}/${kept}:/work`, IMAGE], viaGate);
  assert.equal(made.status, 0, made.stderr);

  // The docker CLI through the filter, as an attacker with jobd's account would use the CLI.
  for (const [what, args] of [
    ["privileged mode", ["run", "--rm", "--privileged", IMAGE]],
    ["the computer's root folder", ["run", "--rm", "-v", "/:/host", IMAGE]],
    ["the host network", ["run", "--rm", "--network", "host", IMAGE]],
    ["an added capability", ["run", "--rm", "--cap-add", "SYS_ADMIN", IMAGE]],
    ["a list of containers", ["ps"]],
    ["an image pull", ["pull", "alpine:3.20"]],
    ["an image build", ["build", "-t", "x", build]],
    ["a shell in a job's container", ["exec", kept, "sh"]],
    ["a job's container with a host folder", ["create", "--name", `job-host-${tag}`, "--network", NET, "--dns", "127.0.0.1", "--memory", "1g", "--memory-swap", "1g", "-v", "/:/work", IMAGE]],
  ]) {
    const out = docker(args, viaGate);
    assert.notEqual(out.status, 0, what);
    assert.match(out.stderr, /refused by jobd's Docker filter/, `${what}: ${out.stderr}`);
  }
  // The filter's log reaches the test through a pipe, a moment after each answer.
  await new Promise((res) => setTimeout(res, 500));
  // One line for each refused call. The docker CLI sends one refused call for each command above.
  const refused = logs.join("").split("\n").filter((l) => l.startsWith("refused "));
  assert.ok(refused.length >= 9, refused.join("\n"));
  assert.ok(!refused.some((l) => l.includes("cct_")), "a refusal never logs the job's gateway key");
});
