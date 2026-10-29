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
// a cluster model or the agent's cloud key answers. The script prints nothing secret.
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

// The gateway key the home holds now, from its custom_providers entry.
export function currentKey(config) {
  const lines = config.split("\n");
  const b = block(lines, "custom_providers");
  if (!b) return "";
  const entry = lines.slice(b[0], b[1]).join("\n");
  if (!new RegExp(`name:\\s*${PROVIDER}\\b`).test(entry)) return "";
  return entry.match(/api_key:\s*"?(cc[gt]_[^"\s]+)"?/)?.[1] ?? "";
}

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
  const c = block(lines, "custom_providers");
  if (c) lines.splice(c[0], c[1] - c[0]);
  lines.push("custom_providers:", `- name: ${PROVIDER}`, `  base_url: ${JSON.stringify(baseUrl)}`, `  api_key: ${JSON.stringify(key)}`, "  api_mode: chat_completions");
  // Compression summaries go to the same route, so a new route in site.json moves them too.
  lines = lines.map((l) => (/^summary_model:/.test(l) ? `summary_model: ${route}` : l));
  // Any other line that still holds a cloud key, such as an old api_key, goes.
  lines = lines.filter((l) => !keyShape(l));
  return lines.join("\n") + "\n";
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
