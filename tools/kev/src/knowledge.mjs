// The knowledge MCP server, the one way Kev reads the skills (tools/knowledge-mcp/server.mjs, in
// its HTTP mode). Kev sends the screen's files as contents, never as paths: the server runs as its
// own account and can't read Kev's. Each answer names the knowledge commit it came from.
//
//   KNOWLEDGE_MCP_URL        the server, such as http://127.0.0.1:4011/mcp
//   KNOWLEDGE_MCP_KEY_FILE   the file that holds Kev's key, readable only by the account Kev runs as
import fs from "node:fs";

export class KnowledgeError extends Error {}

/** A client for one run. call(tool, args) gives the answer's structuredContent, which holds `commit`. */
export function knowledgeClient({ url, keyFile, fetchImpl = globalThis.fetch, timeoutMs = 120_000 } = {}) {
  if (!url) throw new KnowledgeError("KNOWLEDGE_MCP_URL is not set. Kev reads the skills only through the knowledge MCP server, such as http://127.0.0.1:4011/mcp.");
  if (!keyFile) throw new KnowledgeError("KNOWLEDGE_MCP_KEY_FILE is not set: the file that holds Kev's key for the knowledge MCP server.");
  let key;
  try {
    key = fs.readFileSync(keyFile, "utf8").trim();
  } catch (e) {
    throw new KnowledgeError(`Kev can't read its knowledge server key at ${keyFile}: ${e.code ?? e.message}.`);
  }
  if (!key) throw new KnowledgeError(`${keyFile} holds no key.`);
  let id = 0;
  async function call(name, args = {}) {
    let r;
    try {
      r = await fetchImpl(url, {
        method: "POST",
        headers: { "content-type": "application/json", accept: "application/json, text/event-stream", authorization: `Bearer ${key}` },
        body: JSON.stringify({ jsonrpc: "2.0", id: ++id, method: "tools/call", params: { name, arguments: args } }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (e) {
      throw new KnowledgeError(`the knowledge server at ${url} did not answer: ${e.cause?.message ?? e.message}`);
    }
    if (r.status === 401) throw new KnowledgeError(`the knowledge server refused Kev's key (${keyFile}). The kit makes a new one: see circlechat/README.md, "The knowledge MCP server".`);
    if (!r.ok) throw new KnowledgeError(`the knowledge server answered ${r.status} to ${name}`);
    const j = await r.json();
    if (j.error) throw new KnowledgeError(`the knowledge server refused ${name}: ${j.error.message}`);
    const out = j.result?.structuredContent;
    if (j.result?.isError) {
      const text = (j.result.content ?? []).map((c) => c.text ?? "").join("\n").replace(/\n*knowledge commit: \S+\s*$/, "");
      throw new KnowledgeError(`${name}: ${text.replace(/^ERROR: /, "")}`);
    }
    if (!out || !/^[0-9a-f]{40}$/.test(out.commit ?? "")) throw new KnowledgeError(`the knowledge server's answer to ${name} names no commit`);
    return out;
  }
  return { call, url };
}
