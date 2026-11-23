// The weekly image refresh for one stack. Runs as the account that owns the stacks.
//
//   node images.mjs            (with CC_DIR, and TENANT for a client stack)
//
// The kit starts a few containers itself, each at the digest pinned in the stack's images.lock
// (pin_image, kit/lib.sh): LiteLLM, the router, the app preview, Kev's install and, with
// privacy.mask_pii, Presidio. Each pin of KIT_PINS moves to a newer version once this job has seen
// that version for 7 days. Then setup-host.sh --upgrade recreates the gateway on the new pins. When
// the --upgrade fails, every pin goes back, the failed versions are never used again, and Slack
// gets a message.
//
// images.lock can still hold the pins of CircleChat 1.x's images, such as caddy, postgres and the
// Hermes image. Those pins never move, and no image of CircleChat 1.x is pulled.
//
// A pin that moves recreates the gateway, which interrupts work. When the update job finds
// RecursicaChat 2.0 busy (SERVER_QUIET=no, cluster/quiet.mjs), each move waits: the pins stay,
// kit-out/images-waiting.json names the waiting images, and the job exits WAITING, so the update
// job tries again the next hour. Run by hand, with no SERVER_QUIET, the pins move as before.
//
// The job runs unattended, so its --upgrade runs with KIT_HOLD_NETWORK=1: each step that waits for
// a person (network_held, kit/lib.sh) is skipped.
import { execFile } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { promisify } from "node:util";
import { SOAK_MS } from "./updates.mjs";
import { stackSlack } from "../kit/slack.mjs";
import { stackName } from "../kit/render.mjs";

const here = path.dirname(new URL(import.meta.url).pathname);
export const WAITING = 75;
// The pin moves that wait for a quiet RecursicaChat: all of them when the update job found it busy.
export const waitingMoves = (moves, serverQuiet) => (serverQuiet === "no" ? moves : []);

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

// The images the kit starts, in setup-host.sh: LiteLLM, the router (node:22-alpine), the app
// preview and Kev's install (node:22), and Presidio's two services.
export const KIT_PINS = [
  "ghcr.io/berriai/litellm:main-stable", "node:22-alpine", "node:22",
  "mcr.microsoft.com/presidio-analyzer:latest", "mcr.microsoft.com/presidio-anonymizer:latest",
];
// The pins this job moves: the kit's own, in images.lock's order. Every other pin stays.
export const pinsToRefresh = (lock) => Object.keys(lock).filter((tag) => KIT_PINS.includes(tag));

async function main() {
  const ccDir = process.env.CC_DIR;
  const tenantEnv = Object.fromEntries(fs.readFileSync(path.join(ccDir, "kit-out/tenant.env"), "utf8").split("\n").filter(Boolean).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
  const env = { ...process.env, ...(tenantEnv.DOCKER_CONTEXT ? { DOCKER_CONTEXT: tenantEnv.DOCKER_CONTEXT } : {}) };
  const name = () => tenantEnv.STACK_NAME || stackName(JSON.parse(fs.readFileSync(path.join(ccDir, "site.json"), "utf8")));
  const upgrade = () => run("bash", [path.join(here, "../setup-host.sh"), "--upgrade"], { env: { ...env, CC_DIR: ccDir, KIT_HOLD_NETWORK: "1" } });
  const stateFile = path.join(ccDir, "kit-out/images-seen.json");
  let seen = {}; try { seen = JSON.parse(fs.readFileSync(stateFile, "utf8")); } catch {}
  const lockFile = path.join(ccDir, "images.lock");
  if (!fs.existsSync(lockFile)) { console.log(`stack ${name()}: no images.lock yet, so no pin moves`); return; }

  const lock = JSON.parse(fs.readFileSync(lockFile, "utf8"));
  const pinned = [];
  for (const tag of pinsToRefresh(lock)) {
    await run("docker", ["pull", "-q", tag], { env }).catch(() => "");
    const pulled = await run("docker", ["image", "inspect", "-f", "{{index .RepoDigests 0}}", tag], { env }).catch(() => "");
    pinned.push({ tag, current: lock[tag].ref, pulled });
  }
  let moves = chooseDigests(pinned, seen).filter((c) => c.changed);
  fs.writeFileSync(stateFile, JSON.stringify(seen));
  const waiting = waitingMoves(moves, process.env.SERVER_QUIET).map((m) => m.tag);
  if (waiting.length) {
    moves = [];
    fs.writeFileSync(path.join(ccDir, "kit-out/images-waiting.json"), JSON.stringify(waiting) + "\n");
    console.log(`${waiting.join(", ")}: the new pins wait for a quiet RecursicaChat (${process.env.SERVER_BUSY || "busy"})`);
  }
  if (moves.length) {
    const next = structuredClone(lock);
    for (const m of moves) next[m.tag] = { ref: m.use, since: new Date().toISOString() };
    fs.writeFileSync(lockFile, JSON.stringify(next, null, 2) + "\n");
    try {
      await upgrade();
    } catch (e) {
      // Roll back: each failed version is marked, so the job never moves to it again. A later
      // version gets its own 7 days.
      for (const m of moves) seen[`${m.tag}@${m.use}`] = Number.MAX_SAFE_INTEGER;
      fs.writeFileSync(stateFile, JSON.stringify(seen));
      fs.writeFileSync(lockFile, JSON.stringify(lock, null, 2) + "\n");
      await upgrade().catch(() => "");
      const msg = `:x: Weekly image refresh of stack ${name()}: setup-host.sh --upgrade failed on the new versions of ${moves.map((m) => m.tag).join(", ")}. Every pin is back on its previous version.`;
      console.error(`${msg}\n${e.message}`);
      await stackSlack(ccDir)(msg);
      process.exit(1);
    }
  }
  console.log(`stack ${name()}: ${moves.length ? `pins moved (${moves.map((m) => m.tag).join(", ")})` : "no pin moved"}`);
  if (waiting.length) process.exit(WAITING);
}

if (import.meta.url === `file://${process.argv[1]}`) main().catch((e) => { console.error(e); process.exit(1); });
