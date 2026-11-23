// The steps of a stack's release upgrade that need root. kit/upgrade.mjs runs as the account that
// owns the stacks, and that account may have no password-free sudo. The root process that starts
// the upgrade takes each step that needs root: the hourly update job (updater.mjs), or the cluster
// agent's "Upgrade now" button (agent.mjs).
//
//   1. Before the upgrade, as root: the gateway's state folder, LiteLLM's master key, the key of the
//      RecursicaChat server's gateway listener and the secrets file of the cloud keys (prepareGateway). On a Mac, the owner owns each one, so the
//      Docker VM can mount the files.
//   2. The upgrade, as the owner: kit/upgrade.mjs with KIT_ROOT_STEPS=1. setup-host.sh --upgrade
//      then takes only the Docker steps.
//
// The secrets helper (deploy/apply-secrets.sh) takes the same steps for a secrets deploy. CircleChat
// 1.x's steps are gone: the router's database role, the cloud-request secrets, the skill sync and
// the key check of 1.x's database and agent homes.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { stackSlack } from "../kit/slack.mjs";
import { tenantOf, workspaceDir } from "../kit/stack-paths.mjs";
import { TAG, approvals } from "./release-gate.mjs";

// The owner can change the stack's folder. The state folder must be a real folder, and each file is
// written as a new file that replaces the old one, so root never writes through a link. On a Mac,
// the owner gets only the files root writes, never a whole folder.
//   ids: { uid, gid } of the owner, given on a Mac
export function prepareGateway({ ccDir, ids = null }) {
  const gw = path.join(ccDir, "gateway-state");
  if (fs.existsSync(gw) && fs.lstatSync(gw).isSymbolicLink()) throw new Error(`${gw} is a symlink. Replace the symlink with a folder.`);
  const keys = path.join(ccDir, "model-keys.env");
  if (fs.existsSync(keys) || isLink(keys)) {
    const st = fs.lstatSync(keys);
    if (st.isSymbolicLink() || st.nlink > 1) throw new Error(`${keys} is a symlink or has a second hard link. Replace the file with a plain file.`);
  }
  fs.mkdirSync(gw, { recursive: true, mode: 0o700 });
  fs.chmodSync(gw, 0o700);
  if (ids) fs.lchownSync(gw, ids.uid, ids.gid);
  const put = (name, text) => {
    const tmp = path.join(gw, `.new.${crypto.randomBytes(6).toString("hex")}`);
    fs.writeFileSync(tmp, text, { mode: 0o600, flag: "wx" });
    if (ids) fs.lchownSync(tmp, ids.uid, ids.gid);
    fs.renameSync(tmp, path.join(gw, name));
  };
  const read = (name) => {
    const f = path.join(gw, name);
    try { return fs.lstatSync(f).isFile() ? fs.readFileSync(f, "utf8").trim() : ""; } catch { return ""; }
  };
  if (!read("litellm-master.key")) put("litellm-master.key", `sk-${crypto.randomBytes(24).toString("hex")}\n`);
  // The key of the RecursicaChat 2.0 server's gateway listener (gateway/rc-tasks.mjs), as setup-host.sh makes it.
  if (!read("rc-tasks.key")) put("rc-tasks.key", `rct_${crypto.randomBytes(24).toString("hex")}\n`);
  if (!fs.existsSync(keys)) {
    fs.writeFileSync(keys, "", { mode: 0o600, flag: "wx" });
    if (ids) fs.lchownSync(keys, ids.uid, ids.gid);
  }
  // CircleChat 1.x's database role had a password. None is left to pass on.
  return "";
}

function isLink(f) { try { return fs.lstatSync(f).isSymbolicLink(); } catch { return false; } }

// The stack's tenant and workspace: ~/recursica-workspace, or the older ~/circlechat-workspace, for
// the cluster's own stack, and ~/tenants/<name>/workspace for a client or demo stack
// (kit/stack-paths.mjs).
export function stackPaths(ownerHome, ccDir) {
  const tenant = tenantOf(ownerHome, ccDir);
  return { tenant, ws: workspaceDir(ownerHome, tenant) };
}

// The steps after an upgrade that ran setup-host.sh. CircleChat 1.x's skill sync and key check were
// the only ones, so none is left. follow-main.mjs and runUpgrade still call it. Returns each
// problem, or [].
export function afterUpgrade() {
  return [];
}

// The owner's uid and gid, for a Mac.
export function ownerIds(owner, run = spawnSync) {
  const id = (flag) => Number(String(run("id", [flag, owner], { encoding: "utf8" }).stdout ?? "").trim());
  return { uid: id("-u"), gid: id("-g") };
}

// Steps 1 and 2 for one stack. Resolves when the upgrade and the steps after it end. The upgrade
// runs setup-host.sh --upgrade with KIT_HOLD_NETWORK=1, so it applies no network step, such as
// tailscale serve (network_held, kit/lib.sh). A network step waits for setup-host.sh run by hand.
//   ref: a release tag from the "Upgrade now" button, or empty for the hourly check
//   approved: the releases an approver approved (release-gate.mjs), passed in KIT_APPROVED
//   spawnFn and run: child_process.spawn and spawnSync, for the tests
export async function runUpgrade({ env, ccDir, ref = "", approved = Object.keys(approvals("/var/lib/agent-cluster")), mac = process.platform === "darwin", spawnFn = spawn, run = spawnSync, post = stackSlack(ccDir), now = Date.now }) {
  const say = (text) => post(text).catch(() => {});
  try {
    const ids = mac ? ownerIds(env.OWNER, run) : null;
    prepareGateway({ ccDir, ids });
  }
  catch (e) { await say(`:x: The upgrade job stopped before the upgrade: ${e.message}`); return { ran: false, problems: [e.message] }; }
  const { ws } = stackPaths(env.OWNER_HOME, ccDir);
  const stateFile = path.join(ccDir, "kit-out/upgrade-state.json");
  const started = now();
  const child = spawnFn("sudo", ["-u", env.OWNER, "-H", "env", "KIT_ROOT_STEPS=1", `KIT_APPROVED=${approved.filter((t) => TAG.test(t)).join(",")}`, "KIT_HOLD_NETWORK=1", `CC_DIR=${ccDir}`, `WS=${ws}`, `SITE=${path.join(ccDir, "site.json")}`,
    `COMPUTER=${env.COMPUTER}`, `PATH=${env.PATH}`, process.execPath, path.join(env.KIT, "circlechat/kit/upgrade.mjs"), ...(ref ? [ref] : [])],
    { stdio: ["pipe", "inherit", "inherit"] });
  child.stdin.end();
  await new Promise((resolve) => child.on("close", resolve));
  // kit/upgrade.mjs records each run of setup-host.sh in the stack's upgrade state.
  let ranAt = 0;
  try { ranAt = Number(JSON.parse(fs.readFileSync(stateFile, "utf8")).setupRanAt) || 0; } catch {}
  if (ranAt < started) return { ran: false, problems: [] };
  const problems = afterUpgrade();
  if (problems.length) await say(`:x: After the upgrade, ${problems.join(", and ")}. Run setup-host.sh once by hand to check the stack.`);
  return { ran: true, problems };
}
