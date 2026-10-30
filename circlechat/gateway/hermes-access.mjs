#!/usr/bin/env node
// Point one agent's Hermes home at the stack's gateway, with the agent's own gateway key, and
// remove every cloud key from the home. setup-agent.sh and setup-host.sh run this as root, because
// the agent's container owns the home's files.
//
//   node hermes-access.mjs <hermes home> <handle> <gateway state dir> <gateway URL> <route> [env]
//
// With "env", the script also writes CC_GATEWAY_URL and CC_GATEWAY_KEY to the home's .env, for an
// agent whose shell calls the gateway, such as Porter asking for a port job's task key.
//
// The agent then asks the gateway for <route>, and the gateway decides, for each request, whether
// a cluster model or the agent's cloud key answers. Every other Hermes setting that picks a model
// (compression, the side tasks, subagents, fallbacks and speech) goes to the gateway too, or stays
// on the computer, and the script stops when one still points elsewhere. The script prints nothing
// secret.
import path from "node:path";
import { issue, loadKeys, verify } from "./keys.mjs";
import { KEY_NAMES, keyShape } from "./cloud-keys.mjs";
import { Refused, readFile, writeFile } from "../kit/safe-files.mjs";

const PROVIDER = "gateway";

// The top-level YAML block that starts with `name:`, as [start, end) line numbers, or null.
function block(lines, name) {
  const start = lines.findIndex((l) => l.startsWith(`${name}:`));
  if (start < 0) return null;
  let end = start + 1;
  while (end < lines.length && (lines[end] === "" || /^[\s-]/.test(lines[end]))) end++;
  while (end > start + 1 && lines[end - 1] === "") end--;
  return [start, end];
}

const indent = (l) => l.length - l.trimStart().length;

// The keys directly inside lines [start, end) at <depth> spaces, each as { name, start, end, inline },
// where inline is the text after the colon on the key's own line.
function children(lines, [start, end], depth) {
  const out = [];
  for (let i = start; i < end; i++) {
    const l = lines[i];
    if (l.trim() === "" || indent(l) !== depth || l.trimStart().startsWith("- ")) continue;
    const m = l.trimStart().match(/^([^:#]+):\s*(.*)$/);
    if (!m) continue;
    let j = i + 1;
    while (j < end && (lines[j].trim() === "" || indent(lines[j]) > depth || (indent(lines[j]) === depth && lines[j].trimStart().startsWith("- ")))) j++;
    while (j > i + 1 && lines[j - 1].trim() === "") j--;
    out.push({ name: m[1].trim(), start: i, end: j, inline: m[2].trim() });
  }
  return out;
}

// The value of <key> directly inside a child, or "".
function valueOf(lines, c, key, depth) {
  const k = children(lines, [c.start + 1, c.end], depth).find((x) => x.name === key);
  return k ? k.inline.replace(/^["']|["']$/g, "") : "";
}

// The gateway key the home holds now. Hermes keeps named providers in `providers:` from config
// version 51. An older Hermes keeps them in a `custom_providers:` list, and its settings upgrade
// moves the list to `providers:`, so the key can be in either place.
export function currentKey(config) {
  const lines = config.split("\n");
  const p = block(lines, "providers");
  const g = p && children(lines, p, 2).find((c) => c.name === PROVIDER);
  if (g) return valueOf(lines, g, "api_key", 4).match(/^cc[gt]_\S+$/)?.[0] ?? "";
  const b = block(lines, "custom_providers");
  if (!b) return "";
  const entry = lines.slice(b[0], b[1]).join("\n");
  if (!new RegExp(`name:\\s*${PROVIDER}\\b`).test(entry)) return "";
  return entry.match(/api_key:\s*"?(cc[gt]_[^"\s]+)"?/)?.[1] ?? "";
}

// Hermes' settings that pick a model, and the values that keep each one on the gateway. A provider
// of "auto", or none, follows the main model, which is the gateway's. Hermes then refuses to try
// any other provider it finds signed in (agent/auxiliary_client.py, _discovery_chain_allowed).
const ROUTE_KEYS = /^(provider|model|base_url|api_key|api_mode|api)$/;
const pinned = (lines, c, depth) => {
  if (c.inline && c.inline !== "{}") return true;
  const provider = valueOf(lines, c, "provider", depth);
  return (provider !== "" && provider !== "auto") || valueOf(lines, c, "model", depth) !== "" || valueOf(lines, c, "base_url", depth) !== "";
};
// A task block that names a provider, a model or an address goes to the gateway and the route.
function pinToGateway(lines, c, depth, route) {
  const pad = " ".repeat(depth);
  const body = c.inline && c.inline !== "{}" ? [] : lines.slice(c.start + 1, c.end).filter((l) => !(indent(l) === depth && ROUTE_KEYS.test(l.trim().split(":")[0])));
  return [`${" ".repeat(depth - 2)}${c.name}:`, `${pad}provider: custom:${PROVIDER}`, `${pad}model: ${route}`, ...body];
}

// Replaces top-level block <name> with <replacement> lines, or adds them at the end.
function setBlock(lines, name, replacement) {
  const b = block(lines, name);
  if (b) lines.splice(b[0], b[1] - b[0], ...replacement);
  else if (replacement.length) lines.push(...replacement);
}

// Sets `<key>: <value>` directly inside top-level block <name>, adding the block when missing.
function setChild(lines, name, key, value) {
  const b = block(lines, name);
  if (!b) { lines.push(`${name}:`, `  ${key}: ${value}`); return; }
  if (lines[b[0]] !== `${name}:`) { lines.splice(b[0], b[1] - b[0], `${name}:`, `  ${key}: ${value}`); return; }
  const k = children(lines, b, 2).find((c) => c.name === key);
  if (k) lines.splice(k.start, k.end - k.start, `  ${key}: ${value}`);
  else lines.splice(b[0] + 1, 0, `  ${key}: ${value}`);
}

// The MCP server of the retired @recursica/mcp package. The knowledge MCP server replaces it.
const RETIRED_MCP = "recursica-mcp";

export function writeConfig(config, { baseUrl, key, route }) {
  let lines = config.replace(/\s+$/, "").split("\n");
  // model.default is the route the agent asks for, and model.provider is the gateway.
  const m = block(lines, "model");
  if (m) {
    const body = lines.slice(m[0] + 1, m[1]).filter((l) => !/^\s+(default|provider|base_url|api_key):/.test(l));
    lines.splice(m[0], m[1] - m[0], "model:", `  default: ${route}`, `  provider: custom:${PROVIDER}`, ...body);
  } else {
    lines.unshift("model:", `  default: ${route}`, `  provider: custom:${PROVIDER}`);
  }
  // The gateway is the home's one named provider, in the form the home's Hermes reads.
  const newForm = Boolean(block(lines, "providers"));
  setBlock(lines, "custom_providers", newForm ? [] : ["custom_providers:", `- name: ${PROVIDER}`, `  base_url: ${JSON.stringify(baseUrl)}`, `  api_key: ${JSON.stringify(key)}`, "  api_mode: chat_completions"]);
  if (newForm) setBlock(lines, "providers", ["providers:", `  ${PROVIDER}:`, `    name: ${PROVIDER}`, `    api: ${JSON.stringify(baseUrl)}`, `    api_key: ${JSON.stringify(key)}`, "    transport: chat_completions"]);
  // No fallback to another provider.
  setBlock(lines, "fallback_providers", []);
  setBlock(lines, "fallback_model", []);
  // Compression summaries go to the same route, so a new route in site.json moves them too. An
  // older Hermes reads summary_model at the top or inside compression, and a newer one reads
  // auxiliary.compression, where its settings upgrade moves the older value.
  lines = lines.map((l) => (/^summary_model:/.test(l) ? `summary_model: ${route}` : l));
  const comp = block(lines, "compression");
  if (comp) {
    const body = lines.slice(comp[0], comp[1]).filter((l) => !/^\s+summary_(provider|base_url|api_key):/.test(l)).map((l) => (/^\s+summary_model:/.test(l) ? `  summary_model: ${route}` : l));
    lines.splice(comp[0], comp[1] - comp[0], ...body);
  }
  // Every side task (compression, vision, titles, and the rest) that names its own provider, model
  // or address goes to the gateway. A task left on "auto" follows the main model already.
  const aux = block(lines, "auxiliary");
  const tasks = aux && lines[aux[0]] === "auxiliary:" ? children(lines, aux, 2) : [];
  const auxLines = ["auxiliary:"];
  if (!tasks.some((t) => t.name === "compression")) auxLines.push(...pinToGateway([], { name: "compression", start: 0, end: 0, inline: "" }, 4, route));
  for (const t of tasks) auxLines.push(...(t.name === "compression" || pinned(lines, t, 4) ? pinToGateway(lines, t, 4, route) : lines.slice(t.start, t.end)));
  setBlock(lines, "auxiliary", auxLines);
  // Subagents use the agent's own model unless delegation names another.
  const del = block(lines, "delegation");
  if (del && lines[del[0]] === "delegation:" && pinned(lines, { name: "delegation", start: del[0], end: del[1], inline: "" }, 2)) {
    lines.splice(del[0], del[1] - del[0], ...pinToGateway(lines, { name: "delegation", start: del[0], end: del[1], inline: "" }, 2, route));
  }
  // Speech stays on the computer: Whisper for speech to text and Piper for text to speech. The
  // defaults pick a cloud service when one is signed in, and Edge's text to speech is a cloud service.
  setChild(lines, "stt", "provider", "local");
  setChild(lines, "tts", "provider", "piper");
  // The retired @recursica/mcp server goes. CircleChat's own MCP server and the knowledge server stay.
  const mcp = block(lines, "mcp_servers");
  if (mcp) {
    const servers = children(lines, mcp, 2);
    const keep = servers.filter((s) => s.name !== RETIRED_MCP);
    if (keep.length !== servers.length) setBlock(lines, "mcp_servers", keep.length ? ["mcp_servers:", ...keep.flatMap((s) => lines.slice(s.start, s.end))] : []);
  }
  // Any other line that still holds a cloud key, such as an old api_key, goes.
  lines = lines.filter((l) => !keyShape(l));
  return lines.join("\n") + "\n";
}

// Each model setting in a config that would send a request anywhere but the gateway, as
// "<setting>: <why>". setup-agent.sh stops when this lists anything.
export function offGateway(config, baseUrl) {
  const lines = config.split("\n");
  const out = [];
  const m = block(lines, "model");
  const main = m ? valueOf(lines, { start: m[0], end: m[1] }, "provider", 2) : "";
  if (main !== `custom:${PROVIDER}`) out.push(`model.provider: ${main || "unset"}, not custom:${PROVIDER}`);
  const p = block(lines, "providers");
  for (const c of p && lines[p[0]] === "providers:" ? children(lines, p, 2) : []) {
    if (c.name !== PROVIDER) out.push(`providers.${c.name}: a provider other than the gateway`);
    else if (valueOf(lines, c, "api", 4) !== baseUrl) out.push(`providers.${PROVIDER}.api: not ${baseUrl}`);
  }
  if (p && lines[p[0]] !== "providers:" && !/^providers:\s*\{\}\s*$/.test(lines[p[0]])) out.push("providers: written inline, so its entries cannot be checked");
  const c = block(lines, "custom_providers");
  if (c) {
    const text = lines.slice(c[0], c[1]).join("\n");
    const names = [...text.matchAll(/name:\s*"?([^"\s]+)/g)].map((x) => x[1]);
    if (names.some((n) => n !== PROVIDER)) out.push("custom_providers: a provider other than the gateway");
    for (const u of text.matchAll(/base_url:\s*"?([^"\s]+)/g)) if (u[1] !== baseUrl) out.push(`custom_providers: base_url ${u[1]}`);
  }
  for (const name of ["fallback_providers", "fallback_model"]) {
    const b = block(lines, name);
    if (b && (b[1] > b[0] + 1 || !/:\s*(\[\]|\{\}|null|~)?\s*$/.test(lines[b[0]]))) out.push(`${name}: set`);
  }
  const comp = block(lines, "compression");
  if (comp && lines.slice(comp[0], comp[1]).some((l) => /^\s+summary_(provider|base_url):\s*\S/.test(l))) out.push("compression: names its own provider or address");
  for (const [name, depth] of [["auxiliary", 4], ["delegation", 2]]) {
    const b = block(lines, name);
    if (!b) continue;
    if (lines[b[0]] !== `${name}:` && !new RegExp(`^${name}:\\s*(\\{\\})?\\s*$`).test(lines[b[0]])) { out.push(`${name}: written inline, so it cannot be checked`); continue; }
    const sections = name === "delegation" ? [{ name, start: b[0], end: b[1], inline: "" }] : children(lines, b, 2);
    for (const s of sections) {
      const provider = valueOf(lines, s, "provider", depth);
      if (provider && provider !== "auto" && provider !== `custom:${PROVIDER}`) out.push(`${name === "delegation" ? name : `auxiliary.${s.name}`}.provider: ${provider}`);
      const url = valueOf(lines, s, "base_url", depth);
      if (url && url !== baseUrl) out.push(`${name === "delegation" ? name : `auxiliary.${s.name}`}.base_url: ${url}`);
      if (s.inline && s.inline !== "{}") out.push(`auxiliary.${s.name}: written inline, so it cannot be checked`);
    }
  }
  const stt = block(lines, "stt"), tts = block(lines, "tts");
  if (stt && valueOf(lines, { start: stt[0], end: stt[1] }, "provider", 2) !== "local") out.push("stt.provider: not local");
  if (tts && !["piper", "kittentts", "neutts"].includes(valueOf(lines, { start: tts[0], end: tts[1] }, "provider", 2))) out.push("tts.provider: not a local engine");
  return out;
}

// .env: drop every provider key line, and every line whose value looks like a cloud key.
export function scrubEnv(text) {
  return text.split("\n").filter((l) => !(KEY_NAMES.test(l.slice(0, l.indexOf("=")).trim()) || keyShape(l))).join("\n");
}

// JSON such as auth.json: drop every entry that holds a cloud key.
export function scrubJson(value) {
  if (Array.isArray(value)) return value.filter((v) => !holds(v)).map(scrubJson);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).filter(([, v]) => !holds(v)).map(([k, v]) => [k, scrubJson(v)]));
  return value;
}
const holds = (v) => (typeof v === "string" ? Boolean(keyShape(v)) : false);

// The agent can change its own home, so each file is read and written without following a
// symlink (kit/safe-files.mjs). The new file keeps the old file's mode, owner and group.
function rewrite(home, file, change) {
  const before = readFile(home, file);
  if (before === null) return false;
  const after = change(before);
  if (after === before) return false;
  writeFile(home, file, after);
  return true;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [home, handle, state, baseUrl, route, withEnv] = process.argv.slice(2);
  if (!home || !handle || !state || !baseUrl || !route) { console.error("usage: hermes-access.mjs <home> <handle> <state dir> <gateway URL> <route>"); process.exit(2); }
  const cfg = path.join(home, "config.yaml");
  let text;
  try { text = readFile(home, cfg); } catch (e) { console.error(e instanceof Refused ? `Refused: ${e.message} Nothing was written.` : e.message); process.exit(1); }
  if (text === null) { console.error(`No ${cfg}: install ${handle} in the CircleChat UI first.`); process.exit(1); }
  const old = currentKey(text);
  const who = old ? verify(old, loadKeys(state), "") : null;
  const key = who?.agent === handle && who.task === null ? old : issue(state, handle);
  const cleared = [];
  try {
  rewrite(home, cfg, (t) => writeConfig(t, { baseUrl, key, route }));
  // Every model setting must now point at the gateway. setup-agent.sh stops when one does not.
  const off = offGateway(readFile(home, cfg) ?? "", baseUrl);
  if (off.length) {
    console.error(`${handle}: these model settings in ${cfg} would send requests past the gateway. Fix each one, then rerun setup-agent.sh:\n  - ${off.join("\n  - ")}`);
    process.exit(1);
  }
  if (rewrite(home, path.join(home, ".env"), scrubEnv)) cleared.push(".env");
  if (withEnv === "env") {
    const envFile = path.join(home, ".env");
    if (readFile(home, envFile) === null) writeFile(home, envFile, "", { mode: 0o600 });
    rewrite(home, envFile, (t) => [...t.split("\n").filter((l) => l && !/^CC_GATEWAY_(URL|KEY)=/.test(l)), `CC_GATEWAY_URL=${baseUrl.replace(/\/v1$/, "")}`, `CC_GATEWAY_KEY=${key}`].join("\n") + "\n");
  }
  for (const f of ["auth.json", "credentials.json"]) {
    if (rewrite(home, path.join(home, f), (t) => { try { return JSON.stringify(scrubJson(JSON.parse(t)), null, 2) + "\n"; } catch { return t; } })) cleared.push(f);
  }
  } catch (e) { console.error(e instanceof Refused ? `Refused: ${e.message} Nothing was written there.` : e.message); process.exit(1); }
  console.log(`${handle}: model requests go to the gateway (${route})${key === old ? "" : ", with a new gateway key"}${cleared.length ? `; cloud keys removed from ${cleared.join(", ")}` : ""}.`);
}
