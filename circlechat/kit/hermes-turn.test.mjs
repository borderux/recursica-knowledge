// The test turn (kit/hermes-turn.sh): one agent turn, run the way CircleChat's bridge runs a turn,
// with a stand-in for docker that answers as Hermes does.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const here = path.dirname(new URL(import.meta.url).pathname);
const PINNED = "nousresearch/hermes-agent@sha256:0123abcd";
const SITE = "/opt/hermes/.venv/lib/python3.14/site-packages";

// A stack folder with a .env and one agent home. The docker stand-in prints the image's
// site-packages for the hook lookup, and FAKE_TURN's output for the turn: "answer" is a turn
// Hermes answers, "refuse" a session Hermes refuses, with the hook's detail line, and "provider" a
// model request that failed after the session opened.
function sandbox(env = "") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "hermes-turn-"));
  const bin = path.join(dir, "bin"), log = path.join(dir, "calls.log"), cc = path.join(dir, "circlechat");
  const home = path.join(cc, "hermes-homes/.hermes-betty");
  fs.mkdirSync(bin); fs.mkdirSync(home, { recursive: true });
  fs.writeFileSync(path.join(home, "config.yaml"), "model:\n  default: local-large\n");
  fs.writeFileSync(path.join(cc, ".env"), env);
  fs.writeFileSync(path.join(bin, "docker"), `#!/usr/bin/env bash
echo "docker $*" >> "${log}"
case "$*" in
  *"--entrypoint sh"*) echo ${SITE} ;;
  *" chat -q "*) case "\${FAKE_TURN:-answer}" in
      answer) echo "s6-rc: info: service main-hermes successfully started"; echo ready; echo "session_id: local-1" >&2 ;;
      refuse) echo "hermes refusal: invalid_params {'reason': 'invalid_params', 'fields': ['source']}" >&2
              echo "Hermes couldn't start the model connection: invalid_params. Your message was not"; exit 1 ;;
      provider) echo "session_id: local-1" >&2; echo "custom didn't answer after 3 attempts"; echo "Provider said: HTTP 404: no such route" ;;
    esac ;;
esac
exit 0
`, { mode: 0o755 });
  const turn = (fake, ...args) => spawnSync("bash", [path.join(here, "hermes-turn.sh"), home, ...args], { env: { ...process.env, PATH: `${bin}:${process.env.PATH}`, CC_DIR: cc, FAKE_TURN: fake }, encoding: "utf8" });
  return { dir, cc, home, turn, calls: () => (fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "") };
}

test("the test turn runs the way the bridge runs a turn: the pinned image, the agents' network and filter, the home at /opt/data, and --source tool", () => {
  const s = sandbox(`CC_HERMES_IMAGE=${PINNED}\nCC_AGENT_NETWORK=circlechat_agents\nCC_AGENT_PROXY=http://egress:3128\nCC_AGENT_NO_PROXY=api,cc-gateway\n`);
  const r = s.turn("answer");
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(r.stdout, /^betty: test turn answered\.$/m);
  const turn = s.calls().split("\n").find((l) => l.includes(" chat -q "));
  assert.ok(turn.startsWith("docker run --rm -i --name cc-turn-check-betty-"), turn);
  assert.match(turn, / --network circlechat_agents --dns 127\.0\.0\.1 /);
  for (const k of ["HTTP_PROXY", "HTTPS_PROXY", "http_proxy", "https_proxy"]) assert.ok(turn.includes(` -e ${k}=http://egress:3128 `), k);
  for (const k of ["NO_PROXY", "no_proxy"]) assert.ok(turn.includes(` -e ${k}=api,cc-gateway `), k);
  assert.ok(turn.includes(` -v ${here}/hermes-refusal-detail.py:${SITE}/sitecustomize.py:ro `), "the refusal detail hook is mounted read-only");
  assert.ok(turn.endsWith(` -v ${s.home}:/opt/data ${PINNED} chat -q Reply with the single word: ready -Q --yolo --source tool`), turn);
});

test("without an agents' network, the test turn uses the computer's network, as the bridge does", () => {
  const s = sandbox(`CC_HERMES_IMAGE=${PINNED}\n`);
  assert.equal(s.turn("answer").status, 0);
  const turn = s.calls().split("\n").find((l) => l.includes(" chat -q "));
  assert.match(turn, / --network=host /);
  assert.doesNotMatch(turn, /_PROXY=/);
});

test("a refused session stops with Hermes's refusal detail", () => {
  const s = sandbox(`CC_HERMES_IMAGE=${PINNED}\nCC_AGENT_NETWORK=circlechat_agents\n`);
  const r = s.turn("refuse");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /betty: the test turn failed \(docker run exit 1\)/);
  assert.match(r.stdout, /^ {2}hermes refusal: invalid_params \{'reason': 'invalid_params', 'fields': \['source'\]\}$/m);
  assert.match(r.stdout, /Hermes couldn't start the model connection: invalid_params/);
});

test("a model request that fails after the session opens fails the test turn, though docker run exits 0", () => {
  const s = sandbox(`CC_HERMES_IMAGE=${PINNED}\n`);
  const r = s.turn("provider");
  assert.equal(r.status, 1);
  assert.match(r.stdout, /Hermes gave no refusal detail\./);
  assert.match(r.stdout, /Provider said: HTTP 404: no such route/);
});

test("the test turn never runs an image that is not pinned by digest", () => {
  for (const [env, args, message] of [
    ["", [], /CC_HERMES_IMAGE is not set/],
    ["CC_HERMES_IMAGE=nousresearch/hermes-agent:latest\n", [], /is not pinned by digest/],
    [`CC_HERMES_IMAGE=${PINNED}\n`, ["nousresearch/hermes-agent:latest"], /is not pinned by digest/],
  ]) {
    const s = sandbox(env);
    const r = s.turn("answer", ...args);
    assert.equal(r.status, 1, message.source);
    assert.match(r.stdout, message);
    assert.equal(s.calls(), "", "docker never ran");
  }
});

test("an image given on the command line wins over CC_HERMES_IMAGE", () => {
  const s = sandbox(`CC_HERMES_IMAGE=${PINNED}\n`);
  const next = "nousresearch/hermes-agent@sha256:4567cdef";
  assert.equal(s.turn("answer", next).status, 0);
  assert.ok(s.calls().split("\n").find((l) => l.includes(" chat -q ")).includes(` ${next} chat -q `));
});
