// kit/rc-sync.mjs and rc-sync.sh against stand-ins: a stand-in for the server's root-only CLI that
// keeps its state in a folder, a pass-through sudo, and a stand-in for the key step. Nothing here
// reaches Docker, a model, the tailnet or a real server.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { Readable } from "node:stream";
import { MAX_INSTRUCTIONS, main, rootAgents, wanted, warnings, wrapperSettings } from "./rc-sync.mjs";
import { recursicachatErrors, validate } from "./render.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
const kitRoot = path.resolve(here, "..", "..");

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
  site: { public_host: "chat.example.com", gateway_local_port: 4005 },
  routes: { "local-large": ["box/ollama/large"], "local-small": ["box/ollama/small"] },
  agents: { standin: { routes: ["local-large"], cloud: false, recursicachat: { model: "local-large", budget_usd: 5 } } },
  recursicachat: {},
  ...extra,
});
const sink = () => { const s = { text: "", write: (t) => { s.text += t; } }; return s; };

test("wanted: the instructions from the built file, autonomy and sandbox from the kit, the route and budget from site.json, on the agent's own provider", () => {
  const w = wanted(site(), "standin", kit());
  assert.deepEqual(w, { instructions: "You are Standin.\n", model: "gw-standin:local-large", autonomy: "ask", sandbox: "docker", budgetCents: 500 });
});

test("wanted refuses missing instructions, instructions the server would refuse, a token left in, and a missing or wrong runtime file", () => {
  assert.throws(() => wanted(site(), "standin", kit({ instructions: null })), /no RecursicaChat instructions for standin/);
  assert.throws(() => wanted(site(), "standin", kit({ instructions: "x".repeat(MAX_INSTRUCTIONS + 1) })), /server keeps only 20000/);
  assert.throws(() => wanted(site(), "standin", kit({ instructions: "Repo {{KNOWLEDGE_REPO_NAME}}" })), /still hold the token/);
  assert.throws(() => wanted(site(), "standin", kit({ instructions: "App @APP_REPO@" })), /still hold the token/);
  assert.throws(() => wanted(site(), "standin", kit({ run: null })), /runtime\/recursicachat\.json/);
  assert.throws(() => wanted(site(), "standin", kit({ run: { autonomy: "yolo", sandbox: "docker" } })), /autonomy must be/);
  assert.throws(() => wanted(site(), "standin", kit({ run: { autonomy: "ask", sandbox: "vm" } })), /sandbox must be/);
});

test("main want prints the JSON agent-set reads, and fails without printing for an agent the kit cannot build", async () => {
  const dir = kit();
  const file = path.join(dir, "site.json");
  fs.writeFileSync(file, JSON.stringify(site()));
  const out = sink();
  assert.equal(await main(["want", file, "standin"], { out: out.write, log: () => {}, kitRoot: dir }), 0);
  assert.deepEqual(JSON.parse(out.text), wanted(site(), "standin", dir));
  const none = sink();
  const err = [];
  assert.equal(await main(["want", file, "standin"], { out: none.write, log: (l) => err.push(l), kitRoot: kit({ instructions: null }) }), 1);
  assert.equal(none.text, "");
  assert.match(err.join(), /no RecursicaChat instructions/);
  assert.equal(await main(["nonsense"], { log: () => {} }), 2);
});

test("warnings: an agent whose model names no provider, or another agent's gw- provider", async () => {
  const models = "standin\tgw-standin:local-large\nunpinned\tlarge\nborrower\tgw-standin:local-large\npinned\tacme:large\n";
  const w = warnings(models);
  assert.equal(w.length, 2);
  assert.match(w[0], /warning: @unpinned's model names no provider/);
  assert.match(w[1], /warning: @borrower's model uses gw-standin, another agent's gateway key/);
  const dir = kit();
  const file = path.join(dir, "site.json");
  fs.writeFileSync(file, JSON.stringify(site()));
  const out = sink();
  assert.equal(await main(["warn", file], { stdin: Readable.from([models]), out: out.write, log: () => {} }), 0);
  assert.equal(out.text, w.join("\n") + "\n");
});

test("wrapperSettings: the server's folders, the vault key, the Node and the gateway; and a note while site.json names the old account", () => {
  assert.deepEqual(wrapperSettings(site()), ["/opt/recursicachat/app", "/opt/recursicachat/data", "", "", "http://127.0.0.1:4005/v1", ""]);
  assert.equal(wrapperSettings(site({ recursicachat: { account: "agent-sync@example.com" } }))[5], "account");
  assert.deepEqual(wrapperSettings({}), ["", "", "", "", "", ""]);
});

test("rootAgents: each agent's handle, gateway handle, provider, model and routes, for the key step", () => {
  const s = site();
  s.agents.other = { recursicachat: { model: "local-small", budget_usd: 1 } };
  s.agents.plain = { routes: ["local-small"] };
  assert.deepEqual(rootAgents(s), [
    ["standin", "rc-standin", "gw-standin", "local-large", "local-large"],
    ["other", "rc-other", "gw-other", "local-small", "local-large,local-small"],
  ]);
});

test("site.json: the recursicachat block and each agent's settings are checked, and the old account is no longer needed", () => {
  assert.deepEqual(recursicachatErrors(site()), []);
  assert.deepEqual(recursicachatErrors(site({ recursicachat: { account: "anything" } })), [], "the old account is ignored");
  assert.deepEqual(recursicachatErrors({}), []);
  const bad = (change) => { const s = site(); change(s); return recursicachatErrors(s).join("\n"); };
  assert.match(bad((s) => delete s.recursicachat), /needs a recursicachat block/);
  assert.match(bad((s) => (s.site.tenant = "acme")), /cluster's own stack only/);
  assert.match(bad((s) => (s.recursicachat.url = "chat.example.com")), /recursicachat\.url/);
  assert.match(bad((s) => (s.recursicachat.vault_key_file = "master.key")), /vault_key_file must be an absolute path/);
  assert.match(bad((s) => (s.recursicachat.node = "/opt/recursicachat/node/bin/node")), /outside the server's folder/);
  assert.match(bad((s) => (s.agents.standin.recursicachat.model = "cluster:local-large")), /must be one of standin's routes/);
  assert.match(bad((s) => delete s.site.gateway_local_port), /needs site\.gateway_local_port/);
  assert.match(bad((s) => (s.agents["rc-standin"] = { routes: ["local-large"] })), /handles starting with rc- belong to the RecursicaChat 2\.0 server's agents/);
  assert.match(bad((s) => (s.agents.standin.recursicachat.budget_usd = 0)), /budget_usd/);
  assert.match(bad((s) => (s.agents.standin.recursicachat.autonomy = "auto")), /autonomy is not a setting/);
  assert.ok(validate(site({ recursicachat: { node: "relative" } })).some((e) => /recursicachat\.node/.test(e)), "validate runs the check");
});

// rc-sync.sh with stand-ins. The server's CLI keeps its state in files: the provider's key hash,
// whether the agent is managed, and the settings agent-set received. The key step's stand-in issues
// NEW_KEY. Every CLI call is recorded, with what reached its stdin.
const NEW_KEY = "ccg_" + "ab".repeat(24);
function wrapper({ nodeMajor = 24, keyFile = true, stored = "h1", recorded = "h1", issueFails = false, managed = false, account = false, setFails = false, args = [] } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-sync-"));
  const log = path.join(dir, "calls.log");
  const bin = path.join(dir, "bin");
  fs.mkdirSync(bin);
  if (managed) fs.writeFileSync(path.join(dir, "managed"), "");
  const script = (name, body) => { fs.writeFileSync(path.join(bin, name), `#!/usr/bin/env bash\n${body}\n`); fs.chmodSync(path.join(bin, name), 0o755); };
  script("sudo", `[ "$1" = -v ] && exit 0; echo "sudo $*" >> "${log}"; exec "$@"`);
  // The server's CLI: argv is <cli.ts> <command> [args...].
  script("server-node", [
    `[ "$1" = -p ] && { echo ${nodeMajor}; exit 0; }`,
    `cmd="$2"; shift 2`,
    `case "$cmd" in`,
    `  provider-key-hash) echo "cli provider-key-hash $* key=\${CIRCLECHAT_MASTER_KEY:-none}" >> "${log}"; ${stored ? `echo ${stored}` : "true"} ;;`,
    `  set-provider) k="$(cat)"; echo "cli set-provider $* stdin=$k" >> "${log}" ;;`,
    `  agent-get) echo "cli agent-get $*" >> "${log}"; if [ -f "${dir}/managed" ]; then echo '{"handle":"standin","managed":true}'; else echo '{"handle":"standin","managed":false}'; fi ;;`,
    `  manage) echo "cli manage $*" >> "${log}"; touch "${dir}/managed" ;;`,
    `  agent-set) j="$(cat)"; printf '%s' "$j" > "${dir}/set.json"; echo "cli agent-set $*" >> "${log}"; ${setFails ? `echo "the model gw-standin:local-large names the provider \\"gw-standin\\", which the server does not have" >&2; exit 3` : `echo "\${2:+would }set model"`} ;;`,
    `  agent-models) echo "cli agent-models" >> "${log}"; printf 'standin\\tgw-standin:local-large\\nunpinned\\tlarge\\n' ;;`,
    `  *) echo "cli $cmd $*" >> "${log}" ;;`,
    `esac`,
  ].join("\n"));
  script("kit-node", [
    `case "$(basename "$1") $2" in`,
    `  "rc-gateway-key.mjs hash") echo "gwkey hash $4" >> "${log}"; ${recorded ? `echo ${recorded}` : "true"} ;;`,
    `  "rc-gateway-key.mjs issue") echo "gwkey issue $4 $5 $6 $7" >> "${log}"; ${issueFails ? `echo "rc-standin's new key failed the check, and is revoked" >&2; exit 1` : `echo ${NEW_KEY}`} ;;`,
    `  *) exec "${process.execPath}" "$@" ;;`,
    `esac`,
  ].join("\n"));
  // The kit's script reads the instructions beside itself: the real kit has none for standin, so the
  // wrapper uses Loki, whose instructions the real kit builds.
  const key = path.join(dir, "vault.key");
  fs.writeFileSync(key, "vault-key-standin\n");
  const s = site({ recursicachat: { app: path.join(dir, "srv", "app"), data: path.join(dir, "srv", "data"), node: path.join(bin, "server-node"), ...(keyFile ? { vault_key_file: key } : {}), ...(account ? { account: "agent-sync@example.com" } : {}) } });
  s.agents = { loki: { routes: ["local-large"], cloud: false, recursicachat: { model: "local-large", budget_usd: 5 } } };
  const siteFile = path.join(dir, "site.json");
  fs.writeFileSync(siteFile, JSON.stringify(s));
  const env = { ...process.env, PATH: `${bin}:${process.env.PATH}`, SITE: siteFile, KIT_NODE: path.join(bin, "kit-node"), GW_STATE: path.join(dir, "gateway-state") };
  const r = spawnSync("bash", [path.join(here, "../rc-sync.sh"), ...args], { env, encoding: "utf8" });
  const set = fs.existsSync(path.join(dir, "set.json")) ? fs.readFileSync(path.join(dir, "set.json"), "utf8") : "";
  return { r, calls: fs.existsSync(log) ? fs.readFileSync(log, "utf8") : "", set };
}

test("rc-sync.sh marks the agent managed and sets the five settings through the CLI, with JSON on stdin, and no session", () => {
  const { r, calls, set } = wrapper();
  assert.equal(r.status, 0, r.stdout + r.stderr);
  assert.match(calls, /^cli manage loki$/m);
  assert.match(calls, /^cli manage loki\n(.*\n)*cli agent-set loki$/m, "managed before the settings");
  assert.deepEqual(Object.keys(JSON.parse(set)).sort(), ["autonomy", "budgetCents", "instructions", "model", "sandbox"]);
  assert.equal(JSON.parse(set).model, "gw-loki:local-large");
  assert.match(r.stdout, /^loki: marked managed$/m);
  assert.match(r.stdout, /^loki: set model$/m);
  assert.doesNotMatch(calls, /cli (session|end-sessions)/, "no account and no session");
  assert.match(calls, /^cli provider-key-hash gw-loki key=vault-key-standin$/m, "the vault key reaches the CLI as root");
  assert.doesNotMatch(calls.split("\n").filter((l) => l.startsWith("sudo")).join("\n"), /vault-key-standin/, "the key is never an argument");
  assert.match(r.stdout, /warning: @unpinned's model names no provider/);
});

test("rc-sync.sh: a managed agent is not marked again, and --check changes nothing", () => {
  const again = wrapper({ managed: true });
  assert.equal(again.r.status, 0, again.r.stdout + again.r.stderr);
  assert.doesNotMatch(again.calls, /cli manage/);

  const check = wrapper({ stored: "", args: ["--check"] });
  assert.equal(check.r.status, 0, check.r.stdout + check.r.stderr);
  assert.match(check.r.stdout, /loki: would issue a new gateway key for rc-loki, and set it in gw-loki/);
  assert.match(check.r.stdout, /loki: would mark @loki managed/);
  assert.doesNotMatch(check.calls, /gwkey issue|cli set-provider|cli manage|cli agent-set/);

  const checkManaged = wrapper({ managed: true, args: ["--check"] });
  assert.match(checkManaged.calls, /^cli agent-set loki --check$/m);
  assert.match(checkManaged.r.stdout, /^loki: would set model$/m);
});

test("rc-sync.sh keeps a current key, and issues a new key into gw-<handle> otherwise, never into an output line", () => {
  const current = wrapper();
  assert.doesNotMatch(current.calls, /gwkey issue/);
  assert.match(current.calls, /^cli set-provider gw-loki --base-url http:\/\/127\.0\.0\.1:4005\/v1 --models local-large stdin=$/m);
  for (const [stored, recorded] of [["", "h1"], ["h0", "h1"], ["h1", ""]]) {
    const { r, calls } = wrapper({ stored, recorded });
    assert.equal(r.status, 0, r.stdout + r.stderr);
    assert.match(calls, new RegExp(`^cli set-provider gw-loki --base-url \\S+ --models local-large stdin=${NEW_KEY}$`, "m"), "the key reaches the CLI on stdin");
    assert.doesNotMatch(r.stdout + r.stderr, new RegExp(NEW_KEY));
  }
});

test("rc-sync.sh fails the run on a failed key or a refused setting, and says why", () => {
  const key = wrapper({ stored: "", issueFails: true });
  assert.equal(key.r.status, 1);
  assert.match(key.r.stdout, /loki: FAILED: no new key reached gw-loki/);
  assert.doesNotMatch(key.calls, /cli agent-set/, "no settings without the key");
  const set = wrapper({ setFails: true });
  assert.equal(set.r.status, 1);
  assert.match(set.r.stdout, /loki: FAILED: the model gw-standin:local-large names the provider/);
});

test("rc-sync.sh notes the old account, refuses a CLI Node older than 24, and does nothing without a recursicachat block", () => {
  assert.match(wrapper({ account: true }).r.stdout, /note: recursicachat\.account is no longer used/);
  assert.doesNotMatch(wrapper().r.stdout, /no longer used/);
  const old = wrapper({ nodeMajor: 22 });
  assert.equal(old.r.status, 2);
  assert.match(old.r.stdout, /needs Node 24 or newer/);
  assert.doesNotMatch(old.calls, /^cli /m);

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
  const w = wanted({ agents: { loki: { recursicachat: { model: "local-large", budget_usd: 5 } } } }, "loki", kitRoot);
  assert.equal(w.model, "gw-loki:local-large");
  assert.ok(w.instructions.length <= MAX_INSTRUCTIONS);
  assert.match(w.instructions, /SYNTHETIC — generated by Loki/);
  assert.equal(w.autonomy, "ask");
  assert.equal(w.sandbox, "docker");
});
