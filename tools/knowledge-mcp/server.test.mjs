/**
 * Tests for the knowledge MCP server.
 *
 * The first two are the ones to keep if this file is ever trimmed, and both assert a property
 * that would fail silently: a server that hands back one skill without its design rules looks
 * exactly like one that worked, and a manifest computed from files that are not there returns
 * an empty skill set that reads as a clean answer.
 */

import { test } from 'node:test'
import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import crypto from 'node:crypto'
import net from 'node:net'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { family, declarationsFor, readSkill, served, TOOLS, callTool, toolList, AGENT_PROMPTS, EXPORT_FILE } from './server.mjs'

const SERVER = fileURLToPath(new URL('./server.mjs', import.meta.url))

/** One request/response round trip against a freshly spawned server over real stdio. */
function rpc(requests) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [SERVER], { stdio: ['pipe', 'pipe', 'pipe'] })
    let out = ''
    child.stdout.on('data', (d) => { out += d })
    child.on('error', reject)
    child.on('close', () => {
      try {
        resolve(out.trim().split('\n').filter(Boolean).map((l) => JSON.parse(l)))
      } catch (err) {
        reject(new Error(`unparseable server output: ${err.message}\n${out}`))
      }
    })
    for (const r of requests) child.stdin.write(`${JSON.stringify(r)}\n`)
    child.stdin.end()
  })
}

test('skill_family never returns a skill on its own', async () => {
  // The whole reason this server exists rather than a search endpoint. A component skill says
  // what a component is; a design-rules skill says whether it belongs on the screen. Handing
  // back the first alone is the failure the router warns about in its loudest paragraph.
  const { skills } = family(['recursica-skill-badge'])
  const slugs = skills.map((s) => s.slug)
  assert.ok(slugs.includes('recursica-skill-badge'))
  assert.ok(slugs.length > 1, 'a component skill arrived with no family at all')
  assert.ok(
    slugs.includes('recursica-skill-badges-chips'),
    'the badge skill cross-links the badges-and-chips rules; it came back without them',
  )
})

test('a family is closed transitively, not one hop deep', async () => {
  // Deliberately not the badge skill: its cross-links bottom out in one hop, so it passes a
  // one-hop implementation too. The timeline needs the avatar skill, and the avatar needs the
  // navigation and buttons-links rules, which the timeline never names — only a transitive
  // closure reaches them. (This used to be the accordion, until its links to tree and tabs
  // became "only if used" and its family stopped at one hop.)
  const root = 'recursica-skill-timeline'
  const direct = new Set(readSkill(root).loadTheseToo)
  const { skills } = family([root])
  const beyondOneHop = skills
    .map((s) => s.slug)
    .filter((s) => s !== root && !direct.has(s))
  assert.ok(
    beyondOneHop.length > 0,
    'nothing beyond the first hop was reached — the closure is one level, not transitive',
  )
})

test('a slug nobody has is reported, not silently dropped', () => {
  const { skills, missing } = family(['recursica-skill-badge', 'recursica-skill-not-a-thing'])
  assert.deepEqual(missing, ['recursica-skill-not-a-thing'])
  assert.ok(skills.some((s) => s.slug === 'recursica-skill-badge'))
})

test('the handshake advertises every tool', async () => {
  const [init, list] = await rpc([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2024-11-05' } },
    { jsonrpc: '2.0', id: 2, method: 'tools/list' },
  ])
  assert.equal(init.result.serverInfo.name, 'recursica-knowledge')
  assert.match(init.result.instructions, /router/)
  const names = list.result.tools.map((t) => t.name).sort()
  assert.deepEqual(names, ['agent_prompt', 'component_api', 'knowledge_info', 'list_skills', 'router', 'skill_family', 'skill_image', 'skill_section', 'skill_text', 'skills_for_screen'])
})

test('router returns the design router itself', async () => {
  const [, call] = await rpc([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'router', arguments: {} } },
  ])
  const payload = call.result.structuredContent
  assert.equal(payload.slug, 'recursica-skill-design-router')
  assert.match(payload.body, /Decision order/)
  assert.match(payload.commit, /^[0-9a-f]{40}$/)
  assert.ok(call.result.content[0].text.endsWith(`\nknowledge commit: ${payload.commit}`), 'the text does not end with the commit line')
})

test('skills_for_screen refuses files that are not there rather than returning an empty set', async () => {
  // An empty manifest is indistinguishable from a screen with nothing on it, so the wrong path
  // has to be an error. This is the shape of failure that produced a clean review of an
  // unreviewed screen.
  const [, call] = await rpc([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    {
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'skills_for_screen', arguments: { files: ['./no/such/screen.tsx'] } },
    },
  ])
  assert.equal(call.result.isError, true)
  assert.match(call.result.content[0].text, /not on disk/)
})

test('skills_for_screen resolves a screen written against the versioned adapter line', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-mcp-'))
  const screen = path.join(dir, 'Screen.tsx')
  fs.writeFileSync(screen, `
import { Button, Table, TextField } from "@recursica/adapter-mantine-v8";
export default function Screen() { return null }
`)
  const [, call] = await rpc([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'skills_for_screen', arguments: { files: [screen] } } },
  ])
  const payload = call.result.structuredContent
  const slugs = payload.skills.map((s) => s.slug)
  assert.ok(slugs.includes('recursica-skill-table'), 'the table skill did not resolve')
  assert.ok(slugs.includes('recursica-skill-tables'), 'the tables design rules did not come with it')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('component_api says so when no adapter is installed instead of answering emptily', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-mcp-empty-'))
  const [, call] = await rpc([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    {
      jsonrpc: '2.0', id: 2, method: 'tools/call',
      params: { name: 'component_api', arguments: { component: 'Button', project_root: dir } },
    },
  ])
  assert.equal(call.result.isError, true)
  assert.match(call.result.content[0].text, /no @recursica adapter installed/)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('declarationsFor pulls a whole declaration, not the line it matched on', () => {
  const dts = `
declare type Unrelated = { a: string };
declare type ButtonProps = RecursicaOverStyled<{
  variant?: 'primary' | 'secondary';
  size?: 'sm' | 'lg';
}>;
export declare const Button: FC<ButtonProps>;
`
  const blocks = declarationsFor(dts, 'Button')
  assert.ok(blocks.some((b) => b.includes('variant') && b.includes('}>;')), 'the body was cut off')
  assert.ok(!blocks.some((b) => b.includes('Unrelated')))
})

test('the server starts when reached through a symlinked path', async () => {
  // `import.meta.url` is resolved through symlinks and `process.argv[1]` is not, so comparing
  // them as strings makes the run-as-a-command guard read false wherever any component of the
  // path is a link — which on macOS is everything under /tmp. The server then exits 0 having
  // printed nothing and served nothing, which is indistinguishable from a quiet success.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-mcp-link-'))
  const link = path.join(dir, 'server.mjs')
  fs.symlinkSync(SERVER, link)

  const banner = await new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [link], { stdio: ['pipe', 'pipe', 'pipe'] })
    let err = ''
    child.stderr.on('data', (d) => { err += d })
    child.on('error', reject)
    child.on('close', () => resolve(err))
    child.stdin.end()
  })

  assert.match(banner, /ready/, 'the server produced no banner through a symlink — the guard is comparing unresolved paths')
  fs.rmSync(dir, { recursive: true, force: true })
})

test('an alternative a skill points at is not loaded, but is named in seeAlso', () => {
  // A table points at cards as the alternative for small sets. Following that link pulled in
  // the card skill and, through it, the dashboards and data-visualization rules — six unused
  // skills on an ordinary screen. The link is still reported, so nothing is hidden.
  const { skills } = family(['recursica-skill-table'])
  const slugs = skills.map((s) => s.slug)
  assert.ok(!slugs.includes('recursica-skill-card'), 'an "only if used" link was followed')
  assert.ok(slugs.includes('recursica-skill-tables'), 'the table came back without its design rules')
  assert.ok(readSkill('recursica-skill-table').seeAlso.includes('recursica-skill-card'))
})

test('a component still loads the parts it is built from', () => {
  // A text field is a label, an input, and an assistive element. Those two are components, but
  // needs, not alternatives — a rule that loaded components only when imported would drop them.
  const slugs = family(['recursica-skill-text-field']).skills.map((s) => s.slug)
  assert.ok(slugs.includes('recursica-skill-label'))
  assert.ok(slugs.includes('recursica-skill-assistive-element'))
})

test('a served skill carries no frontmatter', () => {
  const skill = readSkill('recursica-skill-badge')
  assert.ok(!skill.body.startsWith('---'), 'the body still opens with frontmatter')
  assert.ok(!('description' in served(skill, 'full')), 'the description is repeated in a family response')
})

test('a contract is much shorter than the skill and keeps every checklist item', () => {
  for (const slug of ['recursica-skill-table', 'recursica-skill-forms']) {
    const skill = readSkill(slug)
    const { contract } = served(skill, 'contract')
    const items = (text) => (text.match(/^- \[ \]/gm) ?? []).length
    assert.equal(items(contract), items(skill.body), `${slug}: a checklist item is missing from the contract`)
    assert.ok(contract.length < skill.body.length / 2, `${slug}: the contract is not much shorter`)
  }
  const table = served(readSkill('recursica-skill-table'), 'contract')
  assert.match(table.contract, /^## When not to use a table/m)
  assert.match(table.contract, /^## Variants/m, 'the contract has no inventory')
  assert.ok(table.sections.includes('Rules'), 'the contract does not say what else can be fetched')
  assert.match(table.contract, /^## Open questions/m, 'the contract hides the list the checklist says to ask about')
  assert.ok(!/^## Rules$/m.test(table.contract), 'the contract carries the full rules')
})

test('skill_section returns one section, and names the real ones when asked for a wrong one', () => {
  const tool = TOOLS.find((t) => t.name === 'skill_section')
  const { text } = tool.handler({ slug: 'recursica-skill-table', heading: 'Rules' })
  assert.ok(text.length > 0)
  assert.ok(!/^## /m.test(text), 'the section ran on into the next one')
  assert.throws(() => tool.handler({ slug: 'recursica-skill-table', heading: 'Nope' }), /It has: .*Rules/)
})

test('a skill with images lists them, and skill_image returns one as an image', async () => {
  const skill = readSkill('recursica-skill-layouts-and-templates')
  assert.equal(skill.images.length, 32)
  assert.ok(skill.images.includes('templates/table-kpi-tiles/desktop.png'))
  assert.deepEqual(served(skill, 'full').images, skill.images)
  // A skill without images does not grow an empty field.
  assert.equal(served(readSkill('recursica-skill-tables'), 'full').images, undefined)

  const replies = await rpc([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'skill_image', arguments: { slug: 'recursica-skill-layouts-and-templates', image: 'templates/table-kpi-tiles/phone.png' } } },
    // A path that is not listed is refused, so nothing outside the skill's folder can be read.
    { jsonrpc: '2.0', id: 3, method: 'tools/call', params: { name: 'skill_image', arguments: { slug: 'recursica-skill-layouts-and-templates', image: '../recursica-skill-tables/SKILL.md' } } },
  ])
  // Replies arrive in the order the handlers finish, not the order they were sent.
  const ok = replies.find((r) => r.id === 2)
  const outside = replies.find((r) => r.id === 3)
  const image = ok.result.content.find((c) => c.type === 'image')
  assert.equal(image.mimeType, 'image/png')
  assert.equal(Buffer.from(image.data, 'base64').subarray(1, 4).toString(), 'PNG')
  assert.equal(outside.result.isError, true)
})

// ---------------------------------------------------------------- one commit per answer

const REPO = fileURLToPath(new URL('../..', import.meta.url))
const SHA_A = 'a'.repeat(40)
const SHA_B = 'b'.repeat(40)

/**
 * Two exports the way the kit's hourly update lays them out: <dir>/<sha>/ with the commit beside
 * the tree, and <dir>/current, a link to one of them. Each export links to this checkout's own
 * skills, scripts and portable folders, so only the commit differs.
 */
function exportsDir() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-mcp-exports-'))
  for (const [sha, date] of [[SHA_A, '2026-11-01T00:00:00Z'], [SHA_B, '2026-11-02T00:00:00Z']]) {
    fs.mkdirSync(path.join(dir, sha))
    for (const f of ['skills', 'scripts', 'portable']) fs.symlinkSync(path.join(REPO, f), path.join(dir, sha, f))
    fs.writeFileSync(path.join(dir, sha, EXPORT_FILE), JSON.stringify({ commit: sha, committedAt: date }))
  }
  fs.symlinkSync(SHA_A, path.join(dir, 'current'))
  const point = (sha) => {
    fs.symlinkSync(sha, path.join(dir, 'current.new'))
    fs.renameSync(path.join(dir, 'current.new'), path.join(dir, 'current'))
  }
  return { dir, current: path.join(dir, 'current'), point }
}

test('every answer names its commit, and the next call follows the switched link', async () => {
  // The hourly update moves `current` to a new export while the server runs. Each call resolves
  // the link once at its start, so a call is answered from one commit, and the next call from
  // the new one, with no restart.
  const ex = exportsDir()
  const first = await callTool('knowledge_info', {}, { mode: 'http', knowledgeRoot: ex.current })
  assert.equal(first.structuredContent.commit, SHA_A)
  assert.equal(first.structuredContent.committedAt, '2026-11-01T00:00:00Z')
  assert.match(first.structuredContent.servedSince, /^\d{4}-\d\d-\d\dT/)
  assert.ok(first.content[0].text.endsWith(`knowledge commit: ${SHA_A}`))
  ex.point(SHA_B)
  const second = await callTool('skill_text', { slug: 'recursica-skill-badge' }, { mode: 'http', knowledgeRoot: ex.current })
  assert.equal(second.structuredContent.commit, SHA_B)
  assert.ok(second.content.at(-1).text.endsWith(`knowledge commit: ${SHA_B}`))
  fs.rmSync(ex.dir, { recursive: true, force: true })
})

test('an error names the commit too', async () => {
  const ex = exportsDir()
  const r = await callTool('skill_text', { slug: 'recursica-skill-not-a-thing' }, { mode: 'http', knowledgeRoot: ex.current })
  assert.equal(r.isError, true)
  assert.equal(r.structuredContent.commit, SHA_A)
  assert.match(r.content[0].text, /^ERROR: no skill on disk named recursica-skill-not-a-thing/)
  assert.ok(r.content[0].text.endsWith(`knowledge commit: ${SHA_A}`))
  fs.rmSync(ex.dir, { recursive: true, force: true })
})

test('the service refuses a tree that names no commit', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-mcp-nocommit-'))
  fs.symlinkSync(path.join(REPO, 'skills'), path.join(dir, 'skills'))
  fs.symlinkSync(path.join(REPO, 'scripts'), path.join(dir, 'scripts'))
  const r = await callTool('router', {}, { mode: 'http', knowledgeRoot: dir })
  assert.equal(r.isError, true)
  assert.match(r.content[0].text, /names no commit/)
  fs.rmSync(dir, { recursive: true, force: true })
})

test('skill_text returns the whole SKILL.md, frontmatter included', async () => {
  const r = await callTool('skill_text', { slug: 'recursica-skill-table' })
  const want = fs.readFileSync(path.join(REPO, 'skills/components/recursica-skill-table/SKILL.md'), 'utf8')
  assert.deepEqual(
    { ...r.structuredContent, commit: undefined },
    { slug: 'recursica-skill-table', group: 'components', path: 'skills/components/recursica-skill-table/SKILL.md', text: want, commit: undefined },
  )
  assert.ok(r.structuredContent.text.startsWith('---\n'))
})

test('agent_prompt serves only the allowed agents', async () => {
  assert.deepEqual(AGENT_PROMPTS, ['barb', 'betty', 'checker', 'feisty'])
  const ok = await callTool('agent_prompt', { name: 'checker' })
  assert.equal(ok.structuredContent.path, 'portable/claude-code/agents/checker.md')
  assert.equal(ok.structuredContent.text, fs.readFileSync(path.join(REPO, 'portable/claude-code/agents/checker.md'), 'utf8'))
  for (const name of ['claire', '../checker', 'janice']) {
    const no = await callTool('agent_prompt', { name })
    assert.equal(no.isError, true, name)
    assert.match(no.content[0].text, /no prompt served/)
  }
})

test('the service takes contents and refuses paths, and stdio still takes paths', async () => {
  // The service's account can't read a caller's files. A path it can't read would be "not on
  // disk", or worse, a file of the same name on the server's own computer.
  const sources = [
    { path: 'src/Screen.tsx', text: `import { Shell } from './Shell'\nimport { Button } from "@recursica/adapter-mantine-v8";\n` },
    { path: 'src/Shell.tsx', text: `import { Table } from "@recursica/adapter-mantine-v8";\n` },
  ]
  const r = await callTool('skills_for_screen', { sources }, { mode: 'http' })
  assert.equal(r.isError, undefined, r.content[0].text)
  const slugs = r.structuredContent.skills.map((s) => s.slug)
  assert.ok(slugs.includes('recursica-skill-table'), 'the table reached through the shell did not resolve')
  assert.deepEqual(r.structuredContent.entries, ['src/Screen.tsx', 'src/Shell.tsx'])
  assert.deepEqual(r.structuredContent.uncovered.unsentFiles, [])

  const refused = await callTool('skills_for_screen', { files: ['/etc/hosts'] }, { mode: 'http' })
  assert.equal(refused.isError, true)
  assert.match(refused.content[0].text, /names a path on your computer/)
  const project = await callTool('component_api', { component: 'Button', project_root: '/' }, { mode: 'http' })
  assert.match(project.content[0].text, /names a path on your computer/)

  const http = Object.fromEntries(toolList('http').map((t) => [t.name, t.inputSchema]))
  assert.deepEqual(Object.keys(http.skills_for_screen.properties), ['sources'])
  assert.deepEqual(http.skills_for_screen.required, ['sources'])
  assert.deepEqual(Object.keys(http.component_api.properties), ['component', 'packages'])
  const stdio = Object.fromEntries(toolList('stdio').map((t) => [t.name, t.inputSchema]))
  assert.ok('files' in stdio.skills_for_screen.properties)
})

test('component_api reads prop types from the package contents a caller sends', async () => {
  const packages = [
    {
      name: '@recursica/adapter-common',
      package_json: JSON.stringify({ name: '@recursica/adapter-common', version: '1.2.3' }),
      files: [{ path: 'dist/src/components/Button/RecursicaButtonProps.d.ts', text: 'export interface RecursicaButtonProps {\n  variant?: "primary";\n}\n' }],
    },
    {
      name: '@recursica/adapter-mantine-v8',
      package_json: JSON.stringify({ version: '4.5.6' }),
      files: [{ path: 'dist/index.d.ts', text: 'declare type Other = {};\nexport declare const Button: FC<ButtonProps>;\n' }],
    },
    { name: '@recursica/adapter-tester', package_json: '{}', files: [] },
  ]
  const r = await callTool('component_api', { component: 'Button', packages }, { mode: 'http' })
  const s = r.structuredContent
  assert.deepEqual(s.adapters_installed, ['adapter-common@1.2.3', 'adapter-mantine-v8@4.5.6'])
  assert.equal(s.found[0].source, 'node_modules/@recursica/adapter-common/dist/src/components/Button/RecursicaButtonProps.d.ts')
  assert.match(s.found[0].declarations[0], /variant/)
  assert.deepEqual(s.found[1].declarations, ['export declare const Button: FC<ButtonProps>;'])
  const none = await callTool('component_api', { component: 'Button', packages: [] }, { mode: 'http' })
  assert.match(none.content[0].text, /no @recursica adapter installed among the packages sent/)
})

// ---------------------------------------------------------------- the HTTP service

const KEY = `ckm_${'1'.repeat(48)}`
const OTHER = `ckm_${'2'.repeat(48)}`
const hash = (k) => crypto.createHash('sha256').update(k).digest('hex')

function freePort() {
  return new Promise((resolve) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address()
      s.close(() => resolve(port))
    })
  })
}

/** The service as the kit runs it: a child process on 127.0.0.1, reading a keys file. */
async function service(root) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'knowledge-mcp-http-'))
  const keys = path.join(dir, 'keys.json')
  fs.writeFileSync(keys, JSON.stringify({ callers: { 'example-harness': { sha256: hash(KEY) } } }))
  const port = await freePort()
  const child = spawn(process.execPath, [SERVER, '--http'], {
    env: { ...process.env, KNOWLEDGE_ROOT: root, KNOWLEDGE_MCP_PORT: String(port), KNOWLEDGE_MCP_KEYS: keys },
    stdio: ['ignore', 'ignore', 'pipe'],
  })
  let log = ''
  await new Promise((resolve, reject) => {
    child.stderr.on('data', (d) => {
      log += d
      if (/ready/.test(log)) resolve()
    })
    child.on('exit', (code) => reject(new Error(`the service exited ${code}: ${log}`)))
  })
  const url = `http://127.0.0.1:${port}/mcp`
  const post = (body, { key = KEY, headers = {} } = {}) => fetch(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json', accept: 'application/json, text/event-stream', ...(key ? { authorization: `Bearer ${key}` } : {}), ...headers },
    body: JSON.stringify(body),
  })
  return { url, port, keys, post, log: () => log, stop: () => { child.kill(); fs.rmSync(dir, { recursive: true, force: true }) } }
}

test('the service answers a caller with a key, and refuses everyone else', async () => {
  const ex = exportsDir()
  const s = await service(ex.current)
  try {
    const call = { jsonrpc: '2.0', id: 1, method: 'tools/call', params: { name: 'knowledge_info', arguments: {} } }
    for (const [key, want] of [[null, 401], [OTHER, 401], ['not a key', 401]]) {
      const r = await s.post(call, { key })
      assert.equal(r.status, want, `key ${key}`)
      assert.equal((await r.json()).result, undefined, 'a refused request got an answer')
    }
    const ok = await s.post(call)
    assert.equal(ok.status, 200)
    assert.match(ok.headers.get('content-type'), /application\/json/)
    const j = await ok.json()
    assert.equal(j.result.structuredContent.commit, SHA_A)

    // A browser page: an Origin, or a Host that is not the loopback address.
    assert.equal((await s.post(call, { headers: { origin: 'http://example.com' } })).status, 403)
    assert.equal((await fetch(s.url, { headers: { authorization: `Bearer ${KEY}` } })).status, 405, 'GET opens no stream')

    // The handshake a plain fetch client makes: initialize, the notification, tools/list.
    const init = await (await s.post({ jsonrpc: '2.0', id: 2, method: 'initialize', params: { protocolVersion: '2025-06-18' } })).json()
    assert.equal(init.result.serverInfo.name, 'recursica-knowledge')
    assert.equal((await s.post({ jsonrpc: '2.0', method: 'notifications/initialized' })).status, 202)
    const list = await (await s.post({ jsonrpc: '2.0', id: 3, method: 'tools/list' })).json()
    assert.ok(!('files' in list.result.tools.find((t) => t.name === 'skills_for_screen').inputSchema.properties))

    // A new key in the file works at once, with no restart.
    fs.writeFileSync(s.keys, JSON.stringify({ callers: { 'example-harness': { sha256: hash(KEY) }, kev: { sha256: hash(OTHER) } } }))
    assert.equal((await s.post(call, { key: OTHER })).status, 200)
    // The log names the caller of each call, and never a key.
    assert.match(s.log(), /caller=example-harness tool=knowledge_info commit=a{40} ok/)
    assert.match(s.log(), /caller=kev tool=knowledge_info/)
    assert.ok(!s.log().includes(KEY) && !s.log().includes(OTHER), 'a key reached the log')
  } finally {
    s.stop()
    fs.rmSync(ex.dir, { recursive: true, force: true })
  }
})

test('the service listens on the loopback address only', async () => {
  const ex = exportsDir()
  const s = await service(ex.current)
  try {
    const others = Object.values(os.networkInterfaces()).flat().filter((a) => a && a.family === 'IPv4' && !a.internal).map((a) => a.address)
    for (const a of others) {
      const open = await new Promise((resolve) => {
        const c = net.connect({ host: a, port: s.port })
        c.setTimeout(1000, () => { c.destroy(); resolve(false) })
        c.once('connect', () => { c.destroy(); resolve(true) })
        c.once('error', () => resolve(false))
      })
      assert.equal(open, false, `the service answers on ${a}`)
    }
  } finally {
    s.stop()
    fs.rmSync(ex.dir, { recursive: true, force: true })
  }
})
