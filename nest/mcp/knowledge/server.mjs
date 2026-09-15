#!/usr/bin/env node
// Recursica knowledge MCP server.
//
// Serves the design system's own skills to the agents that build and review against them —
// Betty, Barb, ALAN — without any of them holding the corpus in context. There are 64 skill
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
// `## Load these too` section names, transitively.
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
// Env:
//   KNOWLEDGE_ROOT   the recursica-knowledge checkout. Defaults to this file's own repository,
//                    which is correct whenever the server runs from the checkout.
//
// Zero dependencies, on purpose: the same reason the drive fence has none. This is the surface
// every design decision gets made against, and it should be auditable in one file.

import fs from 'node:fs'
import path from 'node:path'
import { createInterface } from 'node:readline'
import { fileURLToPath } from 'node:url'

const SERVER_NAME = 'recursica-knowledge'
const SERVER_VERSION = '0.1.0'
const DEFAULT_PROTOCOL = '2024-11-05'

const HERE = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(process.env.KNOWLEDGE_ROOT || path.join(HERE, '..', '..', '..'))
const SKILLS = path.join(ROOT, 'skills')
const CATEGORIES = ['meta', 'design-rules', 'psychology', 'components']
const ROUTER_SLUG = 'recursica-skill-design-router'

function logf(...parts) {
  process.stderr.write(`[${SERVER_NAME}] ${parts.join(' ')}\n`)
}

if (!fs.existsSync(SKILLS)) {
  logf(`no skills/ under ${ROOT} — set KNOWLEDGE_ROOT to the recursica-knowledge checkout`)
  process.exit(1)
}

export { TOOLS }

// The manifest is imported rather than reimplemented, and that is a correctness requirement
// rather than tidiness. Barb computes applicability with this same module; a second
// implementation here would drift from hers, and the drift would be silent — a review that
// checked the wrong set of skills reads exactly like a review that found nothing.
const manifestModule = await import(
  path.join(ROOT, 'scripts', 'screen-skill-manifest.mjs')
)
const { manifest } = manifestModule

// ---------------------------------------------------------------- skills on disk

/** Where a skill slug lives, or null if no skill of that name is on disk. */
function locate(slug) {
  for (const category of CATEGORIES) {
    const p = path.join(SKILLS, category, slug, 'SKILL.md')
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

function crossLinks(body) {
  const named = section(body, 'Load these too')
  if (!named) return []
  return [...new Set(named.match(/recursica-skill-[a-z0-9-]+/g) ?? [])]
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

function readSkill(slug) {
  const where = locate(slug)
  if (!where) return null
  const body = fs.readFileSync(where, 'utf8')
  const meta = frontmatter(body)
  return {
    slug,
    path: path.relative(ROOT, where),
    category: path.basename(path.dirname(path.dirname(where))),
    description: meta.description ?? null,
    loadTheseToo: crossLinks(body),
    body,
  }
}

/** A skill and everything its cross-links reach, breadth-first. Never one file alone. */
function family(slugs) {
  const seen = new Set()
  const missing = []
  const out = []
  const queue = [...slugs]
  while (queue.length) {
    const slug = queue.shift()
    if (seen.has(slug)) continue
    const skill = readSkill(slug)
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

function allSlugs() {
  const out = []
  for (const category of CATEGORIES) {
    const dir = path.join(SKILLS, category)
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
 */
function adapterPackages(projectRoot) {
  const scope = path.join(projectRoot, 'node_modules', '@recursica')
  if (!fs.existsSync(scope)) return []
  return fs
    .readdirSync(scope)
    .filter((n) => /adapter/.test(n) && n !== 'adapter-tester')
    .map((name) => {
      const dir = path.join(scope, name)
      let version = null
      try {
        version = JSON.parse(fs.readFileSync(path.join(dir, 'package.json'), 'utf8')).version
      } catch {
        /* a package with no readable manifest is still worth reporting by name */
      }
      return { name, version, dir }
    })
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

function componentApi(component, projectRoot) {
  const packages = adapterPackages(projectRoot)
  if (packages.length === 0) {
    throw new Error(
      `no @recursica adapter installed under ${projectRoot}. Run the project's install first — ` +
      `reading prop types from another project's version is how you build against an API this ` +
      `one does not ship.`,
    )
  }

  const found = []
  for (const pkg of packages) {
    // The per-component file in adapter-common is the precise answer when it exists.
    const direct = path.join(
      pkg.dir, 'dist', 'src', 'components', component, `Recursica${component}Props.d.ts`,
    )
    if (fs.existsSync(direct)) {
      found.push({
        package: pkg.name,
        version: pkg.version,
        source: path.relative(projectRoot, direct),
        declarations: [fs.readFileSync(direct, 'utf8').trim()],
      })
      continue
    }
    const bundle = path.join(pkg.dir, 'dist', 'index.d.ts')
    if (!fs.existsSync(bundle)) continue
    const declarations = declarationsFor(fs.readFileSync(bundle, 'utf8'), component)
    if (declarations.length) {
      found.push({
        package: pkg.name,
        version: pkg.version,
        source: path.relative(projectRoot, bundle),
        declarations,
      })
    }
  }

  return {
    component,
    project_root: projectRoot,
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

// ---------------------------------------------------------------- tools

const TOOLS = [
  {
    name: 'router',
    description:
      'The design router: the decision order for building a screen, which skill owns each ' +
      'decision, the precedence when two rules collide, and when to stop and ask rather than ' +
      'guess. Load this FIRST, before any other Recursica skill, for any UI work larger than a ' +
      'single component. It routes and arbitrates; it never replaces the owning skill.',
    inputSchema: { type: 'object', properties: {}, additionalProperties: false },
    handler() {
      const skill = readSkill(ROUTER_SLUG)
      if (!skill) throw new Error(`${ROUTER_SLUG} is not on disk under ${SKILLS}`)
      return skill
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
      'Returns slugs and paths, not bodies — pass the slugs to skill_family. Read `uncovered`: ' +
      'an import nothing mapped is reported there rather than silently dropped.',
    inputSchema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string' },
          description: 'Absolute paths to the screen files. Relative paths resolve against the server process, which is not your project.',
          minItems: 1,
        },
      },
      required: ['files'],
      additionalProperties: false,
    },
    handler({ files }) {
      if (!Array.isArray(files) || files.length === 0) throw new Error('files must be a non-empty array')
      const missing = files.filter((f) => !fs.existsSync(f))
      if (missing.length) {
        throw new Error(
          `not on disk: ${missing.join(', ')}. Use absolute paths — a relative path resolves ` +
          `against this server's working directory, and a manifest computed from no files is ` +
          `an empty skill set that looks like a clean answer.`,
        )
      }
      return manifest(files)
    },
  },
  {
    name: 'skill_family',
    description:
      'The full text of one or more skills PLUS every skill their "Load these too" sections ' +
      'name, transitively. It never returns a skill alone, because a component skill tells you ' +
      'what a component is and a design-rules skill tells you whether it belongs on the screen — ' +
      'reading the first without the second is the most common way to produce something ' +
      'individually correct and collectively wrong. Ask for what you need; the family comes with it.',
    inputSchema: {
      type: 'object',
      properties: {
        slugs: {
          type: 'array',
          items: { type: 'string' },
          description: 'Skill slugs, e.g. recursica-skill-table.',
          minItems: 1,
        },
      },
      required: ['slugs'],
      additionalProperties: false,
    },
    handler({ slugs }) {
      if (!Array.isArray(slugs) || slugs.length === 0) throw new Error('slugs must be a non-empty array')
      const { skills, missing } = family(slugs)
      if (skills.length === 0) {
        throw new Error(`no skill on disk named: ${missing.join(', ')}. Call list_skills for the real names.`)
      }
      return {
        requested: slugs,
        // Say what arrived beyond what was asked for, so the caller can see the family working
        // rather than wonder why the response is longer than the question.
        pulled_in: skills.map((s) => s.slug).filter((s) => !slugs.includes(s)),
        missing,
        skills,
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
    handler() {
      return {
        count: allSlugs().length,
        skills: allSlugs().map(({ slug, category }) => {
          const skill = readSkill(slug)
          return { slug, category, description: skill?.description ?? null }
        }),
      }
    },
  },
  {
    name: 'component_api',
    description:
      "A component's real prop types, read from the Recursica adapter the given project " +
      'actually installs — not from prose, and not from another project\'s version. Use it ' +
      'before building on a prop a skill mentions: a prop documented in a skill and absent from ' +
      'the installed package is a problem to find first rather than after. Absence is reported, ' +
      'never treated as nothing to say.',
    inputSchema: {
      type: 'object',
      properties: {
        component: { type: 'string', description: 'Component name as exported, e.g. Button.' },
        project_root: {
          type: 'string',
          description: 'Absolute path to the project whose node_modules to read.',
        },
      },
      required: ['component', 'project_root'],
      additionalProperties: false,
    },
    handler({ component, project_root: projectRoot }) {
      if (!component || !projectRoot) throw new Error('component and project_root are both required')
      if (!fs.existsSync(projectRoot)) throw new Error(`no such directory: ${projectRoot}`)
      return componentApi(component, path.resolve(projectRoot))
    },
  },
]

const TOOL_BY_NAME = new Map(TOOLS.map((t) => [t.name, t]))

// ---------------------------------------------------------------- jsonrpc

function send(message) {
  process.stdout.write(`${JSON.stringify(message)}\n`)
}

function respond(id, result) {
  send({ jsonrpc: '2.0', id, result })
}

function respondError(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } })
}

async function handleRequest(msg) {
  const { id, method, params } = msg

  switch (method) {
    case 'initialize': {
      const requested = params?.protocolVersion
      respond(id, {
        protocolVersion: typeof requested === 'string' ? requested : DEFAULT_PROTOCOL,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: SERVER_NAME, version: SERVER_VERSION },
        instructions:
          'The Recursica design system\'s own rules, served from the knowledge checkout rather ' +
          'than from a copy. Call `router` FIRST for any UI work larger than a single ' +
          'component — it holds the decision order, the precedence when rules collide, and the ' +
          'rule that matters most: never resolve uncertainty by choosing silently. Then ' +
          '`skills_for_screen` on the real files to compute what applies, and `skill_family` ' +
          'for the rules. `skill_family` always returns a skill together with everything its ' +
          '"Load these too" names — a component skill without its design rules reliably ' +
          'produces something individually correct and collectively wrong, so this server will ' +
          'not hand you one alone. Use `component_api` for real prop types from the version a ' +
          'project installs. These skills are the only knowledge here: never answer a build ' +
          'question from a DOCS.md, and never cite one.',
      })
      return
    }

    case 'ping':
      respond(id, {})
      return

    case 'tools/list':
      respond(id, {
        tools: TOOLS.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
      })
      return

    case 'tools/call': {
      const tool = TOOL_BY_NAME.get(params?.name)
      if (!tool) {
        respondError(id, -32602, `unknown tool: ${params?.name}`)
        return
      }
      try {
        const result = await tool.handler(params.arguments || {})
        respond(id, { content: [{ type: 'text', text: JSON.stringify(result, null, 2) }] })
      } catch (err) {
        logf(`tool ${tool.name} failed:`, err.message)
        // A tool error, not a protocol error, so the agent sees it and can correct course.
        respond(id, { content: [{ type: 'text', text: `ERROR: ${err.message}` }], isError: true })
      }
      return
    }

    default:
      respondError(id, -32601, `method not found: ${method}`)
  }
}

// Only when run as a command. Without this guard the stdio loop starts on import, so a test
// file importing a helper would also attach a reader to the test runner's stdin and never exit.
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

if (invokedDirectly) start()

function start() {
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

  handleRequest(msg).catch((err) => {
    logf('handler crashed:', err.stack || err.message)
    respondError(msg.id, -32603, `internal error: ${err.message}`)
  })
})

rl.on('close', () => process.exit(0))

logf(`ready — root=${ROOT} skills=${allSlugs().length} tools=${TOOLS.length}`)
}

export { family, declarationsFor, componentApi, adapterPackages, readSkill }
