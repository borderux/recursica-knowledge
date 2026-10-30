// The steps of a stack's release upgrade that need root. kit/upgrade.mjs runs as the account that
// owns the stacks, and that account may have no password-free sudo. The root process that starts
// the upgrade takes each step that needs root: the hourly update job (updater.mjs), or the cluster
// agent's "Upgrade now" button (agent.mjs).
//
//   1. Before the upgrade, as root: the gateway's state folder, LiteLLM's master key, and the
//      password and address of the router's database role (prepareGateway). On a Mac, the owner
//      owns each one, so the Docker VM can mount the files.
//   2. The upgrade, as the owner: kit/upgrade.mjs with KIT_ROOT_STEPS=1, and the database role's
//      password on stdin. setup-host.sh --upgrade then takes only the Docker steps.
//   3. After an upgrade that ran setup-host.sh: the agents' skills and personas, with sync-skills.sh
//      as the owner, never as root, because agents can change the workspace and their homes. Then
//      the key check as root (gateway/key-check.mjs). A failure goes to the stack's Slack channel.
//
// The secrets helper (deploy/apply-secrets.sh) takes the same steps for a secrets deploy.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawn, spawnSync } from "node:child_process";
import { stackSlack } from "../kit/slack.mjs";
import { TAG, approvals } from "./release-gate.mjs";

const PASSWORD = /^[0-9a-f]{48}$/;

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
  // A password the kit made is 48 hex digits. Anything else, such as a file the owner swapped in,
  // is replaced, so root never copies another file's text into the database address.
  let password = read("db-password");
  if (!PASSWORD.test(password)) { password = crypto.randomBytes(24).toString("hex"); put("db-password", `${password}\n`); }
  put("db.url", `postgres://cc_gateway_read:${password}@postgres:5432/circlechat\n`);
  if (!fs.existsSync(keys)) {
    fs.writeFileSync(keys, "", { mode: 0o600, flag: "wx" });
    if (ids) fs.lchownSync(keys, ids.uid, ids.gid);
  }
  return password;
}

function isLink(f) { try { return fs.lstatSync(f).isSymbolicLink(); } catch { return false; } }

// The stack's workspace: ~/circlechat-workspace for the cluster's own stack, and
// ~/tenants/<name>/workspace for a client or demo stack.
export function stackPaths(ownerHome, ccDir) {
  const tenant = path.dirname(path.dirname(ccDir)) === path.join(ownerHome, "tenants") ? path.basename(path.dirname(ccDir)) : "";
  return { tenant, ws: tenant ? path.join(path.dirname(ccDir), "workspace") : path.join(ownerHome, "circlechat-workspace") };
}

// Step 3: the agents' skills and personas as the owner, then the key check as root. Returns each
// problem, or [].
//   run(cmd, args, opts): spawnSync's result
export function afterUpgrade({ env, ccDir, run = spawnSync }) {
  const { tenant, ws } = stackPaths(env.OWNER_HOME, ccDir);
  const kit = path.join(env.KIT, "circlechat");
  const problems = [];
  const vars = { CC_DIR: ccDir, WS: ws, SITE: path.join(ccDir, "site.json"), OWNER: env.OWNER, OWNER_HOME: env.OWNER_HOME, ...(tenant ? { TENANT: tenant } : {}) };
  const sync = run("sudo", ["-u", env.OWNER, "-H", "env", ...Object.entries({ ...vars, PATH: env.PATH }).map(([k, v]) => `${k}=${v}`),
    "bash", path.join(kit, "sync-skills.sh")], { stdio: "inherit" });
  if (sync.status !== 0) problems.push("the agents' skills and personas did not sync");
  // The key check: the owner dumps CircleChat's database from Docker, and root reads the gateway's
  // secrets file and the agent homes.
  let dctx = "";
  try { dctx = (fs.readFileSync(path.join(ccDir, "kit-out/tenant.env"), "utf8").match(/^DOCKER_CONTEXT=(.*)$/m) ?? [])[1] ?? ""; } catch {}
  const dump = run("sudo", ["-u", env.OWNER, "-H", "env", ...(dctx ? [`DOCKER_CONTEXT=${dctx}`] : []), `PATH=${env.PATH}`,
    "bash", "-c", 'cd "$1" && docker compose exec -T postgres pg_dump -U postgres circlechat', "_", ccDir], { encoding: "utf8", maxBuffer: 1 << 30 });
  const check = run(process.execPath, [path.join(kit, "gateway/key-check.mjs"), "--secrets", path.join(ccDir, "model-keys.env"), "--stdin", "CircleChat's database", path.join(ccDir, "hermes-homes")],
    { input: dump.stdout ?? "", stdio: ["pipe", "inherit", "inherit"] });
  if (check.status !== 0) problems.push("the key check found a cloud key, or could not run");
  return problems;
}

// The owner's uid and gid, for a Mac.
function ownerIds(owner, run) {
  const id = (flag) => Number(String(run("id", [flag, owner], { encoding: "utf8" }).stdout ?? "").trim());
  return { uid: id("-u"), gid: id("-g") };
}

// Steps 1 to 3 for one stack. Resolves when the upgrade and the steps after it end.
//   ref: a release tag from the "Upgrade now" button, or empty for the hourly check
//   approved: the releases an approver approved (release-gate.mjs), passed in KIT_APPROVED
//   spawnFn and run: child_process.spawn and spawnSync, for the tests
export async function runUpgrade({ env, ccDir, ref = "", approved = Object.keys(approvals("/var/lib/agent-cluster")), mac = process.platform === "darwin", spawnFn = spawn, run = spawnSync, post = stackSlack(ccDir), now = Date.now }) {
  const say = (text) => post(text).catch(() => {});
  let password;
  try { password = prepareGateway({ ccDir, ids: mac ? ownerIds(env.OWNER, run) : null }); }
  catch (e) { await say(`:x: The upgrade job stopped before the upgrade: ${e.message}`); return { ran: false, problems: [e.message] }; }
  const { ws } = stackPaths(env.OWNER_HOME, ccDir);
  const stateFile = path.join(ccDir, "kit-out/upgrade-state.json");
  const started = now();
  const child = spawnFn("sudo", ["-u", env.OWNER, "-H", "env", "KIT_ROOT_STEPS=1", `KIT_APPROVED=${approved.filter((t) => TAG.test(t)).join(",")}`, `CC_DIR=${ccDir}`, `WS=${ws}`, `SITE=${path.join(ccDir, "site.json")}`,
    `COMPUTER=${env.COMPUTER}`, `PATH=${env.PATH}`, process.execPath, path.join(env.KIT, "circlechat/kit/upgrade.mjs"), ...(ref ? [ref] : [])],
    { stdio: ["pipe", "inherit", "inherit"] });
  child.stdin.end(`${password}\n`);
  await new Promise((resolve) => child.on("close", resolve));
  // kit/upgrade.mjs records each run of setup-host.sh in the stack's upgrade state.
  let ranAt = 0;
  try { ranAt = Number(JSON.parse(fs.readFileSync(stateFile, "utf8")).setupRanAt) || 0; } catch {}
  if (ranAt < started) return { ran: false, problems: [] };
  const problems = afterUpgrade({ env, ccDir, run });
  if (problems.length) await say(`:x: After the upgrade, ${problems.join(", and ")}. Run setup-host.sh once by hand to check the stack.`);
  return { ran: true, problems };
}
