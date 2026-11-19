// kit/rc-sync.mjs and rc-sync.sh against stand-ins: a small RecursicaChat 2.0 in this file, with only
// the routes the sync uses, and stand-ins for sudo and the server's CLI. Nothing here reaches Docker,
// a model, the tailnet or a real server: the one HTTP server listens on 127.0.0.1 only, on a port the
// system picks.
import { test } from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { MAX_INSTRUCTIONS, apiClient, changes, main, syncAgents, tokenFrom, wanted, wrapperSettings } from "./rc-sync.mjs";
import { recursicachatErrors, validate } from "./render.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const kitRoot = path.resolve(here, "..", "..");
const TOKEN = "tok_standin_0123456789abcdef";

// A kit with one agent, `standin`, in a folder of its own.
function kit({ instructions = "You are Standin.\n", run = { autonomy: "ask", sandbox: "docker" } } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-sync-kit-"));
  fs.mkdirSync(path.join(dir, "portable", "recursicachat", "agents", "standin"), { recursive: true });
  if (instructions !== null) fs.writeFileSync(path.join(dir, "portable", "recursicachat", "agents", "standin", "INSTRUCTIONS.md"), instructions);
  fs.mkdirSync(path.join(dir, "agents", "standin", "runtime"), { recursive: true });
  if (run) fs.writeFileSync(path.join(dir, "agents", "standin", "runtime", "recursicachat.json"), JSON.stringify(run));
  return dir;
}

const site = (extra = {}) => ({
  site: { public_host: "chat.example.com" },
  routes: { "local-large": ["box/ollama/large"] },
  agents: { standin: { routes: ["local-large"], cloud: false, recursicachat: { model: "cluster:local-large", budget_usd: 5 } } },
  recursicachat: { account: "agent-sync@example.com" },
  ...extra,
});

// A stand-in RecursicaChat 2.0 with the sync's account and the agents given.
async function standIn({ role = "builder", agents = {} } = {}) {
  const s = { calls: [], agents: structuredClone(agents) };
  const server = http.createServer(async (req, res) => {
    let body = "";
    for await (const c of req) body += c;
    const json = (code, v) => { res.statusCode = code; res.setHeader("content-type", "application/json"); res.end(JSON.stringify(v)); };
    s.calls.push({ method: req.method, url: req.url, auth: req.headers.authorization, cookie: req.headers.cookie, body: body ? JSON.parse(body) : undefined });
    if (req.headers.authorization !== `Bearer ${TOKEN}`) return json(401, { error: "sign in" });
    if (req.url === "/api/me") return json(200, { user: { email: "agent-sync@example.com", role } });
    const m = /^\/api\/agents\/([^/]+)$/.exec(req.url);
    const a = m && Object.values(s.agents).find((x) => x.id === m[1] || x.handle === m[1]);
    if (!a) return json(404, { error: "no such agent" });
    if (req.method === "GET") return json(200, { agent: a });
    if (req.method === "PATCH") {
      if (role !== "builder" && role !== "admin" && role !== "owner") return json(403, { error: "Only builders and above can do that" });
      Object.assign(a, JSON.parse(body));
      return json(200, { agent: a });
    }
    return json(405, { error: "no" });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  const base = `http://127.0.0.1:${server.address().port}`;
  return { s, base, api: apiClient({ base, token: TOKEN }), close: () => new Promise((r) => server.close(r)) };
}

const agentLike = (want, extra = {}) => ({ id: "a_standin", handle: "standin", ...want, ...extra });

test("wanted: the instructions from the built file, autonomy and sandbox from the kit, model and budget from site.json", () => {
  const w = wanted(site(), "standin", kit());
  assert.deepEqual(w, { instructions: "You are Standin.\n", model: "cluster:local-large", autonomy: "ask", sandbox: "docker", budgetCents: 500 });
});

test("wanted refuses missing instructions, instructions the server would cut, a token left in, and a missing or wrong runtime file", () => {
  assert.throws(() => wanted(site(), "standin", kit({ instructions: null })), /no RecursicaChat instructions for standin/);
  assert.throws(() => wanted(site(), "standin", kit({ instructions: "x".repeat(MAX_INSTRUCTIONS + 1) })), /server keeps only 20000/);
  assert.throws(() => wanted(site(), "standin", kit({ instructions: "Repo {{KNOWLEDGE_REPO_NAME}}" })), /still hold the token/);
  assert.throws(() => wanted(site(), "standin", kit({ instructions: "App @APP_REPO@" })), /still hold the token/);
  assert.throws(() => wanted(site(), "standin", kit({ run: null })), /runtime\/recursicachat\.json/);
  assert.throws(() => wanted(site(), "standin", kit({ run: { autonomy: "yolo", sandbox: "docker" } })), /autonomy must be/);
  assert.throws(() => wanted(site(), "standin", kit({ run: { autonomy: "ask", sandbox: "vm" } })), /sandbox must be/);
});

test("changes lists only the settings that differ", () => {
  const want = { instructions: "a", model: "p:m", autonomy: "ask", sandbox: "docker", budgetCents: 500 };
  assert.deepEqual(changes(want, want), {});
  assert.deepEqual(changes({ ...want, model: "p:other", budgetCents: 0 }, want), { model: "p:m", budgetCents: 500 });
});

test("the sync sends only what differs, as a builder, with a Bearer header and no cookie; a second run changes nothing", async () => {
  const dir = kit();
  const want = wanted(site(), "standin", dir);
  const st = await standIn({ agents: { standin: agentLike(want, { instructions: "pasted by hand", budgetCents: 0 }) } });
  try {
    const out = [];
    assert.equal(await syncAgents({ api: st.api, site: site(), kitRoot: dir, log: (l) => out.push(l) }), 0);
    const patches = st.s.calls.filter((c) => c.method === "PATCH");
    assert.equal(patches.length, 1);
    assert.deepEqual(Object.keys(patches[0].body).sort(), ["budgetCents", "instructions"], "the model and the sandbox are left alone, so the agent does not restart");
    assert.ok(st.s.calls.every((c) => c.auth === `Bearer ${TOKEN}` && c.cookie === undefined));
    assert.deepEqual(out, ["standin: set instructions, monthly budget"]);

    st.s.calls.length = 0;
    const again = [];
    assert.equal(await syncAgents({ api: st.api, site: site(), kitRoot: dir, log: (l) => again.push(l) }), 0);
    assert.equal(st.s.calls.filter((c) => c.method === "PATCH").length, 0);
    assert.deepEqual(again, ["standin: up to date"]);
  } finally {
    await st.close();
  }
});

test("--check reports what would change and changes nothing", async () => {
  const dir = kit();
  const st = await standIn({ agents: { standin: agentLike(wanted(site(), "standin", dir), { model: "cluster:other" }) } });
  try {
    const out = [];
    assert.equal(await syncAgents({ api: st.api, site: site(), kitRoot: dir, check: true, log: (l) => out.push(l) }), 0);
    assert.equal(st.s.calls.filter((c) => c.method === "PATCH").length, 0);
    assert.deepEqual(out, ["standin: would set model"]);
  } finally {
    await st.close();
  }
});

test("the sync refuses an account that is not a builder, before any change", async () => {
  for (const role of ["member", "admin", "owner"]) {
    const dir = kit();
    const st = await standIn({ role, agents: { standin: agentLike(wanted(site(), "standin", dir), { instructions: "" }) } });
    try {
      await assert.rejects(syncAgents({ api: st.api, site: site(), kitRoot: dir, log: () => {} }), /must be a builder/);
      assert.equal(st.s.calls.filter((c) => c.method === "PATCH").length, 0, role);
    } finally {
      await st.close();
    }
  }
});

test("an agent missing on the server fails, and the other agents still sync", async () => {
  const dir = kit();
  const twoAgents = site();
  twoAgents.agents.absent = { recursicachat: { model: "cluster:local-large", budget_usd: 1 } };
  const st = await standIn({ agents: { standin: agentLike(wanted(site(), "standin", dir), { instructions: "" }) } });
  try {
    const out = [];
    assert.equal(await syncAgents({ api: st.api, site: twoAgents, kitRoot: dir, log: (l) => out.push(l) }), 1);
    assert.ok(out.some((l) => /^absent: FAILED: /.test(l)));
    assert.ok(out.includes("standin: set instructions"));
  } finally {
    await st.close();
  }
});

test("main: the token comes from stdin only, and no output line holds the token or the instructions", async () => {
  const dir = kit({ instructions: "SECRET-LOOKING INSTRUCTIONS\n" });
  const st = await standIn({ agents: { standin: agentLike({ model: "cluster:local-large", autonomy: "ask", sandbox: "docker", budgetCents: 500, instructions: "" }) } });
  const file = path.join(dir, "site.json");
  fs.writeFileSync(file, JSON.stringify(site({ recursicachat: { account: "agent-sync@example.com", url: st.base } })));
  try {
    // main reads the kit beside the script, so this run points at the real kit: standin has no
    // instructions there, and the sync fails for that agent without a change.
    const out = [];
    const code = await main(["sync", file], { stdin: Readable.from([`${TOKEN}\n`]), env: {}, log: (l) => out.push(l) });
    assert.equal(code, 1);
    assert.doesNotMatch(out.join("\n"), new RegExp(TOKEN));
    assert.doesNotMatch(out.join("\n"), /SECRET-LOOKING/);
    assert.equal(await main(["sync", file], { stdin: Readable.from([""]), env: {}, log: () => {} }), 2, "no token: a setup error");
    await assert.rejects(tokenFrom(Readable.from(["not a token!"])), /No session token/);
  } finally {
    await st.close();
  }
});

test("wrapperSettings fills in the defaults, and is empty without a recursicachat block", () => {
  assert.deepEqual(wrapperSettings(site()), ["agent-sync@example.com", "http://127.0.0.1:3100", "/opt/recursicachat/app", "/opt/recursicachat/data", "", ""]);
  assert.deepEqual(wrapperSettings({}), ["", "", "", "", "", ""]);
});

test("site.json: the recursicachat block and each agent's settings are checked", () => {
  assert.deepEqual(recursicachatErrors(site()), []);
  assert.deepEqual(recursicachatErrors({}), []);
  const bad = (change) => { const s = site(); change(s); return recursicachatErrors(s).join("\n"); };
  assert.match(bad((s) => delete s.recursicachat), /needs a recursicachat block/);
  assert.match(bad((s) => (s.recursicachat.account = "not an email")), /recursicachat\.account must be/);
  assert.match(bad((s) => { s.cloud_approvers = [{ email: "agent-sync@example.com" }]; }), /made only for the sync/);
  assert.match(bad((s) => (s.site.tenant = "acme")), /cluster's own stack only/);
  assert.match(bad((s) => (s.recursicachat.url = "chat.example.com")), /recursicachat\.url/);
  assert.match(bad((s) => (s.recursicachat.vault_key_file = "master.key")), /vault_key_file must be an absolute path/);
  assert.match(bad((s) => (s.recursicachat.node = "/opt/recursicachat/node/bin/node")), /outside the server's folder/);
  assert.match(bad((s) => (s.agents.standin.recursicachat.model = "local-large")), /<provider id>:<model>/);
  assert.match(bad((s) => (s.agents.standin.recursicachat.model = "anthropic:claude-sonnet-5-5")), /cloud switch is off/);
  assert.match(bad((s) => (s.agents.standin.recursicachat.budget_usd = 0)), /budget_usd/);
  assert.match(bad((s) => (s.agents.standin.recursicachat.autonomy = "auto")), /autonomy is not a setting/);
  const cloudOn = site();
  cloudOn.agents.standin.cloud = true;
  cloudOn.agents.standin.recursicachat.model = "anthropic:claude-sonnet-5-5";
  assert.deepEqual(recursicachatErrors(cloudOn), [], "with the cloud switch on, any provider's model may be named");
  assert.ok(validate(site({ recursicachat: { account: "bad" } })).some((e) => /recursicachat\.account/.test(e)), "validate runs the check");
});

// rc-sync.sh with stand-ins: sudo runs the command it is given; the server's CLI prints a token for
// `session` and records each call; the sync's Node records what reached it.
function wrapper({ syncExit = 0, sessionFails = false, nodeMajor = 24, keyFile = true, settings = {} } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-sync-"));
  const log = path.join(dir, "calls.log");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  const script = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  script("sudo", `[ "$1" = -v ] && exit 0; echo "sudo $*" >> "${log}"; exec "$@"`);
  // The server's CLI: argv is <cli.ts> <command> <email> [...].
  script("server-node", `[ "$1" = -p ] && { echo ${nodeMajor}; exit 0; }; echo "cli $2 $3 $4 $5 data=$CIRCLECHAT_DATA key=\${CIRCLECHAT_MASTER_KEY:-none}" >> "${log}"; if [ "$2" = session ]; then ${sessionFails ? "exit 2" : `echo ${TOKEN}`}; fi; exit 0`);
  // The kit's Node: runs `settings` for real, and records the `sync` call.
  script("kit-node", `if [ "$2" = settings ]; then exec "${process.execPath}" "$@"; fi; t="$(cat)"; echo "sync url=$RC_URL stdin=$t args=$*" >> "${log}"; exit ${syncExit}`);
  const key = path.join(dir, "vault.key");
  fs.writeFileSync(key, "vault-key-standin\n");
  const siteFile = path.join(dir, "site.json");
  fs.writeFileSync(siteFile, JSON.stringify(site({ recursicachat: { account: "agent-sync@example.com", app: path.join(dir, "srv", "app"), data: path.join(dir, "srv", "data"), node: path.join(bin, "server-node"), ...(keyFile ? { vault_key_file: key } : {}), ...settings } })));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, SITE: siteFile, KIT_NODE: path.join(bin, "kit-node") };
  const r = spawnSync("bash", [path.join(here, "../rc-sync.sh")], { env, encoding: "utf8" });
  return { r, calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "" };
}

test("rc-sync.sh pipes a 5-minute session's token into the sync, hands the vault key to the CLI as root, and ends the sessions", () => {
  const { r, calls } = wrapper();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(calls, /^sudo \/bin\/sh -c /m, "the CLI runs under sudo");
  assert.match(calls, /^cli session agent-sync@example\.com --minutes 5 data=\S+\/srv\/data key=vault-key-standin$/m);
  assert.match(calls, /^sync url=http:\/\/127\.0\.0\.1:3100 stdin=tok_standin_0123456789abcdef args=\S+rc-sync\.mjs sync \S+site\.json$/m, "the token arrives on stdin, never as an argument");
  assert.match(calls, /^sync (.*\n)*cli end-sessions agent-sync@example\.com/m, "the sessions end after the sync");
  assert.doesNotMatch(calls.split("\n").filter((l) => l.startsWith("sudo")).join("\n"), /vault-key-standin/, "the key is never an argument");
  assert.doesNotMatch(r.stdout + r.stderr, /tok_standin|vault-key-standin/);
});

test("rc-sync.sh without a vault key file lets the CLI read the data folder's key", () => {
  const { r, calls } = wrapper({ keyFile: false });
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(calls, /^cli session \S+ --minutes 5 data=\S+ key=none$/m);
});

test("rc-sync.sh ends the sessions after a failed sync or a failed CLI, and keeps the sync's exit code", () => {
  const failed = wrapper({ syncExit: 1 });
  assert.equal(failed.r.status, 1);
  assert.match(failed.calls, /cli end-sessions/);
  const noSession = wrapper({ sessionFails: true });
  assert.notEqual(noSession.r.status, 0);
  assert.match(noSession.calls, /cli end-sessions/);
});

test("rc-sync.sh refuses a CLI Node older than 24, and does nothing without a recursicachat block", () => {
  const old = wrapper({ nodeMajor: 22 });
  assert.equal(old.r.status, 2);
  assert.match(old.r.stdout, /needs Node 24 or newer/);
  assert.doesNotMatch(old.calls, /cli session/);

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-sync-none-"));
  const siteFile = path.join(dir, "site.json");
  const plain = site();
  delete plain.recursicachat;
  delete plain.agents.standin.recursicachat;
  fs.writeFileSync(siteFile, JSON.stringify(plain));
  const none = spawnSync("bash", [path.join(here, "../rc-sync.sh")], { env: { ...process.env, SITE: siteFile }, encoding: "utf8" });
  assert.equal(none.status, 0, none.stdout + none.stderr);
  assert.match(none.stdout, /no recursicachat block/);
});

test("Loki's RecursicaChat instructions are built, fit the server, and the kit has Loki's autonomy and sandbox", () => {
  const w = wanted({ agents: { loki: { recursicachat: { model: "cluster:local-large", budget_usd: 5 } } } }, "loki", kitRoot);
  assert.ok(w.instructions.length <= MAX_INSTRUCTIONS);
  assert.match(w.instructions, /SYNTHETIC — generated by Loki/);
  assert.equal(w.autonomy, "ask");
  assert.equal(w.sandbox, "docker");
});
