// The weekly container refresh for one stack. Runs as the account that owns the stacks.
//
//   node images.mjs            (with CC_DIR, and TENANT for a client stack)
//
// Each image tag the stack uses is pulled. A new version (a new digest) is used only after this
// job has seen it for 7 days; until then the stack keeps the version it runs. CircleChat's own
// images are rebuilt on fresh base images. Then the stack restarts and the health check runs:
// every container running, and CircleChat answering. On a failure, every container goes back to
// the version it ran before, and Slack gets a message.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { SOAK_MS } from "./updates.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);

const exec = promisify(execFile);
const run = async (cmd, args, opts = {}) => (await exec(cmd, args, { maxBuffer: 64 << 20, timeout: 60 * 60_000, ...opts })).stdout.trim();

// For each tag: keep the old digest unless the new one has been seen for 7 days.
export function chooseDigests(tags, seen, now = Date.now()) {
  return tags.map(({ tag, current, pulled }) => {
    if (!pulled || pulled === current) return { tag, use: current, changed: false };
    const first = seen[`${tag}@${pulled}`] ?? now;
    seen[`${tag}@${pulled}`] = first;
    return now - first >= SOAK_MS ? { tag, use: pulled, changed: true } : { tag, use: current, changed: false, waitsUntil: first + SOAK_MS };
  });
}

async function main() {
  const ccDir = process.env.CC_DIR;
  const tenantEnv = Object.fromEntries(fs.readFileSync(path.join(ccDir, "kit-out/tenant.env"), "utf8").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  const env = { ...process.env, ...(tenantEnv.DOCKER_CONTEXT ? { DOCKER_CONTEXT: tenantEnv.DOCKER_CONTEXT } : {}) };
  const dc = (args) => run("docker", ["compose", ...args], { cwd: ccDir, env });
  const stateFile = path.join(ccDir, "kit-out/images-seen.json");
  let seen = {}; try { seen = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const port = (fs.readFileSync(path.join(ccDir, "site.json"), "utf8").match(/"port"\s*:\s*(\d+)/) ?? [])[1] ?? "8080";

  // What runs now: container -> image ID, so a rollback can return to it.
  const before = {};
  for (const id of (await dc(["ps", "-q"])).split("\n").filter(Boolean)) {
    const [svc, image] = (await run("docker", ["inspect", "-f", '{{index .Config.Labels "com.docker.compose.service"}} {{.Image}}', id], { env })).split(" ");
    before[svc] = image;
  }
  const tags = JSON.parse(await dc(["config", "--format", "json"])).services;
  const pulledTags = [];
  for (const [svc, s] of Object.entries(tags)) {
    if (!s.image || s.build) continue;
    const current = await run("docker", ["image", "inspect", "-f", "{{.Id}}", s.image], { env }).catch(() => "");
    await run("docker", ["pull", "-q", s.image], { env }).catch(() => "");
    const pulled = await run("docker", ["image", "inspect", "-f", "{{.Id}}", s.image], { env }).catch(() => "");
    pulledTags.push({ svc, tag: s.image, current, pulled });
  }
  const choice = chooseDigests(pulledTags, seen);
  for (const c of choice) if (!c.changed && c.use) await run("docker", ["tag", c.use, c.tag], { env });   // keep the old version under the tag
  fs.writeFileSync(stateFile, JSON.stringify(seen));
  await dc(["build", "--pull"]);
  await dc(["up", "-d"]);

  const healthy = async () => {
    for (let i = 0; i < 18; i++) {
      await new Promise((r) => setTimeout(r, 10_000));
      const states = (await dc(["ps", "--format", "{{.State}}"])).split("\n").filter(Boolean);
      const ok = states.length > 0 && states.every((s) => s === "running");
      const web = await fetch(`http://127.0.0.1:${port}/`, { signal: AbortSignal.timeout(5000) }).then((r) => r.status < 500).catch(() => false);
      if (ok && web) return true;
    }
    return false;
  };
  // The images the kit starts directly (gateway, notifier, agent image), pinned in images.lock:
  // each pin moves to a newer version after the newer version has been out for 7 days.
  const lockFile = path.join(ccDir, "images.lock");
  let oldLock = null;
  if (fs.existsSync(lockFile)) {
    const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
    const pinned = [];
    for (const tag of Object.keys(lock)) {
      await run("docker", ["pull", "-q", tag], { env }).catch(() => "");
      const pulled = await run("docker", ["image", "inspect", "-f", "{{index .RepoDigests 0}}", tag], { env }).catch(() => "");
      pinned.push({ tag, current: lock[tag].ref, pulled });
    }
    const moves = chooseDigests(pinned, seen).filter((c) => c.changed);
    fs.writeFileSync(stateFile, JSON.stringify(seen));
    if (moves.length) {
      oldLock = lock;
      const next = structuredClone(lock);
      for (const m of moves) next[m.tag] = { ref: m.use, since: new Date().toISOString() };
      fs.writeFileSync(lockFile, JSON.stringify(next, null, 2) + "\n");
      await run("bash", [path.join(here, "../setup-host.sh"), "--upgrade"], { env: { ...env, CC_DIR: ccDir } });
    }
  }
  const changed = choice.filter((c) => c.changed).map((c) => c.tag);
  if (await healthy()) {
    console.log(`stack ${tenantEnv.TENANT || "border"}: images refreshed${changed.length ? ` (${changed.join(", ")})` : ""}, health check passed`);
    return;
  }
  // Roll back: tag each service's old image back, and recreate from it.
  for (const [svc, image] of Object.entries(before)) {
    const tag = tags[svc]?.image ?? `${tenantEnv.COMPOSE_PROJECT_NAME}-${svc}`;
    await run("docker", ["tag", image, tag], { env }).catch(() => {});
  }
  await dc(["up", "-d", "--no-build"]);
  if (oldLock) {
    fs.writeFileSync(lockFile, JSON.stringify(oldLock, null, 2) + "\n");
    await run("bash", [path.join(here, "../setup-host.sh"), "--upgrade"], { env: { ...env, CC_DIR: ccDir } }).catch(() => "");
  }
  const msg = `:x: Weekly image refresh of stack ${tenantEnv.TENANT || "border"} failed its health check. Every container is back on its previous version.`;
  console.error(msg);
  const slack = (fs.readFileSync(path.join(ccDir, ".env"), "utf8").match(/^SLACK_WEBHOOK_URL=(.+)$/m) ?? [])[1];
  if (slack) await fetch(slack, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ text: msg }) }).catch(() => {});
  process.exit(1);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
