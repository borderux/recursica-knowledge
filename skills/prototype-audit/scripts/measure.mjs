#!/usr/bin/env node
// Measures a Recursica prototype for the prototype-audit rubric. Every number here is
// a count, so two runs on the same commit always give the same result.
// Usage: node measure.mjs <repo-root> [--include <folder>]... [--out file.json]
// --include limits the measuring to those folders (relative to the repo root), for a
// repository that holds several prototypes. Repeat it for each folder, for example
// --include src/routes/prototypes/foo --include src/data/foo --include src/api/foo.
// Without it, everything under srcDir is measured.
// Optional overrides: <repo-root>/prototype-audit.config.json (see DEFAULTS).

import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

// Must match the version at the top of rubric.md.
const RUBRIC_VERSION = "2.0";

// Every check is scored 1 (yes) or 0 (no). The check numbers live in rubric.md only.
const bit = (ok) => (ok ? 1 : 0);


const DEFAULTS = {
  srcDir: "src",
  logicDirs: ["src/data"],
  excludeDirs: ["src/theme"],
  entryFiles: ["src/main.tsx"],
  fakeDataPattern: "(generate|seed|fixture|mock|fake|sample|scenario)",
  gapTag: "DESIGN-SYSTEM GAP",
  gapRegister: ["GAPS.md", "docs/GAPS.md"],
  // Imports of these names from a UI library are app setup, not rendering.
  setupNames: ["MantineProvider", "createTheme", "MantineThemeOverride"],
};

const args = process.argv.slice(2);
const FLAGS_WITH_VALUE = new Set(["--out", "--include"]);
const flagValues = (flag) => args.flatMap((a, i) => (a === flag && args[i + 1] ? [args[i + 1]] : []));
const outFile = flagValues("--out")[0] ?? null;
const root = path.resolve(args.find((a, i) => !a.startsWith("--") && !FLAGS_WITH_VALUE.has(args[i - 1])) ?? ".");
const cfgFile = path.join(root, "prototype-audit.config.json");
const cfg = { ...DEFAULTS, ...(fs.existsSync(cfgFile) ? JSON.parse(fs.readFileSync(cfgFile, "utf8")) : {}) };
// Folders to measure, relative to the repo root. Empty means all of srcDir.
const include = [...(cfg.include ?? []), ...flagValues("--include")].map((d) => d.replace(/^\.\//, "").replace(/\/$/, ""));
for (const d of include) {
  if (!fs.existsSync(path.join(root, d))) {
    console.error(`--include folder not found: ${d}`);
    process.exit(1);
  }
}

const rel = (p) => path.relative(root, p).split(path.sep).join("/");
const read = (p) => fs.readFileSync(p, "utf8");
const lineAt = (text, index) => text.slice(0, index).split("\n").length;
const under = (file, dirs) => dirs.some((d) => file === d || file.startsWith(`${d.replace(/\/$/, "")}/`));

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    if (["node_modules", "dist", ".git", "audits", "storybook-static"].includes(e.name)) continue;
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

function git(cmd) {
  try {
    return execSync(`git -C "${root}" ${cmd}`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
  } catch {
    return null;
  }
}

const pkg = fs.existsSync(path.join(root, "package.json")) ? JSON.parse(read(path.join(root, "package.json"))) : {};
const deps = { ...(pkg.dependencies ?? {}), ...(pkg.devDependencies ?? {}) };

const all = (include.length ? include.flatMap((d) => walk(path.join(root, d))) : walk(path.join(root, cfg.srcDir))).filter(
  (p) => !under(rel(p), cfg.excludeDirs),
);
const fakeRe = new RegExp(cfg.fakeDataPattern, "i");
const isStory = (f) => /\.stories\.[jt]sx?$/.test(f);
const isFake = (f) => fakeRe.test(path.basename(f)) && !isStory(f) && !f.endsWith(".d.ts");
const uiFiles = all.filter((p) => p.endsWith(".tsx") && !isStory(p) && !under(rel(p), cfg.logicDirs));
const cssFiles = all.filter((p) => p.endsWith(".css"));
const logicFiles = all.filter((p) => /\.ts$/.test(p) && !p.endsWith(".d.ts") && under(rel(p), cfg.logicDirs) && !isFake(p));
const fakeFiles = all.filter((p) => /\.(ts|tsx|json)$/.test(p) && isFake(p));

// ---------- imports ----------
const IMPORT_RE = /import\s+(type\s+)?([\s\S]*?)\s+from\s+["']([^"']+)["']/g;
function importsOf(text) {
  const list = [];
  for (const m of text.matchAll(IMPORT_RE)) {
    const typeOnly = Boolean(m[1]);
    const clause = m[2];
    const names = [];
    const braces = clause.match(/\{([\s\S]*)\}/);
    if (braces) {
      for (const raw of braces[1].split(",")) {
        const n = raw.trim();
        if (!n || n.startsWith("type ")) continue;
        names.push(n.split(/\s+as\s+/).pop().trim());
      }
    }
    const def = clause.replace(/\{[\s\S]*\}/, "").replace(/,/g, "").trim();
    if (def && !def.startsWith("*")) names.push(def);
    list.push({ source: m[3], names, typeOnly, line: lineAt(text, m.index) });
  }
  return list;
}
function resolveLocal(fromFile, source) {
  const base = path.resolve(path.dirname(fromFile), source);
  for (const c of [base, `${base}.ts`, `${base}.tsx`, `${base}/index.ts`, `${base}/index.tsx`]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return base;
}

// ---------- 1: Recursica only, no custom CSS ----------
const LAYOUT_PROPS =
  /^(display|position|top|right|bottom|left|inset|z-index|overflow(-x|-y)?|grid.*|flex.*|order|align-.*|justify-.*|place-.*|width|height|min-width|min-height|max-width|max-height|clip|clip-path|white-space|list-style.*|box-sizing|contain|visibility|float|clear|content|isolation|scroll-.*|aspect-ratio)$/;
const ZERO_OR_KEYWORD = /^(0|0px|auto|none|inherit|initial|unset|revert|transparent|currentcolor)$/i;
const HARDCODED = /#[0-9a-f]{3,8}\b|\brgba?\(|\bhsla?\(|(?<![\w-])\d*\.?\d+(px|rem|em|pt)\b/i;

function cssDeclarations(file) {
  const text = read(file);
  const tagAt = (() => {
    for (const m of text.matchAll(/\/\*[\s\S]*?\*\//g)) if (m[0].includes(cfg.gapTag)) return m.index;
    return Infinity;
  })();
  const stripped = text.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "));
  const decls = [];
  for (const rule of stripped.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
    const selector = rule[1].trim().split("\n").pop().trim();
    const bodyStart = rule.index + rule[0].indexOf("{") + 1;
    let offset = 0;
    for (const part of rule[2].split(";")) {
      const at = bodyStart + offset;
      offset += part.length + 1;
      const i = part.indexOf(":");
      if (i < 0) continue;
      const property = part.slice(0, i).trim().toLowerCase();
      const value = part.slice(i + 1).trim();
      if (!property) continue;
      const usesToken = value.includes("var(");
      let kind;
      if (property.startsWith("--")) kind = "custom-property";
      else if (LAYOUT_PROPS.test(property)) kind = "layout";
      else if (/^(margin|padding)(-.*)?$/.test(property) && value.split(/\s+/).every((v) => ZERO_OR_KEYWORD.test(v))) kind = "layout";
      else kind = usesToken ? "visual-token" : "visual-literal";
      // Any property can hold a hardcoded value, layout included (width: 240px).
      // Inside a flagged gap nothing is counted, so gaps are skipped here too.
      const hardcoded = at <= tagAt && !usesToken && (HARDCODED.test(value) || property === "font-family");
      decls.push({
        file: rel(file),
        line: lineAt(text, at + (part.length - part.trimStart().length)),
        selector,
        property,
        value,
        kind,
        hardcoded,
        tokenUse: value.includes("--recursica"),
        gapTagged: at > tagAt,
      });
    }
  }
  return decls;
}

const declarations = cssFiles.flatMap(cssDeclarations);
const inlineStyles = [];
const tsxHardcoded = [];
const overStyled = [];
const tsxTokenUse = [];
const htmlTags = [];
// A lowercase JSX tag such as <div> or <form>. The lookbehind skips TypeScript
// generics like useState<string>, where an identifier comes right before the "<".
const HTML_TAG_RE = /(?<![\w.$\])])<([a-z][a-z0-9]*)(?=[\s>/])/g;
for (const f of uiFiles) {
  const t = read(f);
  // Every HTML element can be rendered by a Recursica component through its
  // component prop (<Stack component="form">), so tags count even in gap files.
  // Comments are blanked first (keeping line breaks), so "// on <body>" isn't a tag.
  const code = t
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, " "))
    .replace(/(^|[^:"'`])\/\/[^\n]*/g, (m, p) => p + " ".repeat(m.length - p.length));
  for (const m of code.matchAll(HTML_TAG_RE)) htmlTags.push({ file: rel(f), line: lineAt(code, m.index), tag: m[1] });
  // Recursica components apply the tokens themselves, so code that names a token
  // directly is styling something on its own. A file with a gap comment is excused.
  if (!t.includes(cfg.gapTag)) {
    for (const m of t.matchAll(/--recursica[\w-]*/g)) tsxTokenUse.push({ file: rel(f), line: lineAt(t, m.index), token: m[0] });
  }
  for (const m of t.matchAll(/\s(style|sx|styles|classNames)=\{/g)) inlineStyles.push({ file: rel(f), line: lineAt(t, m.index), prop: m[1] });
  for (const m of t.matchAll(/\boverStyled\b/g)) overStyled.push({ file: rel(f), line: lineAt(t, m.index) });
  for (const m of t.matchAll(/["'`][^"'`\n]*?(#[0-9a-fA-F]{3,8}\b|\b\d+(px|rem)\b|rgba?\()[^"'`\n]*?["'`]/g)) {
    tsxHardcoded.push({ file: rel(f), line: lineAt(t, m.index), text: m[0].slice(0, 80) });
  }
}
const hardcoded = [...declarations.filter((d) => d.hardcoded), ...tsxHardcoded];
// Custom CSS: every declaration outside a flagged gap, layout and spacing included.
// Recursica's layout components take spacing props (gap="rec-md"), so no CSS is needed.
const customCss = declarations.filter((d) => !d.gapTagged);
const d1 = {
  noHtmlTags: bit(htmlTags.length === 0),
  noInlineStyles: bit(inlineStyles.length === 0),
  noOverStyled: bit(overStyled.length === 0),
  noCustomCss: bit(customCss.length === 0),
  noTokensInCode: bit(tsxTokenUse.length === 0),
  noHardcodedValues: bit(hardcoded.length === 0),
};

// ---------- 2: UI kept separate from logic ----------
const CALC_RE = /\.(filter|reduce|sort|toSorted)\(|\bnew Date\(|\bMath\.\w+\(|\.getTime\(\)/g;
const perFile = [];
const stateReaders = [];
const fakeDataImports = [];
for (const f of uiFiles) {
  const t = read(f);
  const calcs = [...t.matchAll(CALC_RE)].map((m) => lineAt(t, m.index));
  perFile.push({ file: rel(f), calculations: calcs.length, lines: calcs });
  for (const imp of importsOf(t)) {
    if (!imp.source.startsWith(".") || imp.typeOnly) continue;
    const target = resolveLocal(f, imp.source);
    const hooks = imp.names.filter((n) => /^use[A-Z]/.test(n));
    if (hooks.length) stateReaders.push({ file: rel(f), line: imp.line, hooks, from: imp.source });
    if (isFake(target) && imp.names.length) fakeDataImports.push({ file: rel(f), line: imp.line, from: imp.source, names: imp.names });
  }
}
perFile.sort((a, b) => b.calculations - a.calculations);
const totalCalcs = perFile.reduce((s, x) => s + x.calculations, 0);
const maxCalcs = perFile[0]?.calculations ?? 0;
const readerFiles = [...new Set(stateReaders.map((s) => s.file))];
const d2 = {
  noCalculationsInScreens: bit(totalCalcs === 0),
  noScreensReadStore: bit(readerFiles.length === 0),
  noFakeDataImports: bit(fakeDataImports.length === 0),
  hasLogicFiles: bit(logicFiles.length > 0),
};

// ---------- 3: adapter coverage (inventory; classification is judged) ----------
const UI_LIBS = /^(@mantine\/|@mui\/|antd|@chakra-ui\/|@radix-ui\/|@headlessui\/|react-bootstrap|primereact|@ark-ui\/|@nextui-org\/|@heroui\/|semantic-ui-react|@fluentui\/)/;
const adapterUse = {};
const libraryImports = [];
const localComponents = [];
const RAW_TAG_RE = /<([a-z][a-z0-9]*)[\s>/]/g;
const cssWithTag = new Set(declarations.filter((d) => d.gapTagged).map((d) => d.file));
for (const f of uiFiles) {
  const t = read(f);
  const imps = importsOf(t);
  const adapterNames = [];
  const cssImports = [];
  for (const imp of imps) {
    if (/^@recursica\/adapter-/.test(imp.source) && !imp.typeOnly) {
      for (const n of imp.names) if (/^[A-Z]/.test(n)) {
        adapterUse[n] = (adapterUse[n] ?? 0) + 1;
        adapterNames.push(n);
      }
    }
    if (UI_LIBS.test(imp.source) && !imp.typeOnly && !/\.css$/.test(imp.source)) {
      const names = imp.names.filter((n) => !cfg.setupNames.includes(n));
      if (names.length && !cfg.entryFiles.includes(rel(f))) libraryImports.push({ file: rel(f), line: imp.line, source: imp.source, names });
    }
    if (/\.css$/.test(imp.source) && imp.source.startsWith(".")) cssImports.push(rel(resolveLocal(f, imp.source)));
  }
  const rawTags = {};
  for (const m of t.matchAll(RAW_TAG_RE)) rawTags[m[1]] = (rawTags[m[1]] ?? 0) + 1;
  const exported = [...t.matchAll(/export\s+(?:default\s+)?function\s+([A-Z]\w*)/g)].map((m) => m[1]);
  localComponents.push({
    file: rel(f),
    exports: exported,
    adapterComponents: [...new Set(adapterNames)],
    rawTags,
    cssModules: cssImports,
    gapTagged: t.includes(cfg.gapTag) || cssImports.some((c) => cssWithTag.has(c)),
  });
}
function adapterExports() {
  const scope = path.join(root, "node_modules", "@recursica");
  if (!fs.existsSync(scope)) return { package: null, components: [] };
  const pkgName = fs.readdirSync(scope).find((n) => n.startsWith("adapter-") && n !== "adapter-common");
  if (!pkgName) return { package: null, components: [] };
  const dts = path.join(scope, pkgName, "dist", "index.d.ts");
  const version = JSON.parse(read(path.join(scope, pkgName, "package.json"))).version;
  if (!fs.existsSync(dts)) return { package: `@recursica/${pkgName}@${version}`, components: [] };
  const names = [...read(dts).matchAll(/export (?:declare )?(?:const|function) ([A-Z]\w+)/g)].map((m) => m[1]);
  return { package: `@recursica/${pkgName}@${version}`, components: [...new Set(names)].sort() };
}
const adapter = adapterExports();
const d3 = { noOtherUiLibrary: bit(libraryImports.length === 0) };

// ---------- 4: gap register ----------
const registerPath = cfg.gapRegister.map((p) => path.join(root, p)).find((p) => fs.existsSync(p)) ?? null;
let registerRows = 0;
if (registerPath) {
  const tableLines = read(registerPath).split("\n").filter((l) => /^\s*\|/.test(l));
  registerRows = Math.max(0, tableLines.filter((l) => !/^\s*\|[\s|:-]+\|\s*$/.test(l)).length - 1);
}
const gapTags = [];
for (const f of [...uiFiles, ...cssFiles, ...all.filter((p) => p.endsWith(".d.ts"))]) {
  const t = read(f);
  for (const m of t.matchAll(new RegExp(cfg.gapTag.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g"))) gapTags.push({ file: rel(f), line: lineAt(t, m.index) });
}
// Whether every gap is written down is judged by Claude, so there are no checks here.

// ---------- 5: hints for finding the states ----------
const routes = [];
for (const f of all.filter((p) => /\.(tsx|ts)$/.test(p))) {
  const t = read(f);
  if (!/createBrowserRouter|<Route\b|createRoutesFromElements|useRoutes/.test(t)) continue;
  for (const m of t.matchAll(/path:\s*["'`]([^"'`]+)["'`]|<Route[^>]*\spath=["']([^"']+)["']/g)) routes.push({ file: rel(f), line: lineAt(t, m.index), path: m[1] ?? m[2] });
}
const stateComponents = {};
for (const name of ["Loader", "Skeleton", "Toast", "Alert", "Notification", "Progress"]) stateComponents[name] = adapterUse[name] ?? 0;
const stories = all.filter(isStory).map(rel);
const storybookDir = fs.existsSync(path.join(root, ".storybook"));
const mockSignals = [];
if (deps.msw) mockSignals.push({ signal: "msw dependency" });
for (const [name, cmd] of Object.entries(pkg.scripts ?? {})) if (/mock|scenario|fixture/i.test(`${name} ${cmd}`)) mockSignals.push({ signal: `npm script "${name}"` });
for (const f of all.filter((p) => /\.(tsx|ts)$/.test(p))) {
  const t = read(f);
  for (const m of t.matchAll(/searchParams?\.get\(\s*["'](scenario|mock|state|fixture|demo)["']\)|import\.meta\.env\.VITE_(MOCK|SCENARIO)\w*/gi)) {
    mockSignals.push({ signal: m[0], file: rel(f), line: lineAt(t, m.index) });
  }
}

// ---------- output ----------
const result = {
  rubricVersion: RUBRIC_VERSION,
  prototype: pkg.name ?? path.basename(root),
  root,
  commit: git("rev-parse --short HEAD"),
  // Uncommitted or untracked changes in the measured folders.
  dirty: (git(`status --porcelain -- ${(include.length ? include : [cfg.srcDir]).map((d) => `"${d}"`).join(" ")}`) ?? "") !== "",
  include,
  measuredAt: new Date().toISOString(),
  config: cfg,
  counts: {
    uiFiles: uiFiles.length,
    cssFiles: cssFiles.length,
    logicFiles: logicFiles.length,
    fakeDataFiles: fakeFiles.map(rel),
  },
  recursicaOnly: {
    checks: d1,
    inlineStyles,
    overStyled,
    hardcoded,
    htmlTags,
    customCss,
    tokenUseInCode: tsxTokenUse,
    declarations,
  },
  uiVsLogic: {
    checks: d2,
    totalCalculations: totalCalcs,
    maxCalculationsInOneFile: maxCalcs,
    perFile,
    stateReaderFiles: readerFiles,
    stateReaders,
    fakeDataImports,
    logicFiles: logicFiles.map(rel),
  },
  ownComponents: {
    checks: d3,
    adapter,
    adapterComponentsUsed: Object.fromEntries(Object.entries(adapterUse).sort((a, b) => b[1] - a[1])),
    distinctAdapterComponents: Object.keys(adapterUse).length,
    libraryImports,
    localComponents,
  },
  gapsList: {
    registerFile: registerPath ? rel(registerPath) : null,
    registerRows,
    gapTagsInCode: gapTags,
  },
  states: { routes, stateComponentsUsed: stateComponents, storybookConfigured: storybookDir, stories, mockSignals },
};

const json = JSON.stringify(result, null, 2);
if (outFile) fs.writeFileSync(outFile, json);
else process.stdout.write(`${json}\n`);
