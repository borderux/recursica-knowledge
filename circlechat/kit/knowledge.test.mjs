// kit/knowledge.mjs: site.json's knowledge block, the callers it gives the key step, and what the
// render writes for setup-host.sh. Pure: nothing here reaches a service.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { knowledgeAccounts, knowledgeCallers, knowledgeErrors, main } from "./knowledge.mjs";
import { render, validate } from "./render.mjs";

const example = JSON.parse(fs.readFileSync(new URL("../site.example.json", import.meta.url), "utf8"));
const RC = { name: "recursicachat", agents: ["designer"], builder: "agent-setup@example.com" };
const withKnowledge = (callers = [{ name: "example-harness", account: "_example", file: "/opt/example/run/knowledge.key" }], extra = {}) => {
  const s = structuredClone(example);
  s.knowledge = { port: 4011, callers };
  return Object.assign(s, extra);
};
const out = () => { const o = { text: "", fn: (t) => { o.text += t; } }; return o; };

test("a knowledge block with a port and callers is valid, and the render passes the port to setup-host.sh", () => {
  const s = withKnowledge([
    { name: "example-harness", account: "_example", file: "/opt/example/run/knowledge.key" },
    { name: "kev", files: [{ account: "_example", file: "/opt/example/run/knowledge-kev.key" }, { account: "_other", file: "/opt/other/run/knowledge-kev.key" }] },
  ]);
  assert.deepEqual(validate(s), []);
  assert.match(render(s).tenantEnv, /^KNOWLEDGE_PORT=4011$/m);
  assert.match(render(example).tenantEnv, /^KNOWLEDGE_PORT=$/m, "no block, no server");
  assert.deepEqual(knowledgeCallers(s).map((c) => [c.name, c.files.length]), [["example-harness", 1], ["kev", 2]]);
});

test("the port must be free among the stack's other ports", () => {
  for (const [port, extra, why] of [
    [4000, {}, /site\.gateway_port/],
    [4001, {}, /port jobs on a Mac/],
    [4005, { site: { ...example.site, gateway_local_port: 4005 } }, /site\.gateway_local_port/],
    [4010, { github_apps: { betty: { app_id: 1, installation_id: 2, slug: "x" } } }, /GitHub token service/],
    [7400, {}, /outgoing filter/],
    [80, {}, /from 1024 to 65535/],
  ]) {
    const s = withKnowledge(undefined, extra);
    s.knowledge.port = port;
    assert.match(knowledgeErrors(s).join("\n"), why, String(port));
  }
});

test("each caller is checked: its name, its account, and a key file of its own", () => {
  const bad = (callers, extra) => knowledgeErrors(withKnowledge(callers, extra)).join("\n");
  assert.match(bad([]), /knowledge\.callers must list/);
  assert.match(bad([{ name: "Bad Name", account: "_example", file: "/opt/x/k" }]), /\.name must be 2 to 40/);
  assert.match(bad([{ name: "a1", account: "root", file: "/opt/x/k" }]), /not root/);
  assert.match(bad([{ name: "a1", account: "_example", file: "relative/k" }]), /absolute path/);
  assert.match(bad([{ name: "a1", account: "_example", file: "/opt/x/../k" }]), /absolute path/);
  assert.match(bad([{ name: "a1", account: "_example", file: "/var/lib/recursica-knowledge/a1.key" }]), /outside the knowledge server's folders/);
  assert.match(bad([{ name: "a1", account: "_a", file: "/opt/x/k" }, { name: "a2", account: "_b", file: "/opt/x/k" }]), /listed twice/);
  assert.match(bad([{ name: "a1", account: "_a", file: "/opt/x/k" }, { name: "a1", account: "_b", file: "/opt/y/k" }]), /a1 is listed twice/);
  assert.match(bad([{ name: "a1", account: "_a", file: "/opt/x/k", files: [] }]), /not both/);
  assert.match(bad([{ name: "a1", account: "_a", file: "/opt/x/k", key: "x" }]), /callers\[0\]\.key is not a setting/);
  const s = withKnowledge([{ name: "a1", account: "_a", file: "/opt/program/run/token" }]);
  s.recursicachat = { services: [{ name: "example-service", agents: ["designer"], account: "_a", file: "/opt/program/run/token" }] };
  assert.match(knowledgeErrors(s).join("\n"), /RecursicaChat session or service file/);
});

test("the recursicachat caller needs the server, the agents on it, and a builder account", () => {
  const s = withKnowledge([RC]);
  assert.match(knowledgeErrors(s).join("\n"), /needs a recursicachat block/);
  s.recursicachat = {};
  // An agent not on the server yet waits for its grant: no error.
  assert.deepEqual(knowledgeErrors(s), []);
  s.knowledge.callers = [{ ...RC, agents: ["designer", "designer", "Bad"] }];
  assert.match(knowledgeErrors(s).join("\n"), /"Bad" is not an agent's handle/);
  assert.match(knowledgeErrors(s).join("\n"), /lists an agent twice/);
  s.knowledge.callers = [{ ...RC, builder: "nobody", account: "_x" }];
  const errs = knowledgeErrors(s).join("\n");
  assert.match(errs, /builder must be the email of a builder account/);
  assert.match(errs, /account is not a setting of the recursicachat caller/);
});

test("the block belongs to the cluster's own stack", () => {
  const s = withKnowledge();
  s.site.tenant = "acme";
  assert.match(knowledgeErrors(s).join("\n"), /cluster's own stack only/);
  assert.match(knowledgeErrors({ knowledge: [] }).join("\n"), /must be an object/);
  assert.match(knowledgeErrors({ knowledge: { port: 4011, callers: [], extra: 1 } }).join("\n"), /knowledge\.extra is not a setting/);
});

test("the CLI gives setup and the key step their lines, and refuses a broken block", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "knowledge-site-"));
  const file = path.join(dir, "site.json");
  const s = withKnowledge([{ name: "example-harness", account: "_example", file: "/opt/example/run/knowledge.key" }, RC]);
  s.recursicachat = {};
  s.agents.designer = { routes: ["local-large"], cloud: false, recursicachat: { model: "local-large", budget_usd: 5 } };
  fs.writeFileSync(file, JSON.stringify(s));
  let o = out();
  assert.equal(main(["settings", file], { out: o.fn, platform: "darwin" }), 0);
  assert.equal(o.text, "4011\n_knowledgemcp\n_knowledgeexport\n");
  assert.deepEqual(knowledgeAccounts("linux"), { server: "knowledge-mcp", exporter: "knowledge-export" });
  o = out();
  main(["callers", file], { out: o.fn });
  assert.equal(o.text, "example-harness\t_example\t/opt/example/run/knowledge.key\nrecursicachat\t-\t-\n");
  o = out();
  main(["recursicachat", file], { out: o.fn });
  assert.equal(o.text, "http://127.0.0.1:4011/mcp\tagent-setup@example.com\tdesigner\thttp://127.0.0.1:3100\n");
  fs.writeFileSync(file, JSON.stringify(example));
  o = out();
  main(["settings", file], { out: o.fn });
  assert.equal(o.text, "\n", "no block: an empty first line");
  fs.writeFileSync(file, JSON.stringify({ ...example, knowledge: { port: 1 } }));
  const logs = [];
  assert.equal(main(["callers", file], { out: o.fn, log: (t) => logs.push(t) }), 2);
  assert.match(logs.join("\n"), /knowledge\.port must be a port number/);
  fs.rmSync(dir, { recursive: true, force: true });
});
