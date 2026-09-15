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
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { family, declarationsFor, readSkill } from './server.mjs'

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
  // Deliberately not the badge skill: its cross-links happen to bottom out in one hop, so it
  // passes a one-hop implementation too. The accordion's family is the deepest in the corpus at
  // four, which is what makes it the one that can tell the two apart.
  const root = 'recursica-skill-accordion'
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
  assert.deepEqual(names, ['component_api', 'list_skills', 'router', 'skill_family', 'skills_for_screen'])
})

test('router returns the design router itself', async () => {
  const [, call] = await rpc([
    { jsonrpc: '2.0', id: 1, method: 'initialize', params: {} },
    { jsonrpc: '2.0', id: 2, method: 'tools/call', params: { name: 'router', arguments: {} } },
  ])
  const payload = JSON.parse(call.result.content[0].text)
  assert.equal(payload.slug, 'recursica-skill-design-router')
  assert.match(payload.body, /Decision order/)
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
  const payload = JSON.parse(call.result.content[0].text)
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
