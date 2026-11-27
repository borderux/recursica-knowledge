#!/usr/bin/env node
// The knowledge MCP server on the stack's RecursicaChat 2.0 server: registered as an HTTP MCP
// server, with the recursicachat caller's key (kit/knowledge-keys.mjs), and granted to the agents
// that caller lists, such as @betty and @barb (kit/knowledge.mjs). circlechat/rc-sync.sh runs both
// steps as root, each hour.
//
// The server's CLI has no command for an MCP server, so the change goes through the server's API,
// signed in as a builder account, as a person in Settings > MCP servers would make it:
//   1. check: reads the server's database, read-only, and changes nothing. Prints what differs and
//      exits 10 when a change is needed. A sync that needs no change signs in to nothing.
//   2. apply: with a 10-minute session for the builder on stdin, from the CLI (cli.ts session), and
//      only when check exited 10. Adds the server unless it exists, with the key as its
//      AUTHORIZATION secret; grants it to the listed agents and to nothing else; and asks the server
//      to list the tools again when it can't reach them. rc-sync.sh ends the builder's sessions after.
// The server keeps a secret it can't show, so the kit records the key's SHA-256 and the server's id
// it registered, in /var/lib/recursica-knowledge/rc-registered.json, root's own. A new key, a new
// address, or a server someone else made, is registered again: the old one is removed and a new one
// added. The tools' rules (Settings > MCP servers) are an admin's: the API takes them only from an
// admin, and the CLI makes no admin session. A new server's tools start off, so after each new
// registration both steps print each tool whose rule is not Allow yet, for an admin to set.
//
//   node rc-knowledge.mjs check <database> <knowledge url> <agents,...> <key file> <record file>
//   node rc-knowledge.mjs apply <server api> <knowledge url> <agents,...> <key file> <record file> < session
//
// The key and the session stay in this process: never an argument, an environment variable, a file
// or an output line. They go only to 127.0.0.1.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { RC_SERVER_NAME } from "./knowledge.mjs";

// The name the server stores: lowercase, each run of other characters as one "_" (the server's slug()).
export const STORED = RC_SERVER_NAME.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "");
// A tool's name on the server: <server>__<tool>, as the server names it (gateway.ts).
export const toolKey = (tool) => `${STORED}__${tool}`.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 64);
const sha256 = (s) => crypto.createHash("sha256").update(s).digest("hex");
const json = (s, d) => { try { return JSON.parse(s); } catch { return d; } };

export function readRecord(file) {
  return json((() => { try { return fs.readFileSync(file, "utf8"); } catch { return ""; } })(), {});
}

/** The key from root's key file, or throws: read never through a link. */
export function readKey(file) {
  const fd = fs.openSync(file, fs.constants.O_RDONLY | fs.constants.O_NOFOLLOW);
  try {
    const key = fs.readFileSync(fd, "utf8").trim();
    if (!/^ckm_[0-9a-f]{48}$/.test(key)) throw new Error(`${file} holds no knowledge server key. Run setup-host.sh`);
    return key;
  } finally { fs.closeSync(fd); }
}

/**
 * What differs between the server and what the kit wants. Pure, for the tests.
 *   server: the stored row, or null; grants: agent ids it is granted to; agents: { handle: id }
 *   want: { url, handles, keySha }; record: the kit's record
 *   returns { changes: [text], notes: [text] }
 */
export function compare({ server, grants, agents, policies = {}, want, record }) {
  const changes = [], notes = [];
  const missing = want.handles.filter((h) => !agents[h]);
  for (const h of missing) notes.push(`@${h} is not on the server yet, so the grant to @${h} waits`);
  if (!server) return { changes: [`add the MCP server ${STORED}`], notes };
  if (server.transport !== "http" || server.url !== want.url) changes.push(`its address is ${server.url || server.command}, not ${want.url}: register it again`);
  else if (record.serverId !== server.id) changes.push("the kit did not register this one, so its key is unknown: register it again");
  else if (record.keySha256 !== want.keySha) changes.push("its key is not the current key: register it again");
  else if (!Object.keys(json(server.env_secrets, {})).includes("AUTHORIZATION")) changes.push("it has no AUTHORIZATION secret: register it again");
  if (changes.length) return { changes, notes };
  const wanted = new Set(want.handles.filter((h) => agents[h]).map((h) => agents[h]));
  const have = new Set(grants);
  if (wanted.size !== have.size || [...wanted].some((x) => !have.has(x))) changes.push(`grant it to ${want.handles.filter((h) => agents[h]).map((h) => `@${h}`).join(", ") || "nobody"} alone`);
  if (server.status !== "ok") changes.push(`its status is ${server.status}${server.error ? ` (${server.error})` : ""}: list its tools again`);
  notes.push(...ruleNotes(json(server.tools, []), policies));
  return { changes, notes };
}

/** A line for each tool whose rule is not Allow: an admin sets the rule. */
export function ruleNotes(tools, policies) {
  const todo = tools.map((t) => t.name).filter((n) => (policies[toolKey(n)] ?? "off") !== "allow");
  return todo.length ? [`an admin sets each of these to Allow in Settings > MCP servers > ${STORED}: ${todo.map(toolKey).join(", ")}. Every one only reads the skills`] : [];
}

/** The database's view, read-only. */
export async function readServer(dbFile) {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const server = db.prepare("SELECT * FROM mcp_servers WHERE name = ?").get(STORED) ?? null;
    const agents = Object.fromEntries(db.prepare("SELECT id, handle FROM agents WHERE archived = 0").all().map((r) => [r.handle, r.id]));
    const grants = server ? db.prepare("SELECT target_id FROM grants WHERE resource_type = 'mcp' AND resource_id = ? AND target_type = 'agent'").all(server.id).map((r) => r.target_id) : [];
    const others = server ? db.prepare("SELECT COUNT(*) AS n FROM grants WHERE resource_type = 'mcp' AND resource_id = ? AND target_type != 'agent'").get(server.id).n : 0;
    const policies = server ? Object.fromEntries(db.prepare("SELECT tool, decision FROM policies WHERE resource_type = 'mcp' AND resource_id = ?").all(server.id).map((r) => [r.tool, r.decision])) : {};
    // A grant to the workspace or a chat is a grant the kit did not make: one more reason to set them.
    return { server, agents, grants: others ? [...grants, "(a workspace or chat grant)"] : grants, policies };
  } finally { db.close(); }
}

/**
 * The changes through the API, with a builder's session. Returns the lines it printed. Throws with a
 * reason that names neither the key nor the session.
 *   api: the server's address; fetchImpl: for the tests
 */
export async function apply({ api, url, handles, key, session, recordFile, fetchImpl = globalThis.fetch, log = console.log, writeRecord = (r) => writeRoot(recordFile, r) }) {
  if (!/^\S{20,}$/.test(session ?? "")) throw new Error("no session came from the server's CLI (the lines above say why)");
  const redact = (s) => String(s ?? "").replaceAll(key, "[key]").replaceAll(session, "[session]");
  const call = async (method, p, body) => {
    let r;
    try {
      r = await fetchImpl(api.replace(/\/+$/, "") + p, {
        method,
        headers: { authorization: `Bearer ${session}`, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(60_000),
      });
    } catch (e) { throw new Error(`RecursicaChat isn't answering at ${api}: ${redact(e.cause?.message ?? e.message)}`); }
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(`${method} ${p}: HTTP ${r.status} ${redact(j.error)}`.trim());
    return j;
  };
  const record = readRecord(recordFile);
  const keySha = sha256(key);
  const me = (await call("GET", "/api/me")).user;
  if (me?.role !== "builder") throw new Error(`the account is a ${me?.role ?? "nobody"}: it must be a builder to add an MCP server`);
  const agents = Object.fromEntries((await call("GET", "/api/agents")).agents.map((a) => [a.handle, a.id]));
  let srv = (await call("GET", "/api/mcp")).servers.find((s) => s.name === STORED) ?? null;
  if (srv && (srv.transport !== "http" || srv.url !== url || record.serverId !== srv.id || record.keySha256 !== keySha || !(srv.secrets ?? []).includes("AUTHORIZATION"))) {
    await call("DELETE", `/api/mcp/${srv.id}`);
    log(`removed the MCP server ${STORED} (${srv.id}), to register it again with the current address and key`);
    srv = null;
  }
  if (!srv) {
    const out = await call("POST", "/api/mcp", { name: RC_SERVER_NAME, transport: "http", url, secrets: { AUTHORIZATION: `Bearer ${key}` } });
    srv = out.server;
    log(`added the MCP server ${STORED} (${srv.id}) at ${url}`);
    if (out.refresh?.error) log(`  it couldn't list the tools yet: ${redact(out.refresh.error)}`);
  } else if (srv.status !== "ok") {
    const r = await call("POST", `/api/mcp/${srv.id}/refresh`).catch((e) => ({ error: e.message }));
    log(r.error ? `${STORED}: listing the tools again failed: ${redact(r.error)}` : `${STORED}: listed the tools again`);
  }
  writeRecord({ serverId: srv.id, keySha256: keySha, url });
  const ids = handles.filter((h) => agents[h]).map((h) => ({ type: "agent", id: agents[h] }));
  await call("PUT", `/api/mcp/${srv.id}/grants`, { grants: ids });
  srv = (await call("GET", "/api/mcp")).servers.find((s) => s.id === srv.id);
  log(`${STORED}: status ${srv.status}${srv.error ? ` (${redact(srv.error)})` : ""}, granted to ${handles.filter((h) => agents[h]).map((h) => `@${h}`).join(", ") || "nobody"}`);
  for (const h of handles.filter((x) => !agents[x])) log(`${STORED}: @${h} is not on the server yet, so the grant to @${h} waits`);
  for (const n of ruleNotes(srv.tools ?? [], srv.policies ?? {})) log(`${STORED}: ${n}`);
}

/** Writes root's own record: a new file renamed over the old one. */
function writeRoot(file, record) {
  const tmp = path.join(path.dirname(file), `.${path.basename(file)}.new-${crypto.randomBytes(6).toString("hex")}`);
  fs.writeFileSync(tmp, `${JSON.stringify(record)}\n`, { mode: 0o600, flag: "wx" });
  fs.renameSync(tmp, file);
}

export async function main(argv = process.argv.slice(2), { stdin = process.stdin, log = console.log } = {}) {
  const [cmd, where, url, agentList, keyFile, recordFile] = argv;
  const handles = String(agentList ?? "").split(",").filter(Boolean);
  try {
    if (cmd === "check" && where && url && handles.length && keyFile && recordFile) {
      const db = await readServer(where);
      const { changes, notes } = compare({ ...db, want: { url, handles, keySha: sha256(readKey(keyFile)) }, record: readRecord(recordFile) });
      for (const n of notes) log(`${STORED}: ${n}`);
      if (!changes.length) { log(`${STORED}: registered and granted, with the current key`); return 0; }
      for (const c of changes) log(`${STORED}: would ${c}`);
      return 10;
    }
    if (cmd === "apply" && where && url && handles.length && keyFile && recordFile) {
      let session = "";
      for await (const c of stdin) session += c;
      await apply({ api: where, url, handles, key: readKey(keyFile), session: session.trim(), recordFile, log });
      return 0;
    }
    log("usage: rc-knowledge.mjs check <database> <knowledge url> <agents> <key file> <record file> | apply <server api> <knowledge url> <agents> <key file> <record file> < session");
    return 2;
  } catch (e) {
    log(`${STORED}: FAILED: ${e.message}`);
    return 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = await main();
