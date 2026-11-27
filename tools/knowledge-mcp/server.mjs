#!/usr/bin/env node
// Recursica knowledge MCP server.
//
// Serves the design system's own skills to the agents that build, review and maintain them —
// Betty, Barb, Alan — without any of them holding the corpus in context. There are 64 skill
// files totalling roughly a quarter of a million tokens, which does not fit alongside an
// application.
//
// It serves the skills in the checkout. It holds no copy of them, and that is the whole point:
// an earlier MCP server duplicated the knowledge into its own package, so the published server
// and the repository drifted and nobody could say which one an agent had read.
//
// ---------------------------------------------------------------------------------------
// The one design rule this server exists to enforce
//
// `skill_family` NEVER returns a single skill. It returns the skill plus everything its
// `## Related skills` section names, transitively.
//
// This is not a convenience. The router's loudest rule is "load the family, not one file": a
// component skill says what a component is, a design-rules skill says whether it belongs on the
// screen, and working from the first alone is the most common way to produce something
// individually correct and collectively wrong. A retrieval server that answers "which skill is
// closest to my query" reproduces exactly that failure while looking like it helped, so this
// one has no such tool. Ask for a component and you get its rules too, whether you wanted them
// or not.
//
// ---------------------------------------------------------------------------------------
// Two modes:
//
//   node server.mjs           stdio, for a person's Claude Code. Reads the checkout it runs from.
//   node server.mjs --http    the service: MCP Streamable HTTP at http://127.0.0.1:<port>/mcp,
//                             stateless, on loopback only, with a key per caller. Callers send
//                             file contents, never paths: the server's account can't read theirs.
//
// Every tools/call answer names the knowledge commit it served: `structuredContent.commit`, and
// the text ends with the line `knowledge commit: <40-hex>`. Each call is answered wholly from one
// commit. KNOWLEDGE_ROOT may be a link that the kit's hourly update moves to a new export
// (circlechat/kit/knowledge-export.mjs); the link is resolved once at the start of each call, and
// the old export stays on disk for a while, so a call never reads two commits.
//
// Env:
//   KNOWLEDGE_ROOT        the knowledge tree: a checkout, or an export such as
//                         /opt/recursica-knowledge/current. Defaults to this file's own repository.
//   KNOWLEDGE_MCP_PORT    --http: the port on 127.0.0.1
//   KNOWLEDGE_MCP_KEYS    --http: the callers' key hashes, { "callers": { "<name>": { "sha256" } } }.
//                         Read again whenever the file changes, so a new key needs no restart.
//
// Zero dependencies, on purpose: the same reason the drive fence has none. This is the surface
// every design decision gets made against, and it should be auditable in one file.

import crypto from 'node:crypto'
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import http from 'node:http'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SERVER_NAME = 'recursica-knowledge'
const SERVER_VERSION = '0.2.0'
const DEFAULT_PROTOCOL = '2024-11-05'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(process.env.KNOWLEDGE_ROOT || path.join(HERE, '..', '..'))
const CATEGORIES = ['meta', 'design-rules', 'psychology', 'components']
const ROUTER_SLUG = 'recursica-skill-design-router'
const STARTED = new Date()
// The file an export carries beside its tree (circlechat/kit/knowledge-export.mjs): the commit and
// the commit's date. A git archive has no .git, so the export says which commit it is.
export const EXPORT_FILE = '.knowledge-export.json'
const SHA = /^[0-9a-f]{40}$/

// The agent prompts agent_prompt serves: the design reviewer's and the designer's, and the review's
// checkers. Every other agent's prompt is refused, because several of them work on client data and
// their prompts describe that data's fences.
export const AGENT_PROMPTS = ['barb', 'betty', 'checker', 'feisty']

function logf(...parts) {
  process.stderr.write(`[${SERVER_NAME}] ${parts.join(' ')}\n`)
}

export { TOOLS }

// ---------------------------------------------------------------- one commit per call

/**
 * The tree one call is answered from: the knowledge root resolved through any link, the commit it
 * holds, the commit's date, and since when the root has pointed at it. Taken once at the start of
 * each call, and every read in the call goes through `root`.
 */
export function snapshot(knowledgeRoot = ROOT) {
  const root = fs.realpathSync(knowledgeRoot)
  if (!fs.existsSync(path.join(root, 'skills'))) throw new Error(`no skills/ under ${root}`)
  let commit = null
  let committedAt = null
  try {
    const meta = JSON.parse(fs.readFileSync(path.join(root, EXPORT_FILE), 'utf8'))
    if (SHA.test(meta.commit)) ({ commit, committedAt = null } = meta)
  } catch {
    // Not an export: a checkout, read with git below.
  }
  if (!commit) {
    try {
      const out = execFileSync('git', ['-C', root, 'log', '-1', '--format=%H %cI'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
      const [h, at] = out.split(' ')
      if (SHA.test(h)) { commit = h; committedAt = at ?? null }
    } catch {
      // No git here. The commit stays unknown, and the HTTP mode refuses to serve it.
    }
  }
  let servedSince = STARTED.toISOString()
  try {
    const st = fs.lstatSync(knowledgeRoot)
    if (st.isSymbolicLink()) servedSince = st.mtime.toISOString()
  } catch {
    // The root itself is the tree.
  }
  return { root, skills: path.join(root, 'skills'), commit, committedAt, servedSince }
}

// The manifest module of one tree. It is imported rather than reimplemented, and that is a
// correctness requirement rather than tidiness. Barb computes applicability with this same module;
// a second implementation here would drift from hers, and the drift would be silent — a review
// that checked the wrong set of skills reads exactly like a review that found nothing. Each export
// has its own copy, and the call uses the copy of the commit it serves.
function manifestModule(snap) {
  return import(pathToFileURL(path.join(snap.root, 'scripts', 'screen-skill-manifest.mjs')).href)
}

// The cross-link parser. A call parses links with its own commit's manifest module (callTool loads
// it into the snapshot). A helper called directly, as the tests do, uses the parser of the tree
// the server started on.
let crossLinksAtStart = null
async function loadCrossLinks() {
  crossLinksAtStart = (await manifestModule(snapshot())).crossLinks
}
const crossLinks = (text, snap) => (snap?.manifest?.crossLinks ?? crossLinksAtStart)(text)

// ---------------------------------------------------------------- skills on disk

/** Where a skill slug lives, or null if no skill of that name is on disk. */
function locate(slug, snap = snapshot()) {
  if (typeof slug !== 'string' || !/^[a-z0-9][a-z0-9-]*$/.test(slug)) return null
  for (const category of CATEGORIES) {
    const p = path.join(snap.skills, category, slug, 'SKILL.md')
    if (fs.existsSync(p)) return p
  }
  return null
}

/** The `## ` section of a skill body, up to the next `## ` or end of file. */
function section(text, heading) {
  const start = text.indexOf(`\n## ${heading}\n`)
  if (start === -1) return null
  const from = start + heading.length + 5
  const next = text.indexOf('\n## ', from)
  return next === -1 ? text.slice(from) : text.slice(from, next)
}

function frontmatter(body) {
  const m = body.match(/^---\n([\s\S]*?)\n---\n/)
  if (!m) return {}
  const out = {}
  for (const line of m[1].split('\n')) {
    const kv = line.match(/^([a-z_]+):\s*(.*)$/i)
    if (kv) out[kv[1]] = kv[2].trim()
  }
  return out
}

const IMAGE_TYPES = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml' }

/**
 * The images a skill ships beside its SKILL.md, as paths relative to the skill's folder. The
 * layout templates are pictures, and a skill that names an image the agent cannot reach is a
 * rule with its example missing.
 */
function skillImages(dir, prefix = '') {
  const out = []
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? `${prefix}/${entry.name}` : entry.name
    if (entry.isDirectory()) out.push(...skillImages(dir, rel))
    else if (IMAGE_TYPES[path.extname(entry.name).toLowerCase()]) out.push(rel)
  }
  return out.sort()
}

/**
 * A skill as served. `body` is the text after the frontmatter: the frontmatter's description is
 * for choosing a skill, and once one is chosen it is about 250 tokens of repetition per skill —
 * 6% of an ordinary screen's family. It is still returned, once, as `description`, where
 * list_skills needs it. `text` is the whole file, for skill_text.
 */
function readSkill(slug, snap = snapshot()) {
  const where = locate(slug, snap)
  if (!where) return null
  const text = fs.readFileSync(where, 'utf8')
  const meta = frontmatter(text)
  const links = crossLinks(text, snap)
  return {
    slug,
    path: path.relative(snap.root, where),
    category: path.basename(path.dirname(path.dirname(where))),
    description: meta.description ?? null,
    loadTheseToo: links.needs,
    seeAlso: links.ifUsed,
    images: skillImages(path.dirname(where)),
    body: text.replace(/^---\n[\s\S]*?\n---\n+/, ''),
    text,
  }
}

/** The `## ` headings of a skill body, in order. */
function headings(body) {
  return [...body.matchAll(/^## (.+?)\s*$/gm)].map((m) => m[1])
}

/**
 * The sections that carry a skill's rules in their shortest form. The pre-flight checklist holds
 * every rule as a statement that can be checked; a component's "When not to use …" table and its
 * inventory hold what the checklist points at. The open questions are in too, because the
 * checklist ends by telling the agent to ask about them rather than decide, and an agent that
 * cannot see the list cannot follow that. Together they are about a fifth of the full text.
 * The reasoning behind any item is one skill_section call away.
 *
 * Two component headings name the component — "When not to use a table" — so they are found by
 * shape. The rest are fixed words: "Variants", "Rules", "Open questions". scripts/lib/
 * skill-sections.mjs states the same headings; this server is deployed on its own and keeps its
 * own copy.
 */
const UNCOVERED = 'Open questions'
const CHECKLIST = 'Pre-flight checklist'
const INVENTORY = Symbol('inventory')
const CONTRACT_SECTIONS = {
  components: [/^When not to use .+/, INVENTORY, UNCOVERED, CHECKLIST],
  default: [UNCOVERED, CHECKLIST],
}

/** The heading `want` names in a skill body — an exact title, a RegExp, or INVENTORY — or null. */
function findHeading(body, want) {
  const all = headings(body)
  if (want === INVENTORY) return all.includes('Variants') ? 'Variants' : null
  if (want instanceof RegExp) return all.find((t) => want.test(t)) ?? null
  return all.includes(want) ? want : null
}

function contract(skill) {
  const wanted = CONTRACT_SECTIONS[skill.category] ?? CONTRACT_SECTIONS.default
  const parts = wanted
    .map((w) => findHeading(skill.body, w))
    .filter((h) => h !== null)
    .map((h) => [h, section(`\n${skill.body}`, h)])
    .filter(([, text]) => text && text.trim())
    .map(([h, text]) => `## ${h}\n${text.trimEnd()}`)
  return parts.join('\n\n')
}

/** What a skill_family entry carries, at the requested detail. */
function served(skill, detail) {
  const base = { slug: skill.slug, category: skill.category, path: skill.path, seeAlso: skill.seeAlso }
  // Named, not inlined: thirty-two images in every family that includes the skill would bury
  // the rules. The paths are relative to the skill's folder; skill_image returns one.
  if (skill.images?.length) base.images = skill.images
  if (detail === 'contract') return { ...base, sections: headings(skill.body), contract: contract(skill) }
  return { ...base, body: skill.body }
}

/** A skill and everything its cross-links reach, breadth-first. Never one file alone. */
function family(slugs, snap = snapshot()) {
  const seen = new Set()
  const missing = []
  const out = []
  const queue = [...slugs]
  while (queue.length) {
    const slug = queue.shift()
    if (seen.has(slug)) continue
    const skill = readSkill(slug, snap)
    if (!skill) {
      missing.push(slug)
      continue
    }
    seen.add(slug)
    out.push(skill)
    queue.push(...skill.loadTheseToo)
  }
  return { skills: out, missing: [...new Set(missing)] }
}

function allSlugs(snap = snapshot()) {
  const out = []
  for (const category of CATEGORIES) {
    const dir = path.join(snap.skills, category)
    if (!fs.existsSync(dir)) continue
    for (const entry of fs.readdirSync(dir)) {
      if (fs.existsSync(path.join(dir, entry, 'SKILL.md'))) out.push({ slug: entry, category })
    }
  }
  return out
}

// ---------------------------------------------------------------- adapter APIs

/**
 * The adapter packages installed in a project, by shape rather than by one hardcoded name.
 *
 * `adapter-common` is included deliberately and `adapter-tester` is not: the per-component
 * `Recursica<Name>Props` interfaces — the props a screen actually sets — live in common, while
 * the adapter package re-exports them wrapped in the underlying library's own type. Reading only
 * the adapter gives you `RecursicaOverStyled<Omit<ButtonProps, ...> & RecursicaButtonProps>`,
 * which names the answer without containing it.
 *
 * Each package is `{ name, version, read(rel), where(rel) }`: `read` gives a file's text or null,
 * by its path inside the package, and `where` names the file in the answer.
 */
const isAdapter = (name) => /adapter/.test(name) && name !== 'adapter-tester'

function adapterPackages(projectRoot) {
  const scope = path.join(projectRoot, 'node_modules', '@recursica')
  if (!fs.existsSync(scope)) return []
  return fs
    .readdirSync(scope)
    .filter(isAdapter)
    .map((name) => {
      const dir = path.join(scope, name)
      let version = null
      try {
        version = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version
      } catch {
        /* a package with no readable manifest is still worth reporting by name */
      }
      const read = (rel) => {
        const f = path.join(dir, rel)
        return fs.existsSync(f) ? fs.readFileSync(f, 'utf8') : null
      }
      return { name, version, read, where: (rel) => path.relative(projectRoot, path.join(dir, rel)) }
    })
}

/**
 * The same packages from contents a caller sent: `[{ name, package_json, files: [{ path, text }] }]`.
 * `name` is the package's name, with or without the @recursica/ scope; each file's path is its path
 * inside the package, such as dist/index.d.ts.
 */
export function sentPackages(packages) {
  if (!Array.isArray(packages)) throw new Error('packages must be a list of { name, package_json, files: [{ path, text }] }')
  return packages
    .map((p) => {
      if (!p || typeof p.name !== 'string') throw new Error('each package needs its name, such as @recursica/adapter-common')
      const name = p.name.replace(/^@recursica\//, '')
      let version = null
      try {
        version = JSON.parse(String(p.package_json ?? '')).version ?? null
      } catch {
        /* reported by name, as on disk */
      }
      const files = new Map()
      for (const f of p.files ?? []) {
        if (!f || typeof f.path !== 'string' || typeof f.text !== 'string') throw new Error(`${p.name}: each file must be { path, text }`)
        files.set(path.posix.normalize(f.path.replace(/^\.\//, '')), f.text)
      }
      return { name, version, read: (rel) => files.get(rel) ?? null, where: (rel) => `node_modules/@recursica/${name}/${rel}` }
    })
    .filter((p) => isAdapter(p.name))
}

/** Declaration blocks naming a component, pulled out of a `.d.ts` bundle. */
function declarationsFor(dts, component) {
  const lines = dts.split('\n')
  const wanted = new RegExp(`\\b(${component}|Recursica${component})(Props)?\\b`)
  const blocks = []
  for (let i = 0; i < lines.length; i++) {
    if (!/^(export )?declare |^export (interface|type|const) |^interface |^type /.test(lines[i])) continue
    if (!wanted.test(lines[i])) continue
    // A declaration runs to its closing brace, or is a single line when it has no body.
    let depth = 0
    let j = i
    do {
      depth += (lines[j].match(/\{/g) ?? []).length - (lines[j].match(/\}/g) ?? []).length
      j++
    } while (j < lines.length && depth > 0)
    blocks.push(lines.slice(i, j).join('\n'))
    i = j - 1
  }
  return blocks
}

/** The files component_api reads in one package, by their paths inside it. */
export const componentFiles = (component) => [`dist/src/components/${component}/Recursica${component}Props.d.ts`, 'dist/index.d.ts']

function componentApiFrom(component, packages, where) {
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(String(component ?? ''))) throw new Error('component must be a component name as exported, such as Button')
  if (packages.length === 0) {
    throw new Error(
      `no @recursica adapter installed ${where}. Run the project's install first — ` +
      `reading prop types from another project's version is how you build against an API this ` +
      `one does not ship.`,
    )
  }

  const [directFile, bundleFile] = componentFiles(component)
  const found = []
  for (const pkg of packages) {
    // The per-component file in adapter-common is the precise answer when it exists.
    const direct = pkg.read(directFile)
    if (direct !== null) {
      found.push({ package: pkg.name, version: pkg.version, source: pkg.where(directFile), declarations: [direct.trim()] })
      continue
    }
    const bundle = pkg.read(bundleFile)
    if (bundle === null) continue
    const declarations = declarationsFor(bundle, component)
    if (declarations.length) found.push({ package: pkg.name, version: pkg.version, source: pkg.where(bundleFile), declarations })
  }

  return {
    component,
    adapters_installed: packages.map((p) => `${p.name}@${p.version ?? '?'}`),
    found,
    // Absence is an answer, and it is the one worth acting on: a prop documented in a skill but
    // absent from the installed package is a problem to find before building on it.
    note: found.length
      ? 'Prop types are from the version this project installs, not from the repository.'
      : `No declaration naming ${component} in any installed adapter. Either the component is ` +
        `not exported by this version, or it is spelled differently here. Check before you build ` +
        `on a skill that says it exists.`,
  }
}

function componentApi(component, projectRoot) {
  return { ...componentApiFrom(component, adapterPackages(projectRoot), `under ${projectRoot}`), project_root: projectRoot }
}

// ---------------------------------------------------------------- tools

// Inputs that name a path on the caller's computer. The stdio server runs as the person, so it can
// read their files; the service can't, and refuses them.
const STDIO_ONLY = { skills_for_screen: ['files'], component_api: ['project_root'] }

const TOOLS = [
  {
    name: 'router',
    description:
      'The design router: the decision order for building a screen, which skill owns each ' +
      'decision, the precedence when two rules collide, and when to stop and ask rather than ' +
      'guess. Load this FIRST, before any other Recursica skill, for any UI work larger than a ' +
      'single component. It routes and arbitrates; it never replaces the owning skill.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler(_args, snap = snapshot()) {
      const skill = readSkill(ROUTER_SLUG, snap)
      if (!skill) throw new Error(`${ROUTER_SLUG} is not on disk under ${snap.skills}`)
      const { text, ...rest } = skill
      return rest
    },
  },
  {
    name: 'skills_for_screen',
    description:
      'Which skills apply to real screen files — computed from the adapter components they ' +
      'import, followed transitively through local relative imports and through each component ' +
      "skill's cross-links, plus the design rules that apply to every screen. Use this instead " +
      'of deciding for yourself which components are on the screen; a component that arrived ' +
      'from a scaffolding example does not feel placed and is exactly the one that gets missed. ' +
      'Send each file as `sources`: its path, as a label, and its text, with every local file the ' +
      'screen imports. Returns slugs and paths, not bodies — pass the slugs to skill_family. Read ' +
      '`uncovered`: an import nothing mapped, and a local import of a file not sent, are reported ' +
      'there rather than silently dropped.',
    inputSchema: {
      type: 'object',
      properties: {
        sources: {
          type: 'array',
          description: 'The screen files and the local files they import, each as { path, text }. The path is a label, such as the path in your checkout.',
          minItems: 1,
          items: {
            type: 'object',
            properties: { path: { type: 'string' }, text: { type: 'string' } },
            required: ['path', 'text'],
            additionalProperties: false,
          },
        },
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'stdio only: absolute paths to the screen files. Relative paths resolve against the server process, which is not your project.',
          minItems: 1,
        },
      },
      additionalProperties: false,
    },
    async handler({ sources, files }, snap = snapshot()) {
      const m = snap.manifest ?? (await manifestModule(snap))
      if (sources !== undefined) {
        if (files !== undefined) throw new Error('send sources or files, not both')
        if (typeof m.manifestSources !== 'function') throw new Error(`the manifest script at commit ${snap.commit ?? 'unknown'} takes no file contents`)
        return m.manifestSources(sources)
      }
      if (!Array.isArray(files) || files.length === 0) throw new Error('sources must be a non-empty list of { path, text }')
      const missing = files.filter((f) => !fs.existsSync(f))
      if (missing.length) {
        throw new Error(
          `not on disk: ${missing.join(', ')}. Use absolute paths — a relative path resolves ` +
          `against this server's working directory, and a manifest computed from no files is ` +
          `an empty skill set that looks like a clean answer.`,
        )
      }
      return m.manifest(files)
    },
  },
  {
    name: 'skill_family',
    description:
      'One or more skills PLUS every skill their "Related skills" sections say they need, ' +
      'transitively. It never returns a skill alone, because a component skill tells you what a ' +
      'component is and a design-rules skill tells you whether it belongs on the screen — reading ' +
      'the first without the second is the most common way to produce something individually ' +
      'correct and collectively wrong. Ask for what you need; the family comes with it. ' +
      'detail "full" (the default) returns every skill whole — use it whenever it fits. detail ' +
      '"contract" returns each skill\'s checklist and open questions, and for a component its ' +
      'inventory and "When not to use …" table: about a quarter of the text. Builders working ' +
      'from contracts broke more rules than builders reading full text, above all accessibility ' +
      'rules, so use it only when the full family will not fit, and call skill_section for each ' +
      'component\'s Accessibility section and for the reasoning behind any item you are unsure ' +
      'how to apply. Each skill lists `seeAlso`: alternatives it points at, not loaded unless asked for.',
    inputSchema: {
      type: 'object',
      properties: {
        slugs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Skill slugs, e.g. recursica-skill-table.',
          minItems: 1,
        },
        detail: {
          type: 'string',
          enum: ['full', 'contract'],
          description: 'full: every skill whole (default). contract: checklists, open questions, inventories and "When not to use …" tables only.',
        },
      },
      required: ['slugs'],
      additionalProperties: false,
    },
    handler({ slugs, detail = 'full' }, snap = snapshot()) {
      if (!Array.isArray(slugs) || slugs.length === 0) throw new Error('slugs must be a non-empty array')
      if (!['full', 'contract'].includes(detail)) throw new Error('detail must be "full" or "contract"')
      const { skills, missing } = family(slugs, snap)
      if (skills.length === 0) {
        throw new Error(`no skill on disk named: ${missing.join(', ')}. Call list_skills for the real names.`)
      }
      return {
        requested: slugs,
        // Say what arrived beyond what was asked for, so the caller can see the family working
        // rather than wonder why the response is longer than the question.
        pulled_in: skills.map((s) => s.slug).filter((s) => !slugs.includes(s)),
        missing,
        detail,
        skills: skills.map((s) => served(s, detail)),
      }
    },
  },
  {
    name: 'skill_section',
    description:
      'One `## ` section of one skill, by heading — the reasoning behind a checklist item, the ' +
      'full rules a contract summarizes, or the open questions before you decide something. Use ' +
      'it after skill_family with detail "contract", instead of loading whole skills. An unknown ' +
      'heading returns the headings that exist.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Skill slug, e.g. recursica-skill-table.' },
        heading: { type: 'string', description: 'The section heading without the ##, exactly as the skill writes it, e.g. "Rules". A contract lists them under `sections`.' },
      },
      required: ['slug', 'heading'],
      additionalProperties: false,
    },
    handler({ slug, heading }, snap = snapshot()) {
      const skill = readSkill(slug, snap)
      if (!skill) throw new Error(`no skill on disk named ${slug}. Call list_skills for the real names.`)
      const text = section(`\n${skill.body}`, heading)
      if (text === null) {
        throw new Error(`${slug} has no section "${heading}". It has: ${headings(skill.body).join('; ')}`)
      }
      return { slug, heading, text: text.trim() }
    },
  },
  {
    name: 'skill_text',
    description:
      'The whole SKILL.md of one skill, frontmatter included, exactly as the commit holds it — for ' +
      'a checker that walks one skill\'s checklist, or a code check that reads a rule. To build or ' +
      'review a screen, use skill_family instead: one skill alone is the failure that tool prevents.',
    inputSchema: {
      type: 'object',
      properties: { slug: { type: 'string', description: 'Skill slug, e.g. recursica-skill-table.' } },
      required: ['slug'],
      additionalProperties: false,
    },
    handler({ slug }, snap = snapshot()) {
      const skill = readSkill(slug, snap)
      if (!skill) throw new Error(`no skill on disk named ${slug}. Call list_skills for the real names.`)
      return { slug, group: skill.category, path: skill.path, text: skill.text }
    },
  },
  {
    name: 'agent_prompt',
    description:
      `One agent's built prompt for Claude Code, portable/claude-code/agents/<name>.md, front ` +
      `matter included. Only these agents: ${AGENT_PROMPTS.join(', ')}.`,
    inputSchema: {
      type: 'object',
      properties: { name: { type: 'string', enum: AGENT_PROMPTS, description: 'The agent, e.g. checker.' } },
      required: ['name'],
      additionalProperties: false,
    },
    handler({ name }, snap = snapshot()) {
      if (!AGENT_PROMPTS.includes(name)) throw new Error(`no prompt served for ${JSON.stringify(name)}. This server serves only: ${AGENT_PROMPTS.join(', ')}`)
      const rel = path.posix.join('portable', 'claude-code', 'agents', `${name}.md`)
      const file = path.join(snap.root, rel)
      if (!fs.existsSync(file)) throw new Error(`${rel} is not in commit ${snap.commit ?? 'unknown'}`)
      return { name, path: rel, text: fs.readFileSync(file, 'utf8') }
    },
  },
  {
    name: 'knowledge_info',
    description:
      'Which knowledge commit this server serves now: the commit, its date, and since when the ' +
      'server has served it. Every other answer names its commit too.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler(_args, snap = snapshot()) {
      return { committedAt: snap.committedAt, servedSince: snap.servedSince }
    },
  },
  {
    name: 'skill_image',
    description:
      'One image a skill ships, such as a layout template, returned as an image. A served skill ' +
      'lists its images under `images`, as paths relative to the skill\'s folder.',
    inputSchema: {
      type: 'object',
      properties: {
        slug: { type: 'string', description: 'Skill slug, e.g. recursica-skill-layouts-and-templates.' },
        image: { type: 'string', description: 'The path exactly as the skill lists it under `images`, e.g. templates/table-kpi-tiles/desktop.png.' },
      },
      required: ['slug', 'image'],
      additionalProperties: false,
    },
    handler({ slug, image }, snap = snapshot()) {
      const skill = readSkill(slug, snap)
      if (!skill) throw new Error(`no skill on disk named ${slug}. Call list_skills for the real names.`)
      // Only a listed image, so no path can reach outside the skill's folder.
      if (!skill.images.includes(image)) {
        throw new Error(`${slug} has no image "${image}". It has: ${skill.images.join('; ') || 'none'}`)
      }
      const file = path.join(snap.root, path.dirname(skill.path), image)
      const mimeType = IMAGE_TYPES[path.extname(image).toLowerCase()]
      return {
        content: [
          { type: 'text', text: `${slug}/${image}` },
          { type: 'image', data: fs.readFileSync(file).toString('base64'), mimeType },
        ],
        structured: { slug, image, mimeType },
      }
    },
  },
  {
    name: 'list_skills',
    description:
      'Every skill on disk with its slug, category and one-line description. For finding the ' +
      'right slug when you do not have screen files to compute from. Descriptions only — call ' +
      'skill_family for the rules themselves.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler(_args, snap = snapshot()) {
      const all = allSlugs(snap)
      return {
        count: all.length,
        skills: all.map(({ slug, category }) => {
          const skill = readSkill(slug, snap)
          return { slug, category, description: skill?.description ?? null }
        }),
      }
    },
  },
  {
    name: 'component_api',
    description:
      "A component's real prop types, read from the Recursica adapter the project actually " +
      'installs — not from prose, and not from another project\'s version. Use it before ' +
      'building on a prop a skill mentions: a prop documented in a skill and absent from the ' +
      'installed package is a problem to find first rather than after. Absence is reported, ' +
      'never treated as nothing to say. Send `packages`: each installed @recursica adapter ' +
      'package (adapter-common included, adapter-tester left out) with its package.json text and ' +
      `the files it has of: ${componentFiles('<Component>').join(', ')}.`,
    inputSchema: {
      type: 'object',
      properties: {
        component: { type: 'string', description: 'Component name as exported, e.g. Button.' },
        packages: {
          type: 'array',
          description: 'The installed adapter packages, each as { name, package_json, files: [{ path, text }] }, with each path inside the package, e.g. dist/index.d.ts.',
          items: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              package_json: { type: 'string' },
              files: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: { path: { type: 'string' }, text: { type: 'string' } },
                  required: ['path', 'text'],
                  additionalProperties: false,
                },
              },
            },
            required: ['name'],
            additionalProperties: false,
          },
        },
        project_root: {
          type: 'string',
          description: 'stdio only: absolute path to the project whose node_modules to read.',
        },
      },
      required: ['component'],
      additionalProperties: false,
    },
    handler({ component, packages, project_root: projectRoot }) {
      if (packages !== undefined) {
        if (projectRoot !== undefined) throw new Error('send packages or project_root, not both')
        return componentApiFrom(component, sentPackages(packages), 'among the packages sent')
      }
      if (!component || !projectRoot) throw new Error('component and packages are both required')
      if (!fs.existsSync(projectRoot)) throw new Error(`no such directory: ${projectRoot}`)
      return componentApi(component, path.resolve(projectRoot))
    },
  },
]

const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))

/** The tool list a mode advertises: the service leaves out the inputs that name a caller's path. */
export function toolList(mode = 'stdio') {
  return TOOLS.map(({ name, description, inputSchema }) => {
    const drop = mode === 'http' ? STDIO_ONLY[name] ?? [] : []
    if (!drop.length) return { name, description, inputSchema }
    const properties = Object.fromEntries(Object.entries(inputSchema.properties).filter(([k]) => !drop.includes(k)))
    const required = [...new Set([...(inputSchema.required ?? []), ...(name === 'skills_for_screen' ? ['sources'] : ['packages'])])]
    return { name, description, inputSchema: { ...inputSchema, properties, required } }
  })
}

// ---------------------------------------------------------------- jsonrpc

const commitLine = (commit) => `knowledge commit: ${commit ?? 'unknown'}`

/**
 * One tools/call, answered wholly from one commit. Returns the MCP result: the content, with the
 * commit line last, and `structuredContent` with `commit`. A tool error is a result too, so the
 * agent sees it and can correct course, and it names the commit as well.
 */
export async function callTool(name, args, { mode = 'stdio', knowledgeRoot = ROOT } = {}) {
  let snap
  try {
    snap = snapshot(knowledgeRoot)
  } catch (err) {
    return { content: [{ type: 'text', text: `ERROR: ${err.message}\n\n${commitLine(null)}` }], structuredContent: { error: err.message, commit: null }, isError: true }
  }
  const { commit } = snap
  try {
    // The service never serves a tree it can't name: an answer it can't trace is the failure the
    // commit exists to prevent.
    if (mode === 'http' && !commit) throw new Error(`the knowledge tree at ${snap.root} names no commit (no ${EXPORT_FILE} and no git)`)
    snap.manifest = await manifestModule(snap)
    const tool = TOOL_BY_NAME.get(name)
    if (!tool) throw new Error(`unknown tool: ${name}`)
    const given = args ?? {}
    if (mode === 'http') {
      const refused = (STDIO_ONLY[name] ?? []).filter((k) => given[k] !== undefined)
      if (refused.length) throw new Error(`${refused.join(', ')} names a path on your computer, which this server can't read. Send the contents instead (tools/list shows how)`)
    }
    const result = await tool.handler(given, snap)
    // A tool that returns MCP content blocks itself, such as skill_image, is passed through.
    if (Array.isArray(result?.content)) {
      const content = result.content.map((c, i) => (i === 0 && c.type === 'text' ? { ...c, text: `${c.text}\n\n${commitLine(commit)}` } : c))
      return { content, structuredContent: { ...result.structured, commit } }
    }
    const structuredContent = { ...result, commit }
    return { content: [{ type: 'text', text: `${JSON.stringify(structuredContent, null, 2)}\n\n${commitLine(commit)}` }], structuredContent }
  } catch (err) {
    logf(`tool ${name} failed:`, err.message)
    return { content: [{ type: 'text', text: `ERROR: ${err.message}\n\n${commitLine(commit)}` }], structuredContent: { error: err.message, commit }, isError: true }
  }
}

const INSTRUCTIONS =
  'The Recursica design system\'s own rules, served from one knowledge commit rather ' +
  'than from a copy. Call `router` FIRST for any UI work larger than a single ' +
  'component — it holds the decision order, the precedence when rules collide, and the ' +
  'rule that matters most: never resolve uncertainty by choosing silently. Then ' +
  '`skills_for_screen` on the real files to compute what applies, and `skill_family` ' +
  'for the rules. `skill_family` always returns a skill together with everything its ' +
  '"Related skills" names — a component skill without its design rules reliably ' +
  'produces something individually correct and collectively wrong, so this server will ' +
  'not hand you one alone. Use `component_api` for real prop types from the version a ' +
  'project installs. These skills are the only knowledge here: never answer a build ' +
  'question from a DOCS.md, and never cite one. Every answer names the knowledge commit ' +
  'it came from.'

/**
 * The answer to one JSON-RPC message, or null for a notification. `context.caller` names the
 * caller in the HTTP mode's log.
 */
export async function handleMessage(msg, { mode = 'stdio', caller = '' } = {}) {
  if (!msg || typeof msg !== 'object' || msg.jsonrpc !== '2.0' || typeof msg.method !== 'string') {
    return { jsonrpc: '2.0', id: msg?.id ?? null, error: { code: -32600, message: 'invalid request' } }
  }
  const { id, method, params } = msg
  if (id === undefined || id === null) return null
  const ok = (result) => ({ jsonrpc: '2.0', id, result })
  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion
      return ok({
        protocolVersion: typeof requested === 'string' ? requested : DEFAULT_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions: INSTRUCTIONS,
      })
    }
    case 'ping':
      return ok({})
    case 'tools/list':
      return ok({ tools: toolList(mode) })
    case 'tools/call': {
      if (!TOOL_BY_NAME.has(params?.name)) return { jsonrpc: '2.0', id, error: { code: -32602, message: `unknown tool: ${params?.name}` } }
      const started = Date.now()
      const result = await callTool(params.name, params.arguments || {}, { mode })
      if (mode === 'http') {
        logf(`caller=${caller} tool=${params.name} commit=${result.structuredContent?.commit ?? 'unknown'} ${result.isError ? 'error' : 'ok'} ${Date.now() - started}ms`)
      }
      return ok(result)
    }
    default:
      return { jsonrpc: '2.0', id, error: { code: -32601, message: `method not found: ${method}` } }
  }
}

// ---------------------------------------------------------------- HTTP: keys

const sha256 = (s) => crypto.createHash('sha256').update(s).digest('hex')

/**
 * The callers' key hashes, read again whenever the file changes. The server holds hashes only:
 * a key itself is never in its memory beyond one request, never logged, never written.
 */
export function keyring(file) {
  let stamp = ''
  let callers = []
  const load = () => {
    let st
    try {
      st = fs.statSync(file)
    } catch {
      if (stamp !== 'missing') logf(`no keys file at ${file}: every request is refused`)
      stamp = 'missing'
      callers = []
      return
    }
    const now = `${st.mtimeMs}:${st.size}:${st.ino}`
    if (now === stamp) return
    stamp = now
    try {
      const j = JSON.parse(fs.readFileSync(file, 'utf8'))
      callers = Object.entries(j.callers ?? {})
        .filter(([name, c]) => /^[a-z0-9][a-z0-9-]{0,39}$/.test(name) && /^[0-9a-f]{64}$/.test(c?.sha256 ?? ''))
        .map(([name, c]) => ({ name, hash: Buffer.from(c.sha256) }))
      logf(`keys: ${callers.length} caller(s): ${callers.map((c) => c.name).join(', ') || 'none'}`)
    } catch (err) {
      logf(`the keys file ${file} can't be read (${err.message}): every request is refused`)
      callers = []
    }
  }
  /** The caller's name for an Authorization header, or null. */
  return (header) => {
    load()
    const m = /^Bearer ([A-Za-z0-9_-]{20,200})$/.exec(String(header ?? ''))
    if (!m) return null
    const got = Buffer.from(sha256(m[1]))
    let who = null
    // Every hash is compared, so the time taken says nothing about which one matched.
    for (const c of callers) if (crypto.timingSafeEqual(c.hash, got) && !who) who = c.name
    return who
  }
}

// ---------------------------------------------------------------- HTTP: the service

const MAX_BODY = 16 * 1024 * 1024

/**
 * The service: MCP Streamable HTTP, stateless, JSON answers only, on 127.0.0.1. Each POST to /mcp
 * carries one JSON-RPC message, or a list of them. Refused, before anything is read:
 *   - a Host other than 127.0.0.1 or localhost at the port, or any Origin: a browser page
 *     reaching the port through a DNS name it controls;
 *   - a request without a caller's key: 401, nothing served.
 */
export function createService({ keys, port }) {
  const callerFor = keyring(keys)
  const hosts = new Set([`127.0.0.1:${port}`, `localhost:${port}`])
  return http.createServer((req, res) => {
    const send = (code, body, headers = {}) => {
      const text = body === undefined ? '' : JSON.stringify(body)
      res.writeHead(code, { ...(text ? { 'content-type': 'application/json' } : {}), 'cache-control': 'no-store', ...headers })
      res.end(text)
    }
    // A refusal reads nothing of the request's body.
    const refuse = (code, body, headers) => {
      req.resume()
      send(code, body, headers)
    }
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    if (url.pathname !== '/mcp') return refuse(404, { error: 'not found' })
    if (!hosts.has(String(req.headers.host ?? ''))) return refuse(403, { error: 'host refused' })
    if (req.headers.origin !== undefined) return refuse(403, { error: 'origin refused' })
    const caller = callerFor(req.headers.authorization)
    if (!caller) return refuse(401, { error: 'a caller key is required' }, { 'www-authenticate': 'Bearer' })
    // Stateless: there is no stream to open with GET, and no session to end with DELETE.
    if (req.method !== 'POST') return refuse(405, { error: 'POST only' }, { allow: 'POST' })
    let size = 0
    const chunks = []
    let tooBig = false
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) tooBig = true
      else chunks.push(c)
    })
    req.on('end', async () => {
      if (tooBig) return send(413, { error: `a request may carry at most ${MAX_BODY} bytes` })
      let body
      try {
        body = JSON.parse(Buffer.concat(chunks).toString('utf8'))
      } catch {
        return send(400, { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } })
      }
      try {
        const list = Array.isArray(body) ? body : [body]
        const answers = (await Promise.all(list.map((m) => handleMessage(m, { mode: 'http', caller })))).filter(Boolean)
        // Only notifications: accepted, with nothing to answer.
        if (!answers.length) return send(202)
        send(200, Array.isArray(body) ? answers : answers[0])
      } catch (err) {
        logf('handler crashed:', err.stack || err.message)
        send(500, { jsonrpc: '2.0', id: null, error: { code: -32603, message: 'internal error' } })
      }
    })
  })
}

// ---------------------------------------------------------------- start

// Only when run as a command. Without this guard the stdio loop starts on import, so a test file
// importing a helper would also attach a reader to the test runner's stdin and never exit.
//
// Compared as real paths on both sides. `import.meta.url` is already resolved through symlinks
// and `process.argv[1]` is not, so a plain string comparison fails wherever any component of the
// path is a link — which on macOS includes everything under /tmp and /var/folders. The failure
// is silent and total: the guard reads false, the server never starts its stdio loop, and it
// exits 0 having printed nothing, which looks exactly like a server with nothing to say.
function realOrSelf(p) {
  try {
    return fs.realpathSync(p)
  } catch {
    return path.resolve(p)
  }
}

const invokedDirectly =
  process.argv[1] && realOrSelf(process.argv[1]) === realOrSelf(fileURLToPath(import.meta.url))

// The parser is read at import, so a test that imports a helper gets it too.
try {
  await loadCrossLinks()
} catch (err) {
  logf(`no knowledge tree at ${ROOT} (${err.message}) — set KNOWLEDGE_ROOT to the recursica-knowledge checkout or export`)
  if (invokedDirectly) process.exit(1)
  throw err
}

if (invokedDirectly) {
  if (process.argv.includes('--http')) startHttp()
  else startStdio()
}

function startHttp() {
  const port = Number(process.env.KNOWLEDGE_MCP_PORT)
  const keys = process.env.KNOWLEDGE_MCP_KEYS
  if (!Number.isInteger(port) || port < 1024 || port > 65535) {
    logf('--http needs KNOWLEDGE_MCP_PORT, a port from 1024 to 65535')
    process.exit(2)
  }
  if (!keys) {
    logf('--http needs KNOWLEDGE_MCP_KEYS, the file of the callers\' key hashes')
    process.exit(2)
  }
  const snap = snapshot()
  if (!snap.commit) {
    logf(`the knowledge tree at ${snap.root} names no commit (no ${EXPORT_FILE} and no git): nothing to serve`)
    process.exit(1)
  }
  const server = createService({ keys, port })
  server.on('error', (err) => {
    logf(`can't listen on 127.0.0.1:${port}: ${err.message}`)
    process.exit(1)
  })
  // Loopback only, always: no setting moves the service to another address.
  server.listen(port, '127.0.0.1', () => {
    logf(`ready — http://127.0.0.1:${port}/mcp root=${ROOT} commit=${snap.commit} skills=${allSlugs(snap).length} tools=${TOOLS.length}`)
  })
}

function startStdio() {
  const send = (message) => process.stdout.write(`${JSON.stringify(message)}\n`)
  const rl = createInterface({ input: process.stdin, terminal: false })

  rl.on('line', (line) => {
    const trimmed = line.trim()
    if (!trimmed) return

    let msg
    try {
      msg = JSON.parse(trimmed)
    } catch {
      logf('dropped unparseable line')
      return
    }

    if (msg.id === undefined || msg.id === null) return

    handleMessage(msg)
      .then((answer) => answer && send(answer))
      .catch((err) => {
        logf('handler crashed:', err.stack || err.message)
        send({ jsonrpc: '2.0', id: msg.id, error: { code: -32603, message: `internal error: ${err.message}` } })
      })
  })

  rl.on('close', () => process.exit(0))

  const snap = snapshot()
  logf(`ready — root=${ROOT} commit=${snap.commit ?? 'unknown'} skills=${allSlugs(snap).length} tools=${TOOLS.length}`)
}

export { family, declarationsFor, componentApi, adapterPackages, readSkill, contract, served, componentApiFrom }
