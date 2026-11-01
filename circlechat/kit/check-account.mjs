#!/usr/bin/env node
// The agent check's own CircleChat account (kit/agent-check.mjs signs in as this account). Makes
// the account when the account is missing, keeps the account a member of the agents' workspace,
// never an admin, and keeps the account locked except while a check runs. Safe to rerun.
//
//   CC_DIR=<stack folder> node kit/check-account.mjs [lock|unlock]
//
// Locked is the default, and the state after every step but unlock: the account's password is a
// hash of a random secret that nothing keeps, and every session of the account is ended, so the
// delivered password signs in nowhere. unlock sets the delivered password, for one check;
// check-agent.sh unlocks, runs the check, and locks again on every way out, a failure included.
//
// - The email is site.check_account in site.json, or agent-check@<site.public_host>
//   (kit/render.mjs checkAccountEmail).
// - The password is CC_CHECK_PASSWORD, from the stack's GitHub environment. The secrets helper
//   (deploy/apply-secrets.sh) writes the password to $CC_DIR/agent-check.env, mode 600, owned by
//   the stack's owner. No other file holds the password.
// - The step runs inside CircleChat's api container, which has CircleChat's database address and
//   CircleChat's own password hashing (bcryptjs). The email and the password reach the container
//   on stdin, never on a command line, and nothing prints the password.
//
// What the step does, in one transaction:
//   - The workspace: the one workspace that holds an agent, or the only workspace when no
//     workspace holds an agent yet. More than one, or none, stops the step with a message.
//   - The account: made when no account has the email, with the handle agent-check.
//   - The lock: unlock sets the delivered password. Any other mode sets a hash of a random secret
//     and ends the account's sessions, so the account is locked.
//   - The role: member in the workspace. Another role, admin included, is set back to member. The
//     account leaves every other workspace, so a sign-in always lands in the agents' workspace.
// Exit 0 when the account is ready, 1 with a message when the step cannot make the account or
// cannot lock the account.
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { checkAccountEmail } from "./render.mjs";

export const PASSWORD_FILE = "agent-check.env";
export const PASSWORD_KEY = "CC_CHECK_PASSWORD";
export const HANDLE = "agent-check";
export const NAME = "Agent check";
// CircleChat asks for 8 characters. The check's password is a generated one, so ask for more.
export const MIN_PASSWORD = 16;

export const MODES = ["lock", "unlock"];

// The password from $CC_DIR/agent-check.env. Throws a message that never holds the password.
export function readCheckPassword(ccDir) {
  const file = path.join(ccDir, PASSWORD_FILE);
  let text;
  try { text = fs.readFileSync(file, "utf8"); } catch {
    throw new Error(`no ${file}. Add ${PASSWORD_KEY} to the stack's GitHub environment, and run the "Deploy secrets" workflow (circlechat/README.md, "Checking an agent")`);
  }
  const line = text.split("\n").filter((l) => l.startsWith(`${PASSWORD_KEY}=`)).pop();
  const pw = line ? line.slice(PASSWORD_KEY.length + 1) : "";
  if (!pw) throw new Error(`${file} holds no ${PASSWORD_KEY}. Add the secret to the stack's GitHub environment, and run the "Deploy secrets" workflow`);
  if (pw.length < MIN_PASSWORD) throw new Error(`${PASSWORD_KEY} must have at least ${MIN_PASSWORD} characters. Generate a longer one in the password manager, and deploy the secrets again`);
  return pw;
}

// The account's rules, over a small store of CircleChat's tables. The api container runs this
// function as text (ACCOUNT_SCRIPT), so the function uses nothing from this module. The tests run
// the same function over a stand-in store.
//   db: workspaces() -> [{ id, agents }], userByEmail(email) -> { id, passwordHash } | null,
//       handleTaken(handle), createUser(u), setPassword(userId, hash), memberships(userId) ->
//       [{ workspaceId, role }], addMembership(wsId, userId), setMemberRole(wsId, userId),
//       removeMembership(wsId, userId), ensureMember(wsId, userId, memberId),
//       endSessions(userId) -> number ended
//   o:  { email, password (unlock only), unlock, handle, name, hash(pw), compare(pw, hash),
//         newId(prefix), secret() -> a random string nothing keeps }
export async function ensureAccount(db, o) {
  const all = await db.workspaces();
  const withAgents = all.filter((w) => Number(w.agents) > 0);
  const pick = withAgents.length ? withAgents : all;
  if (!pick.length) throw new Error("CircleChat has no workspace yet. Sign up in CircleChat and install an agent first, then run this step again");
  if (pick.length > 1) throw new Error(`CircleChat has ${pick.length} workspaces${withAgents.length ? " with agents" : ""}, and the check's account joins exactly one. Keep the stack's agents in one workspace`);
  const ws = pick[0].id;
  const changes = [];
  let user = await db.userByEmail(o.email);
  // Unlocked: the delivered password. Locked: a hash of a secret nothing keeps.
  const passwordHash = o.unlock ? await o.hash(o.password) : await o.hash(o.secret());
  if (!user) {
    if (await db.handleTaken(o.handle)) throw new Error(`another CircleChat account already has the handle ${o.handle}. Rename that account's handle, or set site.check_account to that account's email`);
    user = { id: o.newId("u"), email: o.email, name: o.name, handle: o.handle, passwordHash };
    await db.createUser(user);
    changes.push("made the account");
  } else if (!o.unlock || !(await o.compare(o.password, user.passwordHash))) {
    await db.setPassword(user.id, passwordHash);
  }
  if (o.unlock) {
    changes.push("unlocked the account for this check");
  } else {
    const ended = await db.endSessions(user.id);
    changes.push(`locked the account${ended ? `, and ended ${ended} session${ended === 1 ? "" : "s"}` : ""}`);
  }
  let joined = false;
  for (const m of await db.memberships(user.id)) {
    if (m.workspaceId !== ws) {
      await db.removeMembership(m.workspaceId, user.id);
      changes.push(`left another workspace, where the account was ${m.role}`);
    } else {
      joined = true;
      if (m.role !== "member") {
        await db.setMemberRole(ws, user.id);
        changes.push(`set the role from ${m.role} back to member`);
      }
    }
  }
  if (!joined) {
    await db.addMembership(ws, user.id);
    changes.push("joined the agents' workspace as a member");
  }
  await db.ensureMember(ws, user.id, o.newId("m"));
  return { workspaceId: ws, changes };
}

// The script CircleChat's api container runs with `node --input-type=module -e`. The container's
// own packages: postgres (the database driver), bcryptjs (CircleChat's password hashing) and nanoid
// (CircleChat's ids). The input on stdin is { email, password, handle, name }. The output is one
// line of JSON: { ok, changes, workspaceId } or { ok: false, error }. The error never holds the
// password.
export const ACCOUNT_SCRIPT = `
import postgres from "postgres";
import bcrypt from "bcryptjs";
import { customAlphabet } from "nanoid";
import { randomBytes } from "node:crypto";
const ensureAccount = ${ensureAccount.toString()};
let input = ""; for await (const c of process.stdin) input += c;
const o = JSON.parse(input);
const nid = customAlphabet("0123456789abcdefghijklmnopqrstuvwxyz", 20);
const sql = postgres(process.env.DATABASE_URL, { max: 1, onnotice: () => {} });
try {
  const r = await sql.begin(async (tx) => ensureAccount({
    workspaces: () => tx\`select w.id, (select count(*)::int from agents a where a.workspace_id = w.id) as agents from workspaces w\`,
    userByEmail: async (e) => (await tx\`select id, password_hash as "passwordHash" from users where lower(email) = \${e} limit 1\`)[0] ?? null,
    handleTaken: async (h) => (await tx\`select 1 from users where lower(handle) = lower(\${h}) limit 1\`).length > 0,
    createUser: (u) => tx\`insert into users (id, email, name, handle, password_hash) values (\${u.id}, \${u.email}, \${u.name}, \${u.handle}, \${u.passwordHash})\`,
    setPassword: (id, h) => tx\`update users set password_hash = \${h} where id = \${id}\`,
    memberships: (id) => tx\`select workspace_id as "workspaceId", role from workspace_members where user_id = \${id}\`,
    addMembership: (w, id) => tx\`insert into workspace_members (workspace_id, user_id, role) values (\${w}, \${id}, 'member')\`,
    setMemberRole: (w, id) => tx\`update workspace_members set role = 'member' where workspace_id = \${w} and user_id = \${id}\`,
    removeMembership: (w, id) => tx\`delete from workspace_members where workspace_id = \${w} and user_id = \${id}\`,
    ensureMember: (w, id, mid) => tx\`insert into members (id, workspace_id, kind, ref_id) values (\${mid}, \${w}, 'user', \${id}) on conflict do nothing\`,
    endSessions: async (id) => (await tx\`delete from sessions where user_id = \${id} returning id\`).length,
  }, { ...o, hash: (pw) => bcrypt.hash(pw, 10), compare: (pw, h) => bcrypt.compare(pw, h), newId: (p) => p + "_" + nid(), secret: () => randomBytes(32).toString("base64url") }));
  process.stdout.write(JSON.stringify({ ok: true, ...r }) + "\\n");
} catch (e) {
  const msg = String(e?.message ?? e);
  process.stdout.write(JSON.stringify({ ok: false, error: o.password ? msg.split(o.password).join("<password>") : msg }) + "\\n");
} finally {
  await sql.end({ timeout: 5 });
}
`;

// The stack's Docker context, from the rendered tenant.env, as apply-secrets.sh reads it.
function dockerContext(ccDir) {
  try { return /^DOCKER_CONTEXT=(.*)$/m.exec(fs.readFileSync(path.join(ccDir, "kit-out", "tenant.env"), "utf8"))?.[1] ?? ""; } catch { return ""; }
}

// Makes or updates the account, locked, or unlocked with mode "unlock". Returns { ok, lines } with
// lines to print; never the password. Locking needs no password, so a stack without the password
// file can still lock the account.
export function run({ ccDir, site, mode = "lock", env = process.env }) {
  if (!MODES.includes(mode)) return { ok: false, lines: [`The check's account: unknown mode ${mode}; use lock or unlock.`] };
  const unlock = mode === "unlock";
  const email = checkAccountEmail(site);
  if (!email) return { ok: false, lines: ["The check's account has no email: set site.public_host or site.check_account in site.json."] };
  let password = "";
  if (unlock) {
    try { password = readCheckPassword(ccDir); } catch (e) { return { ok: false, lines: [`The check's account: ${e.message}.`] }; }
  }
  const context = dockerContext(ccDir);
  const r = spawnSync("docker", ["compose", "exec", "-T", "api", "node", "--input-type=module", "-e", ACCOUNT_SCRIPT], {
    cwd: ccDir,
    env: { ...env, ...(context ? { DOCKER_CONTEXT: context } : {}) },
    input: JSON.stringify({ email, password, unlock, handle: HANDLE, name: NAME }),
    encoding: "utf8",
    timeout: 60_000,
  });
  let out = null;
  try { out = JSON.parse(String(r.stdout ?? "").trim().split("\n").pop()); } catch { out = null; }
  if (!out) return { ok: false, lines: [`The check's account: CircleChat's api container did not answer (docker compose exec api exited ${r.status ?? "on a signal"}). Start CircleChat with setup-host.sh, then run this step again.`] };
  if (!out.ok) return { ok: false, lines: [`The check's account ${email}: ${password ? String(out.error).split(password).join("<password>") : String(out.error)}.`] };
  const what = out.changes?.length ? out.changes.join(", ") : "nothing to change";
  return { ok: true, lines: [`The check's account ${email} is a member of the agents' workspace, never an admin: ${what}.`] };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const tenant = process.env.TENANT;
  const ccDir = process.env.CC_DIR || path.join(process.env.HOME ?? "", tenant ? `tenants/${tenant}/circlechat` : "circlechat");
  const sitePath = process.env.SITE || path.join(ccDir, "site.json");
  let site;
  try { site = JSON.parse(fs.readFileSync(sitePath, "utf8")); } catch { console.log(`No readable ${sitePath}.`); process.exit(1); }
  const r = run({ ccDir, site, mode: process.argv[2] ?? "lock" });
  for (const l of r.lines) console.log(l);
  process.exitCode = r.ok ? 0 : 1;
}
