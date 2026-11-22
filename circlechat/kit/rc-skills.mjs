// Least privilege for the skills of each Hermes agent on the RecursicaChat 2.0 server: Hermes seeds
// every agent's home with its bundled skills (apple, email, social media and dozens more), and each
// one sits in the agent's prompt. An agent keeps only the bundled skills its kit settings name, in
// "skills" in agents/<handle>/runtime/recursicachat.json; with none named, it keeps none. Hermes's
// own essential skill, hermes-agent, always stays, and so does every skill that isn't bundled, such
// as one the agent learned.
//
// Hermes records its bundled skills in skills/.bundled_manifest ("name:hash" lines), and its sync
// never adds again a bundled skill that was deleted (tools/skills_sync.py). So removing one stays
// removed. The removal changes files only: the agent's engine sees it at its next start.
//
//   node rc-skills.mjs plan <database> <site.json>   one line per Hermes agent in a Docker sandbox:
//                                                    handle, volume, its allowed bundled skills
//   node rc-skills.mjs remove <allowed,...>          stdin: the manifest, a line "---", then each
//                                                    SKILL.md path in the skills folder; prints the
//                                                    skill folders to remove, one a line
//
// rc-sync.sh runs both, as root, when the server is quiet (cluster/quiet.mjs).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const KIT_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
// Hermes never lets this one be disabled (agent/skill_utils.py ESSENTIAL_SKILLS).
export const ESSENTIAL = new Set(["hermes-agent"]);
const NAME = /^[a-z0-9][a-z0-9._-]{0,99}$/;

/** The Docker volume of an agent's Hermes home: the server names it after the agent's id (server/src/agents/runtime.ts). */
export const hermesVolume = (id) => `cc-${String(id).toLowerCase().replace(/[^a-z0-9]/g, "")}-hermes`;

/** The bundled skills an agent keeps, from its kit settings: none when "skills" is missing. */
export function allowedSkills(handle, kitRoot = KIT_ROOT) {
  const file = path.join(kitRoot, "agents", handle, "runtime", "recursicachat.json");
  if (!fs.existsSync(file)) return [];
  const skills = JSON.parse(fs.readFileSync(file, "utf8")).skills ?? [];
  if (!Array.isArray(skills) || !skills.every((s) => typeof s === "string" && NAME.test(s))) {
    throw new Error(`agents/${handle}/runtime/recursicachat.json: "skills" must be a list of skill names, such as ["github"]`);
  }
  return skills;
}

/** The names in a .bundled_manifest: "name:hash" lines, or plain names in Hermes's older form. */
export const manifestNames = (text) =>
  new Set(String(text).split("\n").map((l) => l.trim().split(":")[0]).filter((n) => NAME.test(n)));

/**
 * The skill folders to remove: each bundled skill that is neither allowed nor essential. A skill's
 * name is its folder's name, as Hermes seeds it. A path that isn't a plain relative path to a
 * SKILL.md inside the skills folder is never returned.
 */
export function toRemove(manifest, skillFiles, allowed) {
  const bundled = manifestNames(manifest);
  const keep = new Set([...allowed, ...ESSENTIAL]);
  const out = [];
  for (const raw of skillFiles) {
    const f = String(raw).trim().replace(/^\.\//, "");
    if (!/^([a-z0-9._-]+\/)+SKILL\.md$/i.test(f) || f.split("/").includes("..")) continue;
    const dir = path.posix.dirname(f);
    const name = path.posix.basename(dir);
    if (bundled.has(name) && !keep.has(name)) out.push(`./${dir}`);
  }
  return [...new Set(out)].sort();
}

/** Each Hermes agent in a Docker sandbox: its handle, its volume and its allowed bundled skills. */
export async function plan(dbFile, siteFile, kitRoot = KIT_ROOT) {
  const { DatabaseSync } = await import("node:sqlite");
  const db = new DatabaseSync(dbFile, { readOnly: true });
  try {
    const site = JSON.parse(fs.readFileSync(siteFile, "utf8"));
    const handles = Object.entries(site.agents ?? {}).filter(([, a]) => a?.recursicachat).map(([h]) => h);
    const rows = db.prepare("SELECT id, handle, engine, sandbox FROM agents WHERE archived = 0").all();
    return rows
      .filter((r) => handles.includes(r.handle) && r.engine === "hermes" && r.sandbox === "docker")
      .map((r) => ({ handle: r.handle, volume: hermesVolume(r.id), allowed: allowedSkills(r.handle, kitRoot) }));
  } finally {
    db.close();
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [cmd, a, b] = process.argv.slice(2);
  try {
    if (cmd === "plan" && a && b) {
      for (const p of await plan(a, b)) console.log(`${p.handle}\t${p.volume}\t${p.allowed.join(",")}`);
    } else if (cmd === "remove") {
      const input = fs.readFileSync(0, "utf8");
      const [manifest, list = ""] = input.split(/^---$/m);
      for (const d of toRemove(manifest, list.split("\n").filter(Boolean), (a ?? "").split(",").filter(Boolean))) console.log(d);
    } else {
      console.error("usage: rc-skills.mjs plan <database> <site.json> | remove <allowed,...>");
      process.exit(2);
    }
  } catch (e) {
    console.error(e.message);
    process.exit(1);
  }
}
