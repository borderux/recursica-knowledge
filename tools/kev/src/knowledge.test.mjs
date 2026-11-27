// Kev reads the skills only through the knowledge MCP server. These run against a fake server in
// this process: it answers the way the real one does, with each answer's commit.
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { knowledgeClient, KnowledgeError } from "./knowledge.mjs";
import { loadKnowledge, screenSources } from "./manifest.mjs";
import { toMarkdown } from "./report.mjs";

const KEY = `ckm_${"7".repeat(48)}`;
const A = "a".repeat(40), B = "b".repeat(40), C = "c".repeat(40);

/**
 * A fake knowledge server. commits() gives the commit of the next answer; calls holds each
 * request's tool and arguments, and the key it carried.
 */
async function fakeServer({ commits = () => A, skills = ["recursica-skill-table", "recursica-skill-tables"] } = {}) {
  const calls = [];
  const server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => { body += c; });
    req.on("end", () => {
      const auth = req.headers.authorization;
      calls.push({ auth, ...JSON.parse(body).params });
      if (auth !== `Bearer ${KEY}`) { res.writeHead(401).end("{}"); return; }
      const { id, params } = JSON.parse(body);
      const commit = commits();
      let out;
      if (params.name === "skills_for_screen") {
        out = { entries: params.arguments.sources.map((s) => s.path), files: params.arguments.sources.map((s) => s.path).sort(),
          imports: [{ name: "Table", kind: "component", skills: ["recursica-skill-table"] }],
          skills: skills.map((slug) => ({ slug, path: `skills/x/${slug}/SKILL.md` })),
          uncovered: { unmappedImports: [], ambiguousImports: [], missingSkills: [], unsentFiles: [] } };
      } else if (params.name === "skill_text" && skills.includes(params.arguments.slug)) {
        out = { slug: params.arguments.slug, group: "components", path: `skills/x/${params.arguments.slug}/SKILL.md`, text: `---\nname: ${params.arguments.slug}\n---\n\n## Pre-flight checklist\n\n- [ ] One item.\n` };
      } else {
        const text = `ERROR: no skill on disk named ${params.arguments.slug}\n\nknowledge commit: ${commit}`;
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text }], structuredContent: { error: "x", commit }, isError: true } }));
        return;
      }
      const structuredContent = { ...out, commit };
      res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ jsonrpc: "2.0", id, result: { content: [{ type: "text", text: `${JSON.stringify(structuredContent)}\n\nknowledge commit: ${commit}` }], structuredContent } }));
    });
  });
  await new Promise((r) => server.listen(0, "127.0.0.1", r));
  return { url: `http://127.0.0.1:${server.address().port}/mcp`, calls, close: () => server.close() };
}

function scratch() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "kev-knowledge-"));
  const keyFile = path.join(dir, "kev.key");
  fs.writeFileSync(keyFile, `${KEY}\n`, { mode: 0o400 });
  fs.mkdirSync(path.join(dir, "app"));
  fs.writeFileSync(path.join(dir, "app", "Screen.tsx"), `import { Shell } from './Shell'\nimport { Badge } from '@recursica/mantine-adapter'\n`);
  fs.writeFileSync(path.join(dir, "app", "Shell.tsx"), `import { Table } from '@recursica/mantine-adapter'\n`);
  return { dir, keyFile, screen: path.join(dir, "app", "Screen.tsx"), done: () => fs.rmSync(dir, { recursive: true, force: true }) };
}

test("Kev sends the screen and every local file it reaches, as contents", () => {
  const s = scratch();
  try {
    const sources = screenSources([s.screen]);
    assert.deepEqual(sources.map((x) => path.basename(x.path)), ["Screen.tsx", "Shell.tsx"]);
    assert.match(sources[1].text, /Table/);
    assert.throws(() => screenSources([path.join(s.dir, "app", "Missing.tsx")]), /no screen file/);
  } finally { s.done(); }
});

test("the manifest and every skill come from one commit, with Kev's key", async () => {
  const s = scratch(), srv = await fakeServer();
  try {
    const k = await loadKnowledge(knowledgeClient({ url: srv.url, keyFile: s.keyFile }), [s.screen]);
    assert.equal(k.commit, A);
    assert.deepEqual(k.skills.map((x) => x.slug), ["recursica-skill-table", "recursica-skill-tables"]);
    assert.match(k.skills[0].text, /Pre-flight checklist/);
    assert.deepEqual(k.manifest.componentsFor, { "recursica-skill-table": ["Table"] });
    assert.equal(k.manifest.entries[0], s.screen);
    assert.ok(srv.calls.every((c) => c.auth === `Bearer ${KEY}`));
    assert.ok(!srv.calls.some((c) => JSON.stringify(c.arguments).includes('"files"')), "Kev sent a path for the server to read");
  } finally { srv.close(); s.done(); }
});

test("a switch of commits during a run reads everything again once, and a second switch fails", async () => {
  const s = scratch();
  // The manifest from A, then the skills from B: the run starts over, all on B.
  let n = 0;
  const once = await fakeServer({ commits: () => (n++ === 0 ? A : B) });
  try {
    const k = await loadKnowledge(knowledgeClient({ url: once.url, keyFile: s.keyFile }), [s.screen]);
    assert.equal(k.commit, B);
    assert.equal(once.calls.filter((c) => c.name === "skills_for_screen").length, 2);
  } finally { once.close(); }
  // A, then B, then C: a second switch fails the run plainly.
  let m = 0;
  const twice = await fakeServer({ commits: () => [A, B, B, B, C][Math.min(m++, 4)] });
  try {
    await assert.rejects(loadKnowledge(knowledgeClient({ url: twice.url, keyFile: s.keyFile }), [s.screen]), /moved to a new commit twice/);
  } finally { twice.close(); s.done(); }
});

test("a refused key, a missing setting and a tool error each stop the run with the reason", async () => {
  const s = scratch(), srv = await fakeServer({ skills: ["recursica-skill-table"] });
  try {
    fs.chmodSync(s.keyFile, 0o600);
    fs.writeFileSync(s.keyFile, `ckm_${"9".repeat(48)}`);
    await assert.rejects(knowledgeClient({ url: srv.url, keyFile: s.keyFile }).call("skill_text", { slug: "recursica-skill-table" }), /refused Kev's key/);
    fs.writeFileSync(s.keyFile, KEY);
    await assert.rejects(knowledgeClient({ url: srv.url, keyFile: s.keyFile }).call("skill_text", { slug: "nope" }), (e) => e instanceof KnowledgeError && /skill_text: no skill on disk named nope$/.test(e.message));
    assert.throws(() => knowledgeClient({ keyFile: s.keyFile }), /KNOWLEDGE_MCP_URL is not set/);
    assert.throws(() => knowledgeClient({ url: srv.url }), /KNOWLEDGE_MCP_KEY_FILE is not set/);
    assert.throws(() => knowledgeClient({ url: srv.url, keyFile: path.join(s.dir, "none") }), /can't read its knowledge server key/);
  } finally { srv.close(); s.done(); }
});

test("the report names the knowledge commit", () => {
  const md = toMarkdown({ entries: ["Screen.tsx"], files: ["Screen.tsx"], skills: [], usage: { requests: 0, cacheHits: 0, input_tokens: 0 }, seconds: 1, model: "mock", screenFits: true, commit: A });
  assert.match(md, new RegExp(`_knowledge commit ${A}_$`));
});
