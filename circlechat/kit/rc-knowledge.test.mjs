// kit/rc-knowledge.mjs against a stand-in for RecursicaChat's API. Nothing here reaches a server.
import { test } from "node:test";
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { STORED, apply, compare, ruleNotes, toolKey } from "./rc-knowledge.mjs";

const KEY = `ckm_${"5".repeat(48)}`;
const SESSION = `sess_${"x".repeat(30)}`;
const URL_ = "http://127.0.0.1:4011/mcp";
const keySha = crypto.createHash("sha256").update(KEY).digest("hex");
const want = { url: URL_, handles: ["designer", "reviewer"], keySha };
const agents = { designer: "ag_1", reviewer: "ag_2" };
const server = (extra = {}) => ({ id: "mcp_1", name: STORED, transport: "http", url: URL_, env_secrets: JSON.stringify({ AUTHORIZATION: "sec_1" }), status: "ok", tools: JSON.stringify([{ name: "router" }]), ...extra });

test("the stored name and tool names are the server's own", () => {
  assert.equal(STORED, "recursica_knowledge");
  assert.equal(toolKey("skill_text"), "recursica_knowledge__skill_text");
});

test("compare: nothing to change for a server the kit registered with the current key, granted to the agents", () => {
  const r = compare({ server: server(), grants: ["ag_1", "ag_2"], agents, policies: { [toolKey("router")]: "allow" }, want, record: { serverId: "mcp_1", keySha256: keySha } });
  assert.deepEqual(r, { changes: [], notes: [] });
});

test("compare: each difference is a change, and a tool not yet allowed is a note for an admin", () => {
  const record = { serverId: "mcp_1", keySha256: keySha };
  const c = (s, grants, rec = record) => compare({ server: s, grants, agents, want, record: rec }).changes.join("\n");
  assert.match(c(null, []), /add the MCP server recursica_knowledge/);
  assert.match(c(server({ url: "http://127.0.0.1:9/mcp" }), []), /its address is .* register it again/);
  assert.match(c(server(), [], { serverId: "mcp_other", keySha256: keySha }), /did not register this one/);
  assert.match(c(server(), [], { serverId: "mcp_1", keySha256: "old" }), /not the current key/);
  assert.match(c(server({ env_secrets: "{}" }), []), /no AUTHORIZATION secret/);
  assert.match(c(server(), ["ag_1"]), /grant it to @designer, @reviewer alone/);
  assert.match(c(server({ status: "error", error: "401" }), ["ag_1", "ag_2"]), /status is error \(401\): list its tools again/);
  const notes = compare({ server: server(), grants: ["ag_1", "ag_2"], agents: { designer: "ag_1" }, want, record }).notes.join("\n");
  assert.match(notes, /@reviewer is not on the server yet/);
  assert.match(notes, /an admin sets each of these to Allow .*recursica_knowledge__router/);
  assert.deepEqual(ruleNotes([{ name: "router" }], { [toolKey("router")]: "allow" }), []);
});

/** A stand-in for the server's API: its MCP servers, and each request. */
function api({ role = "builder", servers = [] } = {}) {
  const calls = [];
  const fetchImpl = async (url, { method, headers, body }) => {
    const p = new URL(url).pathname;
    calls.push({ method, p, auth: headers.authorization, body: body ? JSON.parse(body) : undefined });
    const ok = (j) => ({ ok: true, status: 200, json: async () => j });
    if (p === "/api/me") return ok({ user: { role } });
    if (p === "/api/agents") return ok({ agents: [{ handle: "designer", id: "ag_1" }] });
    if (p === "/api/mcp" && method === "GET") return ok({ servers });
    if (p === "/api/mcp" && method === "POST") {
      const s = { id: "mcp_new", name: STORED, transport: "http", url: JSON.parse(body).url, secrets: ["AUTHORIZATION"], status: "ok", tools: [{ name: "router" }], policies: {} };
      servers.push(s);
      return ok({ server: s, refresh: { tools: s.tools } });
    }
    if (method === "DELETE") { servers.splice(servers.findIndex((s) => p.endsWith(s.id)), 1); return ok({ ok: true }); }
    if (method === "PUT") return ok({});
    return { ok: false, status: 404, json: async () => ({ error: "no stand-in" }) };
  };
  return { calls, fetchImpl, servers };
}

test("apply adds the server with the key as its secret, grants it, records it, and prints neither the key nor the session", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-knowledge-"));
  try {
    const a = api();
    const lines = [];
    let record = null;
    await apply({ api: "http://127.0.0.1:3100", url: URL_, handles: ["designer", "reviewer"], key: KEY, session: SESSION, recordFile: path.join(dir, "r.json"), fetchImpl: a.fetchImpl, log: (t) => lines.push(t), writeRecord: (r) => { record = r; } });
    const post = a.calls.find((c) => c.method === "POST");
    assert.deepEqual(post.body, { name: "recursica-knowledge", transport: "http", url: URL_, secrets: { AUTHORIZATION: `Bearer ${KEY}` } });
    assert.deepEqual(a.calls.find((c) => c.method === "PUT").body, { grants: [{ type: "agent", id: "ag_1" }] });
    assert.ok(a.calls.every((c) => c.auth === `Bearer ${SESSION}`));
    assert.deepEqual(record, { serverId: "mcp_new", keySha256: keySha, url: URL_ });
    const text = lines.join("\n");
    assert.match(text, /added the MCP server recursica_knowledge \(mcp_new\)/);
    assert.match(text, /@reviewer is not on the server yet/);
    assert.match(text, /an admin sets each of these to Allow/);
    assert.ok(!text.includes(KEY) && !text.includes(SESSION));
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test("apply registers again a server with an old key, and refuses an account that is not a builder", async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rc-knowledge-"));
  try {
    const recordFile = path.join(dir, "r.json");
    fs.writeFileSync(recordFile, JSON.stringify({ serverId: "mcp_1", keySha256: "old" }));
    const a = api({ servers: [{ id: "mcp_1", name: STORED, transport: "http", url: URL_, secrets: ["AUTHORIZATION"], status: "ok" }] });
    await apply({ api: "http://127.0.0.1:3100", url: URL_, handles: ["designer"], key: KEY, session: SESSION, recordFile, fetchImpl: a.fetchImpl, log: () => {}, writeRecord: () => {} });
    assert.deepEqual(a.calls.filter((c) => c.method !== "GET").map((c) => `${c.method} ${c.p}`), ["DELETE /api/mcp/mcp_1", "POST /api/mcp", "PUT /api/mcp/mcp_new/grants"]);
    await assert.rejects(apply({ api: "http://127.0.0.1:3100", url: URL_, handles: ["designer"], key: KEY, session: SESSION, recordFile, fetchImpl: api({ role: "member" }).fetchImpl, log: () => {}, writeRecord: () => {} }), /must be a builder/);
    await assert.rejects(apply({ api: "x", url: URL_, handles: ["designer"], key: KEY, session: "", recordFile, log: () => {} }), /no session came/);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});
