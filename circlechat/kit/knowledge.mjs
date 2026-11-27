#!/usr/bin/env node
// The knowledge MCP server as a service on the control computer, from site.json's knowledge block
// (circlechat/README.md, "The knowledge MCP server"). Every agent and every program that reads the
// skills reads them from this one server: tools/knowledge-mcp/server.mjs in its HTTP mode.
//
//   "knowledge": {
//     "port": 4011,
//     "callers": [
//       { "name": "example-harness", "account": "_example", "file": "/opt/example/run/knowledge.key" },
//       { "name": "kev", "files": [{ "account": "_example", "file": "/opt/example/run/knowledge-kev.key" }] },
//       { "name": "recursicachat", "agents": ["betty", "barb"], "builder": "agent-setup@example.com" }
//     ]
//   }
//
// - port: the server's port on 127.0.0.1. Only the cluster's own stack sets the block.
// - callers: one key each. A caller's key file belongs to the caller's account, mode 400, in a
//   folder that belongs to root. A caller whose runs happen under several accounts, such as Kev,
//   lists each account's own copy under files. The key is the same in each copy.
// - recursicachat: the RecursicaChat 2.0 server's own key, which the kit keeps and gives to the
//   server. The agent sync (circlechat/rc-sync.sh) registers the knowledge server on RecursicaChat
//   with that key, and grants it to the agents listed, signed in as the builder account.
//
// The paths are fixed:
//   /opt/recursica-knowledge/<commit>/   an export of one commit of the knowledge repo, read-only
//   /opt/recursica-knowledge/current     the export the server serves (cluster/knowledge-export.mjs)
//   /var/lib/recursica-knowledge/        keys.json, the callers' key hashes; recursicachat.key; the
//                                        export account's work folder
//
//   node knowledge.mjs settings <site.json>       port, server account, export account, one a line;
//                                                 an empty first line for no knowledge block
//   node knowledge.mjs callers <site.json>        name, account, file, tab-separated, one key file a
//                                                 line; "-" for the account and file of recursicachat
//   node knowledge.mjs recursicachat <site.json>  the knowledge server's URL, the builder's email,
//                                                 the agents, comma-separated, and RecursicaChat's
//                                                 own address, tab-separated; nothing without a
//                                                 recursicachat caller
// Exit 2 for a site.json with problems.
import fs from "node:fs";
import { pathToFileURL } from "node:url";
import { FILTER_PORTS, RC_DEFAULTS, RC_GATEWAY_LISTENER_PORT, tokenPort } from "./render.mjs";

export const KNOWLEDGE_EXPORTS = "/opt/recursica-knowledge";
export const KNOWLEDGE_STATE = "/var/lib/recursica-knowledge";
export const KNOWLEDGE_KEYS = `${KNOWLEDGE_STATE}/keys.json`;
export const RC_KEY_FILE = `${KNOWLEDGE_STATE}/recursicachat.key`;
// The launchd job or systemd service (kit/lib.sh install_unit).
export const KNOWLEDGE_UNIT = "knowledge-mcp";
// The RecursicaChat caller: its key stays with the kit, which gives it to the server.
export const RC_CALLER = "recursicachat";
// The server's name on RecursicaChat. The server stores it as recursica_knowledge.
export const RC_SERVER_NAME = "recursica-knowledge";

/** The two accounts: the server's, which reads the exports, and the one that writes each export. */
export function knowledgeAccounts(platform = process.platform) {
  return platform === "darwin"
    ? { server: "_knowledgemcp", exporter: "_knowledgeexport" }
    : { server: "knowledge-mcp", exporter: "knowledge-export" };
}

export const knowledgeUrl = (site) => `http://127.0.0.1:${site.knowledge.port}/mcp`;

const NAME = /^[a-z][a-z0-9-]{1,39}$/;
const ACCOUNT = /^_?[a-z][a-z0-9_-]{0,31}$/;
const FILE = /^\/[A-Za-z0-9._/-]+$/;
const HANDLE = /^[a-z0-9][a-z0-9_-]{0,36}$/;

/** Each caller as { name, files: [{ account, file }], agents?, builder? }. */
export function knowledgeCallers(site) {
  return (site.knowledge?.callers ?? []).map((c) => {
    if (c.name === RC_CALLER) return { name: c.name, files: [], agents: c.agents, builder: c.builder };
    return { name: c.name, files: c.files ?? [{ account: c.account, file: c.file }] };
  });
}

/** The ports of the control computer that the server's port must differ from. */
function usedPorts(site) {
  const t = site.site ?? {};
  const gw = t.gateway_port ?? 4000;
  const used = [
    ["site.port", t.port ?? 8080],
    ["site.preview_port", t.preview_port ?? 5173],
    ["site.gateway_port", gw],
    ["site.gateway_port + 1, the gateway's port for port jobs on a Mac", gw + 1],
    ["site.gateway_local_port", t.gateway_local_port],
    ["site.github_token_port, the GitHub token service's port", tokenPort(site)],
    ...FILTER_PORTS.map((x) => ["a port of the outgoing filter", x]),
  ];
  if (site.recursicachat) {
    const api = Number(new URL(site.recursicachat.url ?? RC_DEFAULTS.url).port || 80);
    used.push(["the RecursicaChat 2.0 server's port", api], ["the RecursicaChat 2.0 server's gateway listener", RC_GATEWAY_LISTENER_PORT]);
  }
  for (const n of site.nodes ?? []) {
    if (!n?.control) continue;
    for (const m of [...(n.servers ?? []), ...(n.models ?? [])]) used.push([`node ${n.name}'s model server`, m?.port]);
    used.push([`node ${n.name}'s job runner`, n.jobs?.port], [`node ${n.name}'s Kev-engine`, n.kev?.port]);
  }
  return used;
}

/** The problems with site.json's knowledge block, or none. */
export function knowledgeErrors(site = {}) {
  const k = site.knowledge;
  if (k === undefined) return [];
  if (!k || typeof k !== "object" || Array.isArray(k)) return ["knowledge must be an object: port and callers"];
  const errs = [];
  for (const key of Object.keys(k)) if (!["port", "callers"].includes(key)) errs.push(`knowledge.${key} is not a setting: port and callers`);
  if (site.site?.tenant !== undefined) errs.push("knowledge is for the cluster's own stack only. The control computer runs one knowledge MCP server, for every stack");
  if (!(Number.isInteger(k.port) && k.port >= 1024 && k.port <= 65535)) errs.push("knowledge.port must be a port number from 1024 to 65535: the server's port on 127.0.0.1");
  else {
    const hit = usedPorts(site).find(([, x]) => x === k.port);
    if (hit) errs.push(`knowledge.port (${k.port}) is already ${hit[0]}. Give the knowledge MCP server another port`);
  }
  if (!Array.isArray(k.callers) || !k.callers.length) return [...errs, "knowledge.callers must list each program that reads the skills, with the file for its key"];
  const names = new Set();
  const files = new Set();
  const taken = new Set([
    ...(site.recursicachat?.sessions ?? []).map((s) => s?.file),
    ...(site.recursicachat?.services ?? []).flatMap((s) => [s?.file, s?.file && `${String(s.file).replace(/\/[^/]*$/, "")}/${s.name}.gateway-key`]),
  ].filter(Boolean));
  k.callers.forEach((c, i) => {
    const at = `knowledge.callers[${i}]`;
    if (!c || typeof c !== "object" || Array.isArray(c)) return void errs.push(`${at} must be an object`);
    if (typeof c.name !== "string" || !NAME.test(c.name)) errs.push(`${at}.name must be 2 to 40 of a-z, 0-9 and -, starting with a letter`);
    else if (names.has(c.name)) errs.push(`${at}.name ${c.name} is listed twice`);
    else names.add(c.name);
    if (c.name === RC_CALLER) {
      for (const key of Object.keys(c)) if (!["name", "agents", "builder"].includes(key)) errs.push(`${at}.${key} is not a setting of the ${RC_CALLER} caller: name, agents and builder. The kit keeps the server's key`);
      if (!site.recursicachat) errs.push(`${at}: the ${RC_CALLER} caller needs a recursicachat block, the server the kit registers the knowledge server on`);
      if (!Array.isArray(c.agents) || !c.agents.length) errs.push(`${at}.agents must list the handles of the agents the knowledge server is granted to, such as ["betty"]`);
      // An agent the server doesn't have yet is no error: the sync grants the server to the agent once
      // the agent is on the server, and says so until then.
      else for (const h of c.agents) if (typeof h !== "string" || !HANDLE.test(h)) errs.push(`${at}.agents: ${JSON.stringify(h)} is not an agent's handle`);
      if (Array.isArray(c.agents) && new Set(c.agents).size !== c.agents.length) errs.push(`${at}.agents lists an agent twice`);
      if (typeof c.builder !== "string" || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(c.builder)) errs.push(`${at}.builder must be the email of a builder account on the server: the sync signs in as the account to register the knowledge server`);
      return;
    }
    for (const key of Object.keys(c)) if (!["name", "account", "file", "files"].includes(key)) errs.push(`${at}.${key} is not a setting: name, and account and file, or files`);
    const copies = c.files !== undefined ? c.files : [{ account: c.account, file: c.file }];
    if (c.files !== undefined && (c.account !== undefined || c.file !== undefined)) errs.push(`${at}: give account and file, or files, not both`);
    if (!Array.isArray(copies) || !copies.length) return void errs.push(`${at}.files must list each account's { account, file }`);
    const accounts = new Set();
    copies.forEach((f, j) => {
      const fat = c.files !== undefined ? `${at}.files[${j}]` : at;
      if (!f || typeof f !== "object") return void errs.push(`${fat} must be { account, file }`);
      if (typeof f.account !== "string" || !ACCOUNT.test(f.account) || f.account === "root") errs.push(`${fat}.account must be the macOS or Linux account that runs the program, not root`);
      else if (accounts.has(f.account)) errs.push(`${fat}.account ${f.account} is listed twice`);
      else accounts.add(f.account);
      if (typeof f.file !== "string" || !FILE.test(f.file) || f.file.split("/").includes("..")) errs.push(`${fat}.file must be an absolute path`);
      else if (f.file.startsWith(`${KNOWLEDGE_EXPORTS}/`) || f.file.startsWith(`${KNOWLEDGE_STATE}/`)) errs.push(`${fat}.file must be outside the knowledge server's folders`);
      else if (files.has(f.file)) errs.push(`${fat}.file is listed twice`);
      else if (taken.has(f.file)) errs.push(`${fat}.file is a RecursicaChat session or service file. Give the key a file of its own`);
      else files.add(f.file);
    });
  });
  return errs;
}

function readSite(file) {
  if (!file || !fs.existsSync(file)) throw new Error(`No site.json at ${file ?? "(none given)"}.`);
  const site = JSON.parse(fs.readFileSync(file, "utf8"));
  const errs = knowledgeErrors(site);
  if (errs.length) throw new Error(`site.json: ${errs.join("; ")}`);
  return site;
}

export function main(argv = process.argv.slice(2), { out = (t) => process.stdout.write(t), log = console.error, platform = process.platform } = {}) {
  const [cmd, file] = argv;
  try {
    const site = readSite(file);
    if (cmd === "settings") {
      const a = knowledgeAccounts(platform);
      out(site.knowledge ? `${site.knowledge.port}\n${a.server}\n${a.exporter}\n` : "\n");
      return 0;
    }
    if (cmd === "callers") {
      for (const c of knowledgeCallers(site)) {
        if (!c.files.length) out(`${c.name}\t-\t-\n`);
        for (const f of c.files) out(`${c.name}\t${f.account}\t${f.file}\n`);
      }
      return 0;
    }
    if (cmd === "recursicachat") {
      const c = knowledgeCallers(site).find((x) => x.name === RC_CALLER);
      if (c) out(`${knowledgeUrl(site)}\t${c.builder}\t${c.agents.join(",")}\t${site.recursicachat.url ?? RC_DEFAULTS.url}\n`);
      return 0;
    }
    log("usage: knowledge.mjs settings|callers|recursicachat <site.json>");
    return 2;
  } catch (e) {
    log(e.message);
    return 2;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) process.exitCode = main();
